import { db, type Todo } from "./db";
import {
  applyRemotePrefs,
  getLocalPrefsState,
  markPrefsSynced,
} from "./prefs";
import type { SortMode } from "@/components/TodoArea";

type ServerTodo = {
  id: string;
  user_id: number;
  title: string;
  description: string | null;
  completed: boolean;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

function serverToLocal(s: ServerTodo): Todo {
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? "",
    completed: s.completed,
    due_at: s.due_at ? new Date(s.due_at).getTime() : null,
    created_at: new Date(s.created_at).getTime(),
    updated_at: new Date(s.updated_at).getTime(),
    sync_status: "synced",
  };
}

function localToUpsertBody(t: Todo) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    completed: t.completed,
    due_at: t.due_at ? new Date(t.due_at).toISOString() : null,
    created_at: new Date(t.created_at).toISOString(),
    updated_at: new Date(t.updated_at).toISOString(),
  };
}

async function apiList(): Promise<ServerTodo[]> {
  const res = await fetch("/api/todos", { cache: "no-store" });
  if (!res.ok) throw new Error(`list ${res.status}`);
  const data = (await res.json()) as { todos: ServerTodo[] };
  return data.todos;
}

async function apiUpsert(todo: Todo): Promise<ServerTodo> {
  const res = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(localToUpsertBody(todo)),
  });
  if (!res.ok) throw new Error(`upsert ${res.status}`);
  const data = (await res.json()) as { todo: ServerTodo };
  return data.todo;
}

async function apiDelete(id: string): Promise<void> {
  const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`delete ${res.status}`);
}

async function pushDirty(): Promise<void> {
  const pending = await db.todos.where("sync_status").equals("pending").toArray();
  for (const t of pending) {
    try {
      const saved = await apiUpsert(t);
      await db.todos.put(serverToLocal(saved));
    } catch (err) {
      console.warn(`sync push failed for ${t.id}:`, err);
    }
  }

  const deleting = await db.todos.where("sync_status").equals("deleting").toArray();
  for (const t of deleting) {
    try {
      await apiDelete(t.id);
      await db.todos.delete(t.id);
    } catch (err) {
      console.warn(`sync delete failed for ${t.id}:`, err);
    }
  }
}

async function pullAll(): Promise<void> {
  const remote = (await apiList()).map(serverToLocal);
  const local = await db.todos.toArray();
  const localById = new Map(local.map((t) => [t.id, t]));
  const remoteIds = new Set(remote.map((r) => r.id));

  await db.transaction("rw", db.todos, async () => {
    for (const r of remote) {
      const l = localById.get(r.id);
      if (!l) {
        await db.todos.put(r);
      } else if (l.sync_status === "synced" || r.updated_at > l.updated_at) {
        await db.todos.put(r);
      }
    }

    for (const l of local) {
      if (l.sync_status === "synced" && !remoteIds.has(l.id)) {
        await db.todos.delete(l.id);
      }
    }
  });
}

async function syncPrefs(): Promise<void> {
  const local = await getLocalPrefsState();

  try {
    const res = await fetch("/api/prefs", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      prefs: { sort_mode: string; updated_at: string } | null;
    };

    if (data.prefs) {
      const remoteTs = new Date(data.prefs.updated_at).getTime();
      if (remoteTs > local.updated_at) {
        await applyRemotePrefs({
          sort_mode: data.prefs.sort_mode as SortMode,
          updated_at: remoteTs,
        });
        return;
      }
    }

    if (local.updated_at > local.synced_at) {
      const postRes = await fetch("/api/prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sort_mode: local.sort_mode,
          updated_at: new Date(local.updated_at).toISOString(),
        }),
      });
      if (postRes.ok) await markPrefsSynced(local.updated_at);
    }
  } catch (err) {
    console.warn("prefs sync failed:", err);
  }
}

let syncing = false;

export async function sync(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      authenticated: boolean;
      user?: { id: number; email: string };
    };
    if (!data.authenticated || !data.user) return;

    const stored = await db.meta.get("user_id");
    if (stored?.value !== data.user.id) {
      await db.todos.clear();
      await Promise.all([
        db.meta.delete("sort_mode"),
        db.meta.delete("sort_mode_updated_at"),
        db.meta.delete("sort_mode_synced_at"),
      ]);
      await db.meta.put({ key: "user_id", value: data.user.id });
    }

    await pushDirty();
    await pullAll();
    await syncPrefs();
  } finally {
    syncing = false;
  }
}
