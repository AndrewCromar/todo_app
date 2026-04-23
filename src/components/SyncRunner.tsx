"use client";

import { useEffect } from "react";
import { sync } from "@/lib/sync";

const INTERVAL_MS = 30_000;

export function SyncRunner() {
  useEffect(() => {
    sync();

    const interval = setInterval(() => {
      sync();
    }, INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
