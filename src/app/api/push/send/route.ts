import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

type SendBody = {
  subscription: WebPushSubscription;
  title?: string;
  body?: string;
  url?: string;
};

export async function POST(request: Request) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return Response.json(
      { error: "VAPID env vars missing on server" },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  let payload: SendBody;
  try {
    payload = (await request.json()) as SendBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload?.subscription?.endpoint) {
    return Response.json({ error: "Missing subscription" }, { status: 400 });
  }

  const notification = JSON.stringify({
    title: payload.title ?? "Todo Reminder",
    body: payload.body ?? "Hello from your todo app",
    url: payload.url ?? "/",
  });

  try {
    const result = await webpush.sendNotification(payload.subscription, notification);
    return Response.json({ ok: true, statusCode: result.statusCode });
  } catch (err) {
    const e = err as { statusCode?: number; body?: string; message?: string };
    return Response.json(
      { error: e.message ?? "sendNotification failed", statusCode: e.statusCode, body: e.body },
      { status: 502 }
    );
  }
}
