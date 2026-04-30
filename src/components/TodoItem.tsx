"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { toggleTodo } from "@/lib/todos";
import { parseRule, summarizeRule } from "@/lib/recurrence";
import { getTagsForTodo } from "@/lib/tags";
import { linkify } from "@/lib/text";
import type { Tag, Todo } from "@/lib/db";

function formatDueShort(ms: number, hasTime: boolean): string {
  const d = new Date(ms);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function TodoItem({
  todo,
  onOpen,
}: {
  todo: Todo;
  onOpen: () => void;
}) {
  const rule = parseRule(todo.recurrence_rule);
  const tags = useLiveQuery(
    () => getTagsForTodo(todo.id),
    [todo.id],
    [] as Tag[],
  );

  const overdue =
    todo.due_at !== null && !todo.completed && todo.due_at < Date.now();

  return (
    <li className="rounded-lg border border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors min-w-0 w-full overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="flex items-center gap-3 py-2 px-3 min-w-0 w-full cursor-pointer"
      >
        <label
          className="relative flex-shrink-0 cursor-pointer inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
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

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <span
            className={`block truncate text-sm ${
              todo.completed
                ? "line-through text-neutral-400 dark:text-neutral-500"
                : "text-neutral-900 dark:text-neutral-100"
            }`}
          >
            {todo.title}
          </span>
          {todo.description && (
            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
              {linkify(todo.description)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {tags.length > 0 && (
            <span
              aria-label={`Tagged: ${tags.map((t) => t.name).join(", ")}`}
              title={tags.map((t) => t.name).join(", ")}
              className="h-1.5 w-1.5 rounded-full bg-neutral-500 dark:bg-neutral-400"
            />
          )}
          {rule && (
            <span
              aria-label="Repeats"
              title={summarizeRule(rule)}
              className="text-neutral-500 dark:text-neutral-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
            </span>
          )}
          {todo.due_at !== null && (
            <span
              className={`text-xs whitespace-nowrap ${
                overdue
                  ? "text-red-600 dark:text-red-400"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {formatDueShort(todo.due_at, todo.due_has_time)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
