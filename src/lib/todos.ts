import { db, type Todo } from "./db";

export async function createTodo(title: string): Promise<Todo> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title cannot be empty");

  const now = Date.now();
  const todo: Todo = {
    id: crypto.randomUUID(),
    title: trimmed,
    completed: false,
    due_at: null,
    created_at: now,
    updated_at: now,
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
  });
}

export async function renameTodo(id: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  await db.todos.update(id, {
    title: trimmed,
    updated_at: Date.now(),
  });
}

export async function deleteTodo(id: string): Promise<void> {
  await db.todos.delete(id);
}
