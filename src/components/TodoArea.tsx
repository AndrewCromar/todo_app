"use client";

import { useState } from "react";
import { AddTodo } from "./AddTodo";
import { EnableNotifications } from "./EnableNotifications";
import { TodoList } from "./TodoList";
import { sync } from "@/lib/sync";

export type SortMode = "created" | "due" | "alpha";

const SORT_LABELS: Record<SortMode, string> = {
  created: "Created",
  due: "Due date",
  alpha: "A–Z",
};

export function TodoArea() {
  const [sort, setSort] = useState<SortMode>("created");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await sync();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-[var(--background)] flex flex-col gap-3 pt-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-semibold">Todos</h1>
        <EnableNotifications />

        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="font-sans rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500"
            >
              {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {SORT_LABELS[mode]}
                </option>
              ))}
            </select>
          </label>

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

        <AddTodo />
      </div>

      <div className="pt-3">
        <TodoList
          sort={sort}
          expandedId={expandedId}
          onExpand={setExpandedId}
          onCollapse={() => setExpandedId(null)}
        />
      </div>
    </>
  );
}
