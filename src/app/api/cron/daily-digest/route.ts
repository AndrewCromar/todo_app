import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import webpush, { type PushSubscription } from "web-push";
import { getDb } from "@/lib/db-server";
import { pushSubscriptions, todos } from "@/lib/schema";

const WINDOW_MS = 24 * 60 * 60 * 1000;

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

type Todo = typeof todos.$inferSelect;
type Buckets = { today: Todo[]; overdue: Todo[] };

function buildBody(today: number, overdue: number, sampleTitles: string[]) {
  const parts: string[] = [];
  if (today > 0) parts.push(`${today} due today`);
  if (overdue > 0) parts.push(`${overdue} overdue`);
  const head = parts.join(" · ");
  if (sampleTitles.length === 0) return head;
  return `${head}: ${sampleTitles.join(" · ")}`;
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
  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_MS);

  const rows = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.completed, false),
        isNotNull(todos.due_at),
        lt(todos.due_at, windowEnd),
      ),
    );

  const byUser = new Map<number, Buckets>();
  for (const t of rows) {
    if (!t.due_at) continue;
    const bucket = byUser.get(t.user_id) ?? { today: [], overdue: [] };
    if (t.due_at.getTime() < now.getTime()) bucket.overdue.push(t);
    else bucket.today.push(t);
    byUser.set(t.user_id, bucket);
  }

  if (byUser.size === 0) {
    return Response.json({ ok: true, users: 0, sent: 0, cleanup: 0 });
  }

  const userIds = [...byUser.keys()];
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

  for (const [userId, buckets] of byUser) {
    const { today, overdue } = buckets;
    if (today.length === 0 && overdue.length === 0) continue;

    today.sort((a, b) => (a.due_at!.getTime() - b.due_at!.getTime()));
    overdue.sort((a, b) => (b.due_at!.getTime() - a.due_at!.getTime()));

    const sampleTitles = [...today, ...overdue]
      .slice(0, 2)
      .map((t) => t.title);
    const body = buildBody(today.length, overdue.length, sampleTitles);

    const payload = JSON.stringify({
      title: "Tasks · today",
      body,
      url: "/",
    });

    const userSubs = subsByUser.get(userId) ?? [];
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
          console.warn("digest push failed", err);
        }
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, staleEndpoints));
  }

  return Response.json({
    ok: true,
    users: byUser.size,
    sent,
    cleanup: staleEndpoints.length,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
