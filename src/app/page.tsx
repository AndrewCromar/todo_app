"use client";

import { useEffect, useState } from "react";

type Status = {
  message: string;
  tone: "idle" | "info" | "ok" | "err";
};

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function Home() {
  const [status, setStatus] = useState<Status>({ message: "Ready", tone: "idle" });
  const [subscribed, setSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [swReady, setSwReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (!("serviceWorker" in navigator)) {
      setStatus({ message: "Service workers not supported in this browser", tone: "err" });
      return;
    }

    (async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
        const reg = await navigator.serviceWorker.ready;
        setSwReady(true);
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setSubscription(existing);
          setSubscribed(true);
          setStatus({ message: "Already subscribed to push", tone: "ok" });
        } else {
          setStatus({ message: "Service worker registered. Not subscribed yet.", tone: "info" });
        }
      } catch (err) {
        setStatus({
          message: `SW registration failed: ${(err as Error).message}`,
          tone: "err",
        });
      }
    })();
  }, []);

  async function enableNotifications() {
    setStatus({ message: "Requesting permission…", tone: "info" });
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus({ message: `Permission ${perm}`, tone: "err" });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        setStatus({ message: "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set", tone: "err" });
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      setSubscription(sub);
      setSubscribed(true);
      setStatus({ message: "Subscribed to push", tone: "ok" });
    } catch (err) {
      setStatus({ message: `Subscribe failed: ${(err as Error).message}`, tone: "err" });
    }
  }

  async function sendTest() {
    if (!subscription) {
      setStatus({ message: "No subscription — enable notifications first", tone: "err" });
      return;
    }
    setStatus({ message: "Sending test push…", tone: "info" });
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          title: "Todo Reminder",
          body: `Test push at ${new Date().toLocaleTimeString()}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ message: `Sent. Server replied ${data.statusCode}.`, tone: "ok" });
      } else {
        setStatus({
          message: `Server error ${res.status}: ${JSON.stringify(data)}`,
          tone: "err",
        });
      }
    } catch (err) {
      setStatus({ message: `Send failed: ${(err as Error).message}`, tone: "err" });
    }
  }

  const toneClass = {
    idle: "text-neutral-500",
    info: "text-blue-600",
    ok: "text-green-600",
    err: "text-red-600",
  }[status.tone];

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-2xl font-semibold">PWA Push Spike</h1>

      <div className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <span>Service worker: {swReady ? "registered" : "pending"}</span>
        <span>Subscribed: {subscribed ? "yes" : "no"}</span>
        <span>Installed (standalone): {isStandalone ? "yes" : "no"}</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={enableNotifications}
          disabled={!swReady || subscribed}
          className="rounded-full border px-4 py-2 text-sm disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          Enable notifications
        </button>
        <button
          onClick={sendTest}
          disabled={!subscribed}
          className="rounded-full bg-black text-white px-4 py-2 text-sm disabled:opacity-50 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          Send test push
        </button>
      </div>

      <p className={`text-sm ${toneClass}`}>{status.message}</p>

      <p className="text-xs text-neutral-500 max-w-md text-center leading-relaxed">
        On iPhone, push only works after &ldquo;Add to Home Screen&rdquo; and opening the app from
        the home screen icon (iOS 16.4+).
      </p>
    </main>
  );
}
