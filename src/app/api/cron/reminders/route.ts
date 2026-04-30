import { and, eq, inArray, isNull, isNotNull, lte, sql } from "drizzle-orm";
import webpush, { type PushSubscription } from "web-push";
import { getDb } from "@/lib/db-server";
import { pushSubscriptions, todos } from "@/lib/schema";

const LOOKAHEAD_MS = 15 * 60 * 1000;

function authed(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const custom = request.headers.get("x-cron-secret");
  if (custom === secret) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

async function run(request: Request): Promise<Response> {
  if (!authed(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return Response.json(
      { error: "VAPID env vars missing on server" },
      { status: 500 },
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const db = getDb();
  const cutoff = new Date(Date.now() + LOOKAHEAD_MS);

  const pending = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.completed, false),
        eq(todos.due_has_time, true),
        isNotNull(todos.due_at),
        isNull(todos.notified_at),
        lte(todos.due_at, cutoff),
      ),
    );

  if (pending.length === 0) {
    return Response.json({ ok: true, sent: 0, cleanup: 0, pending: 0 });
  }

  const userIds = Array.from(new Set(pending.map((t) => t.user_id)));
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.user_id, userIds));

  const subsByUser = new Map<number, typeof subs>();
  for (const s of subs) {
    const list = subsByUser.get(s.user_id);
    if (list) list.push(s);
    else subsByUser.set(s.user_id, [s]);
  }

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const todo of pending) {
    const userSubs = subsByUser.get(todo.user_id) ?? [];
    const dueDate = todo.due_at ? new Date(todo.due_at) : null;
    const payload = JSON.stringify({
      title: todo.title,
      body: dueDate
        ? `Due ${dueDate.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}`
        : "Reminder",
      url: "/",
      todoId: todo.id,
    });

    for (const sub of userSubs) {
      const subscription: PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
      } catch (err) {
        const e = err as { statusCode?: number };
        if (e.statusCode === 404 || e.statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.warn("push send failed", err);
        }
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, staleEndpoints));
  }

  const ids = pending.map((t) => t.id);
  await db
    .update(todos)
    .set({ notified_at: sql`now()` })
    .where(inArray(todos.id, ids));

  return Response.json({
    ok: true,
    sent,
    cleanup: staleEndpoints.length,
    pending: pending.length,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
