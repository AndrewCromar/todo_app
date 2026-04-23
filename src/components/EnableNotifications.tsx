"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return buffer;
}

type Status = "unknown" | "unsupported" | "prompt" | "granted" | "denied";

export function EnableNotifications() {
  const [status, setStatus] = useState<Status>("unknown");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }

      const perm = Notification.permission;
      if (perm === "denied") {
        setStatus("denied");
        return;
      }
      if (perm === "default") {
        setStatus("prompt");
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const storedEndpoint = (await db.meta.get("push_endpoint"))?.value;

      if (existing && storedEndpoint === existing.endpoint) {
        setStatus("granted");
      } else if (existing) {
        await postSubscription(existing);
        await db.meta.put({ key: "push_endpoint", value: existing.endpoint });
        setStatus("granted");
      } else {
        setStatus("prompt");
      }
    })().catch((e) => {
      console.warn("EnableNotifications init failed:", e);
      setStatus("prompt");
    });
  }, []);

  async function postSubscription(sub: PushSubscription) {
    const json = sub.toJSON();
    const res = await fetch("/api/push/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        user_agent: navigator.userAgent,
      }),
    });
    if (!res.ok) throw new Error(`subscribe ${res.status}`);
  }

  async function handleEnable() {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID public key missing");

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "prompt");
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
        });
      }

      await postSubscription(sub);
      await db.meta.put({ key: "push_endpoint", value: sub.endpoint });
      setStatus("granted");
    } catch (e) {
      console.warn("enable notifications failed:", e);
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setWorking(false);
    }
  }

  if (status === "unknown" || status === "unsupported" || status === "granted") {
    return null;
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Notifications blocked. Enable them in your browser settings to get
        reminders.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2">
      <span className="text-sm text-neutral-700 dark:text-neutral-300">
        Enable reminder notifications on this device?
      </span>
      <button
        type="button"
        onClick={handleEnable}
        disabled={working}
        className="rounded-md bg-black text-white px-3 py-1 text-sm disabled:opacity-50 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {working ? "…" : "Enable"}
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
