"use client";

import { useEffect, useRef, useState } from "react";
import { deleteTodo, toggleTodo, updateTodo } from "@/lib/todos";
import type { Todo } from "@/lib/db";

function toLocalInputValue(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDueShort(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function TodoItem({
  todo,
  expanded,
  onExpand,
  onCollapse,
}: {
  todo: Todo;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description);
  const [dueInput, setDueInput] = useState(toLocalInputValue(todo.due_at));
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!expanded) {
      setTitle(todo.title);
      setDescription(todo.description);
      setDueInput(toLocalInputValue(todo.due_at));
    }
  }, [expanded, todo.title, todo.description, todo.due_at]);

  useEffect(() => {
    if (expanded) titleRef.current?.focus();
  }, [expanded]);

  async function commitTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== todo.title) {
      await updateTodo(todo.id, { title: trimmed });
    } else if (!trimmed) {
      setTitle(todo.title);
    }
  }

  async function commitDescription() {
    if (description !== todo.description) {
      await updateTodo(todo.id, { description });
    }
  }

  async function commitDue(value: string) {
    setDueInput(value);
    const newDue = value ? new Date(value).getTime() : null;
    if (newDue !== todo.due_at) {
      await updateTodo(todo.id, { due_at: newDue });
    }
  }

  const overdue =
    todo.due_at !== null && !todo.completed && todo.due_at < Date.now();

  return (
    <li
      className={`rounded-lg border transition-colors ${
        expanded
          ? "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
          : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900"
      }`}
    >
      <div className="flex items-center gap-3 py-2 px-3">
        <label className="relative flex-shrink-0 cursor-pointer inline-flex">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
            onClick={(e) => e.stopPropagation()}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="h-4 w-4 rounded-sm border border-neutral-400 dark:border-neutral-500 bg-white dark:bg-neutral-950 flex items-center justify-center peer-checked:bg-black peer-checked:border-black dark:peer-checked:bg-white dark:peer-checked:border-white peer-checked:[&>svg]:opacity-100 transition-colors"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 text-white dark:text-black opacity-0 transition-opacity"
            >
              <polyline points="3 8 7 12 13 4" />
            </svg>
          </span>
        </label>

        {expanded ? (
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
                onCollapse();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setTitle(todo.title);
                onCollapse();
              }
            }}
            className="flex-1 bg-transparent outline-none border-b border-neutral-400 text-base"
          />
        ) : (
          <button
            type="button"
            onClick={onExpand}
            className={`flex-1 min-w-0 text-left text-sm cursor-text truncate ${
              todo.completed
                ? "line-through text-neutral-400 dark:text-neutral-500"
                : "text-neutral-900 dark:text-neutral-100"
            }`}
          >
            {todo.title}
          </button>
        )}

        {!expanded && todo.due_at !== null && (
          <span
            className={`text-xs flex-shrink-0 ${
              overdue
                ? "text-red-600 dark:text-red-400"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {formatDueShort(todo.due_at)}
          </span>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 px-3 pb-3 pl-10">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={commitDescription}
              placeholder="Add details…"
              rows={2}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500 resize-y"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Due
            </span>
            <input
              type="datetime-local"
              value={dueInput}
              onChange={(e) => commitDue(e.target.value)}
              className="w-full max-w-full min-w-0 box-border rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500"
            />
          </label>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => deleteTodo(todo.id)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={async () => {
                await commitTitle();
                await commitDescription();
                onCollapse();
              }}
              className="text-sm rounded-md bg-black text-white px-3 py-1 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
