"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { deleteTodo, renameTodo, toggleTodo } from "@/lib/todos";
import type { Todo } from "@/lib/db";

export function TodoItem({ todo }: { todo: Todo }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(todo.title);
  }, [todo.title, editing]);

  async function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== todo.title) {
      await renameTodo(todo.id, trimmed);
    } else {
      setDraft(todo.title);
    }
    setEditing(false);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(todo.title);
      setEditing(false);
    }
  }

  return (
    <li className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 group">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleTodo(todo.id)}
        className="h-4 w-4 cursor-pointer accent-black dark:accent-white"
      />

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKey}
          className="flex-1 bg-transparent outline-none border-b border-neutral-400 text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`flex-1 text-left text-sm cursor-text ${
            todo.completed
              ? "line-through text-neutral-400 dark:text-neutral-500"
              : "text-neutral-900 dark:text-neutral-100"
          }`}
        >
          {todo.title}
        </button>
      )}

      <button
        type="button"
        onClick={() => deleteTodo(todo.id)}
        aria-label="Delete todo"
        className="text-neutral-400 hover:text-red-600 text-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </li>
  );
}
