"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Tag } from "@/lib/db";

export function TagFilter({
  activeTagIds,
  onToggle,
  onClear,
}: {
  activeTagIds: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const tags = useLiveQuery(
    async () => {
      const all = await db.tags.toArray();
      return all
        .filter((t) => t.sync_status !== "deleting")
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
    },
    [],
    [] as Tag[],
  );

  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto flex-nowrap w-full min-w-0 pb-1">
      <button
        type="button"
        onClick={onClear}
        className={`flex-shrink-0 rounded-full text-xs px-2 py-0.5 border ${
          activeTagIds.size === 0
            ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
            : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
        }`}
      >
        All
      </button>
      {tags.map((tag) => {
        const active = activeTagIds.has(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={`flex-shrink-0 rounded-full text-xs px-2 py-0.5 border ${
              active
                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <span className="truncate max-w-[10rem] inline-block align-middle">
              {tag.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
