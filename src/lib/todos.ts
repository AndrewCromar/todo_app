import { db, type Todo } from "./db";

export async function createTodo(
  title: string,
  extra: { description?: string; due_at?: number | null } = {},
): Promise<Todo> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title cannot be empty");

  const now = Date.now();
  const todo: Todo = {
    id: crypto.randomUUID(),
    title: trimmed,
    description: extra.description?.trim() ?? "",
    completed: false,
    due_at: extra.due_at ?? null,
    created_at: now,
    updated_at: now,
    sync_status: "pending",
  };
  await db.todos.add(todo);
  return todo;
}

export async function toggleTodo(id: string): Promise<void> {
  const existing = await db.todos.get(id);
  if (!existing) return;
  await db.todos.update(id, {
    completed: !existing.completed,
    updated_at: Date.now(),
    sync_status: "pending",
  });
}

export type TodoPatch = {
  title?: string;
  description?: string;
  due_at?: number | null;
};

export async function updateTodo(id: string, patch: TodoPatch): Promise<void> {
  const update: Partial<Todo> = {
    updated_at: Date.now(),
    sync_status: "pending",
  };
  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    if (!trimmed) return;
    update.title = trimmed;
  }
  if (patch.description !== undefined) {
    update.description = patch.description;
  }
  if (patch.due_at !== undefined) {
    update.due_at = patch.due_at;
  }
  await db.todos.update(id, update);
}

export async function renameTodo(id: string, title: string): Promise<void> {
  await updateTodo(id, { title });
}

export async function deleteTodo(id: string): Promise<void> {
  await db.todos.update(id, {
    sync_status: "deleting",
    updated_at: Date.now(),
  });
}

export async function clearCompletedTodos(): Promise<number> {
  const now = Date.now();
  const completed = await db.todos
    .filter((t) => t.completed && t.sync_status !== "deleting")
    .toArray();
  if (completed.length === 0) return 0;
  await db.transaction("rw", db.todos, async () => {
    for (const t of completed) {
      await db.todos.update(t.id, {
        sync_status: "deleting",
        updated_at: now,
      });
    }
  });
  return completed.length;
}
