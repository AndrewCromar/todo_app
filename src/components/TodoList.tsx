"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { TodoItem } from "./TodoItem";

export function TodoList() {
  const todos = useLiveQuery(() =>
    db.todos.orderBy("created_at").reverse().toArray()
  );

  if (todos === undefined) {
    return (
      <p className="text-sm text-neutral-400 text-center py-8">Loading…</p>
    );
  }

  if (todos.length === 0) {
    return (
      <p className="text-sm text-neutral-400 text-center py-8">
        No todos yet. Add one above.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
