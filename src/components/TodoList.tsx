"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Todo, type TodoTag } from "@/lib/db";
import { buildLinksByTodo, matchesTagFilter } from "@/lib/tags";
import { clearCompletedTodos } from "@/lib/todos";
import { Calendar } from "./Calendar";
import { TodoItem } from "./TodoItem";
import type { SortMode } from "./TodoArea";

const COMPLETED_PAGE_SIZE = 10;

function sortActive(todos: Todo[], mode: SortMode): Todo[] {
  const copy = [...todos];
  switch (mode) {
    case "due":
    case "due_grouped":
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

const NO_DUE_KEY = "no-due";

function localDayKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function labelForDay(key: string): string {
  if (key === NO_DUE_KEY) return "No due date";
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / 86400000,
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays >= -6 && diffDays <= 6) {
    return target.toLocaleDateString(undefined, { weekday: "long" });
  }
  const sameYear = target.getFullYear() === today.getFullYear();
  return target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

type DayGroup = { key: string; label: string; todos: Todo[] };

function groupByDay(todos: Todo[]): DayGroup[] {
  const buckets = new Map<string, Todo[]>();
  for (const t of todos) {
    const key = t.due_at === null ? NO_DUE_KEY : localDayKey(t.due_at);
    const list = buckets.get(key);
    if (list) list.push(t);
    else buckets.set(key, [t]);
  }
  const nullTodos = buckets.get(NO_DUE_KEY);
  buckets.delete(NO_DUE_KEY);
  const dayKeys = [...buckets.keys()].sort();
  const groups: DayGroup[] = dayKeys.map((key) => ({
    key,
    label: labelForDay(key),
    todos: buckets.get(key) ?? [],
  }));
  if (nullTodos && nullTodos.length > 0) {
    groups.push({ key: NO_DUE_KEY, label: "No due date", todos: nullTodos });
  }
  return groups;
}

export function TodoList({
  sort,
  activeTagIds,
  onOpenTodo,
  onCreateAt,
}: {
  sort: SortMode;
  activeTagIds: Set<string>;
  onOpenTodo: (id: string) => void;
  onCreateAt: (dueAt: number) => void;
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

  const todoTagsLinks = useLiveQuery(
    () => db.todo_tags.toArray(),
    [],
    [] as TodoTag[],
  );

  if (todos === undefined) {
    return (
      <p className="text-sm text-neutral-400 text-center py-8">Loading…</p>
    );
  }

  const linksByTodo = buildLinksByTodo(todoTagsLinks);
  const activeTagIdsArr = Array.from(activeTagIds);
  const filterByTag = (t: Todo) =>
    matchesTagFilter(linksByTodo, t.id, activeTagIdsArr);

  if (sort === "calendar") {
    return (
      <Calendar
        todos={todos.filter(filterByTag)}
        onOpenTodo={onOpenTodo}
        onCreateAt={onCreateAt}
      />
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
    todos.filter((t) => !t.completed && filterByTag(t)),
    sort,
  );
  const completed = sortCompleted(
    todos.filter((t) => t.completed && filterByTag(t)),
  );
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
    <div className="flex flex-col gap-4 min-w-0 w-full">
      {active.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-4">
          Nothing to do. {completed.length > 0 && `${completed.length} done.`}
        </p>
      ) : sort === "due_grouped" ? (
        <div className="flex flex-col gap-4 min-w-0 w-full">
          {groupByDay(active).map((group) => (
            <section
              key={group.key}
              className="flex flex-col gap-1 min-w-0 w-full"
            >
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 px-3">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-1 min-w-0 w-full">
                {group.todos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onOpen={() => onOpenTodo(todo.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-1 min-w-0 w-full">
          {active.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onOpen={() => onOpenTodo(todo.id)}
            />
          ))}
        </ul>
      )}

      {completed.length > 0 && (
        <div className="flex flex-col gap-1 min-w-0 w-full">
          <div className="flex items-center justify-between min-w-0">
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
              <ul className="flex flex-col gap-1 min-w-0 w-full">
                {completedShown.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onOpen={() => onOpenTodo(todo.id)}
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
