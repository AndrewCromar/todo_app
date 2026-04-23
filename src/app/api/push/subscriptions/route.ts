import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db-server";
import { pushSubscriptions } from "@/lib/schema";

type SubscribeBody = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  user_agent?: string;
};

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return Response.json(
      { error: "endpoint and keys required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const now = new Date();
  const [saved] = await db
    .insert(pushSubscriptions)
    .values({
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: body.user_agent ?? null,
      created_at: now,
      last_seen_at: now,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        user_id: user.id,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_agent: body.user_agent ?? null,
        last_seen_at: now,
      },
    })
    .returning();

  return Response.json({ subscription: saved });
}

export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) {
    return Response.json({ error: "endpoint required" }, { status: 400 });
  }

  const db = getDb();
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.user_id, user.id),
      ),
    );

  return Response.json({ ok: true });
}
