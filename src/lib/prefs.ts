import { db } from "./db";
import type { SortMode } from "@/components/TodoArea";

const VALID: readonly SortMode[] = ["created", "due", "alpha"];
const DEFAULT_SORT: SortMode = "created";

function coerce(value: unknown): SortMode {
  return typeof value === "string" && (VALID as readonly string[]).includes(value)
    ? (value as SortMode)
    : DEFAULT_SORT;
}

export async function getSortMode(): Promise<SortMode> {
  const row = await db.meta.get("sort_mode");
  return coerce(row?.value);
}

export async function setSortMode(mode: SortMode): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.meta, async () => {
    await db.meta.put({ key: "sort_mode", value: mode });
    await db.meta.put({ key: "sort_mode_updated_at", value: now });
  });
}

export async function getLocalPrefsState(): Promise<{
  sort_mode: SortMode;
  updated_at: number;
  synced_at: number;
}> {
  const [mode, updated, synced] = await Promise.all([
    db.meta.get("sort_mode"),
    db.meta.get("sort_mode_updated_at"),
    db.meta.get("sort_mode_synced_at"),
  ]);
  return {
    sort_mode: coerce(mode?.value),
    updated_at: typeof updated?.value === "number" ? updated.value : 0,
    synced_at: typeof synced?.value === "number" ? synced.value : 0,
  };
}

export async function applyRemotePrefs(remote: {
  sort_mode: SortMode;
  updated_at: number;
}): Promise<void> {
  await db.transaction("rw", db.meta, async () => {
    await db.meta.put({ key: "sort_mode", value: remote.sort_mode });
    await db.meta.put({
      key: "sort_mode_updated_at",
      value: remote.updated_at,
    });
    await db.meta.put({
      key: "sort_mode_synced_at",
      value: remote.updated_at,
    });
  });
}

export async function markPrefsSynced(updated_at: number): Promise<void> {
  await db.meta.put({ key: "sort_mode_synced_at", value: updated_at });
}
