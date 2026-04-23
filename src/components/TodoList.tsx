"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Todo } from "@/lib/db";
import { clearCompletedTodos } from "@/lib/todos";
import { TodoItem } from "./TodoItem";
import type { SortMode } from "./TodoArea";

const COMPLETED_PAGE_SIZE = 10;

function sortActive(todos: Todo[], mode: SortMode): Todo[] {
  const copy = [...todos];
  switch (mode) {
    case "due":
      copy.sort((a, b) => {
        if (a.due_at === null && b.due_at === null)
          return b.created_at - a.created_at;
        if (a.due_at === null) return 1;
        if (b.due_at === null) return -1;
        if (a.due_at !== b.due_at) return a.due_at - b.due_at;
        return b.created_at - a.created_at;
      });
      break;
    case "alpha":
      copy.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
      break;
    case "created":
    default:
      copy.sort((a, b) => b.created_at - a.created_at);
  }
  return copy;
}

function sortCompleted(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => b.updated_at - a.updated_at);
}

export function TodoList({
  sort,
  expandedId,
  onExpand,
  onCollapse,
}: {
  sort: SortMode;
  expandedId: string | null;
  onExpand: (id: string) => void;
  onCollapse: () => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedVisible, setCompletedVisible] = useState(COMPLETED_PAGE_SIZE);
  const [clearing, setClearing] = useState(false);

  const todos = useLiveQuery(
    () =>
      db.todos
        .toArray()
        .then((all) => all.filter((t) => t.sync_status !== "deleting")),
    [],
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

  const active = sortActive(
    todos.filter((t) => !t.completed),
    sort,
  );
  const completed = sortCompleted(todos.filter((t) => t.completed));
  const completedShown = completed.slice(0, completedVisible);
  const hasMore = completed.length > completedVisible;

  async function handleClear() {
    if (clearing) return;
    const ok = window.confirm(
      `Clear all ${completed.length} completed todo${completed.length === 1 ? "" : "s"}?`,
    );
    if (!ok) return;
    setClearing(true);
    try {
      await clearCompletedTodos();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {active.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              expanded={expandedId === todo.id}
              onExpand={() => onExpand(todo.id)}
              onCollapse={onCollapse}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-400 text-center py-4">
          Nothing to do. {completed.length > 0 && `${completed.length} done.`}
        </p>
      )}

      {completed.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-3 w-3 transition-transform ${showCompleted ? "rotate-90" : ""}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Completed ({completed.length})
            </button>
            {showCompleted && (
              <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                className="text-xs text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 disabled:opacity-50"
              >
                {clearing ? "Clearing…" : "Clear"}
              </button>
            )}
          </div>
          {showCompleted && (
            <>
              <ul className="flex flex-col gap-1">
                {completedShown.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    expanded={expandedId === todo.id}
                    onExpand={() => onExpand(todo.id)}
                    onCollapse={onCollapse}
                  />
                ))}
              </ul>
              {hasMore && (
                <button
                  type="button"
                  onClick={() =>
                    setCompletedVisible((v) => v + COMPLETED_PAGE_SIZE)
                  }
                  className="self-center text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mt-1"
                >
                  Load {Math.min(COMPLETED_PAGE_SIZE, completed.length - completedVisible)} more
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
