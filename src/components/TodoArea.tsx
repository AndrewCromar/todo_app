"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { EnableNotifications } from "./EnableNotifications";
import { TagFilter } from "./TagFilter";
import { TagManager } from "./TagManager";
import { ThemeToggle } from "./ThemeToggle";
import { TodoList } from "./TodoList";
import { TodoModal } from "./TodoModal";
import { db } from "@/lib/db";
import { setSortMode } from "@/lib/prefs";
import { sync } from "@/lib/sync";

export type SortMode =
  | "created"
  | "due"
  | "due_grouped"
  | "alpha"
  | "calendar";

const SORT_LABELS: Record<SortMode, string> = {
  created: "Created",
  due: "Due date",
  due_grouped: "Due by day",
  alpha: "A–Z",
  calendar: "Calendar",
};

const VALID_SORTS: readonly SortMode[] = [
  "created",
  "due",
  "due_grouped",
  "alpha",
  "calendar",
];

type ModalState =
  | { kind: "none" }
  | { kind: "create"; dueAt?: number }
  | { kind: "edit"; todoId: string };

export function TodoArea() {
  const sort = useLiveQuery(
    async () => {
      const row = await db.meta.get("sort_mode");
      return typeof row?.value === "string" &&
        (VALID_SORTS as readonly string[]).includes(row.value)
        ? (row.value as SortMode)
        : "created";
    },
    [],
    "created" as SortMode,
  );

  const [modalState, setModalState] = useState<ModalState>({ kind: "none" });
  const [refreshing, setRefreshing] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(
    () => new Set(),
  );

  const editingTodo = useLiveQuery(
    async () =>
      modalState.kind === "edit"
        ? ((await db.todos.get(modalState.todoId)) ?? null)
        : null,
    [modalState.kind === "edit" ? modalState.todoId : null],
    null,
  );

  function toggleTag(id: string) {
    setActiveTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSortChange(mode: SortMode) {
    await setSortMode(mode);
    void sync();
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await sync();
    } finally {
      setRefreshing(false);
    }
  }

  function closeModal() {
    setModalState({ kind: "none" });
  }

  return (
    <>
      <div className="sticky top-0 z-30 bg-background border-b border-neutral-200 dark:border-neutral-800 pt-[env(safe-area-inset-top)] w-full">
        <div className="w-full max-w-md sm:max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-8 flex flex-col gap-3 pt-4 pb-3 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <h1 className="text-2xl font-semibold truncate min-w-0">Tasks</h1>
            <button
              type="button"
              onClick={() => setModalState({ kind: "create" })}
              className="flex-shrink-0 rounded-md bg-black text-white px-3 py-1 text-sm hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              + New
            </button>
          </div>

          <EnableNotifications />

          <div className="flex items-center justify-between gap-2 min-w-0">
            <label className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 min-w-0">
              <span>Sort</span>
              <select
                value={sort}
                onChange={(e) =>
                  handleSortChange(e.target.value as SortMode)
                }
                className="font-sans rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500 min-w-0"
              >
                {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {SORT_LABELS[mode]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setTagManagerOpen(true)}
                aria-label="Manage tags"
                className="rounded-md border border-neutral-300 dark:border-neutral-700 p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Refresh"
                className="rounded-md border border-neutral-300 dark:border-neutral-700 p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                >
                  <path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" />
                  <path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" />
                  <polyline points="21 3 21 8 16 8" />
                  <polyline points="3 21 3 16 8 16" />
                </svg>
              </button>
            </div>
          </div>

          <TagFilter
            activeTagIds={activeTagIds}
            onToggle={toggleTag}
            onClear={() => setActiveTagIds(new Set())}
          />
        </div>
      </div>

      <div className="w-full max-w-md sm:max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-8 pt-3 min-w-0">
        <TodoList
          sort={sort}
          activeTagIds={activeTagIds}
          onOpenTodo={(id) => setModalState({ kind: "edit", todoId: id })}
          onCreateAt={(dueAt) => setModalState({ kind: "create", dueAt })}
        />
      </div>

      {modalState.kind === "create" && (
        <TodoModal
          mode="create"
          open
          onClose={closeModal}
          initialDueAt={modalState.dueAt}
        />
      )}
      {modalState.kind === "edit" && editingTodo && (
        <TodoModal
          mode="edit"
          todo={editingTodo}
          open
          onClose={closeModal}
        />
      )}

      <TagManager
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
      />
    </>
  );
}
