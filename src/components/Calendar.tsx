"use client";

import { useMemo, useState } from "react";
import type { Todo } from "@/lib/db";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Cell = { date: Date; inMonth: boolean };

function buildGrid(year: number, month: number): Cell[] {
  const first = startOfMonth(year, month);
  const firstWeekday = first.getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);

  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  // Trim trailing all-out-of-month week if present (5-row months).
  const lastWeekStart = cells.length - 7;
  if (cells.slice(lastWeekStart).every((c) => !c.inMonth)) {
    cells.length = lastWeekStart;
  }
  return cells;
}

export function Calendar({
  todos,
  onOpenTodo,
  onCreateAt,
}: {
  todos: Todo[];
  onOpenTodo: (id: string) => void;
  onCreateAt: (dueAt: number) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const today = useMemo(() => startOfDay(new Date()), []);
  const cells = useMemo(
    () => buildGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const todosByDay = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      if (t.due_at === null) continue;
      const d = new Date(t.due_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.due_at ?? 0) - (b.due_at ?? 0);
      });
    }
    return map;
  }, [todos]);

  function dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function jumpToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }

  function handleCellClick(date: Date) {
    const dueAt = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    ).getTime();
    onCreateAt(dueAt);
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  return (
    <div className="flex flex-col gap-2 min-w-0 w-full">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2 className="text-base font-medium truncate min-w-0">{monthLabel}</h2>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={jumpToday}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px text-xs text-neutral-500 dark:text-neutral-400">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800 rounded-md overflow-hidden">
        {cells.map((cell) => {
          const list = todosByDay.get(dayKey(cell.date)) ?? [];
          const isToday = sameDay(cell.date, today);
          return (
            <div
              key={cell.date.toISOString()}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[data-todo]")) return;
                handleCellClick(cell.date);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCellClick(cell.date);
                }
              }}
              className={`min-h-[5rem] p-1 flex flex-col gap-0.5 cursor-pointer ${
                cell.inMonth
                  ? "bg-white dark:bg-neutral-950"
                  : "bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600"
              } hover:bg-neutral-100 dark:hover:bg-neutral-900`}
            >
              <div className="flex items-center justify-end">
                <span
                  className={`text-xs ${
                    isToday
                      ? "inline-flex items-center justify-center h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black"
                      : ""
                  }`}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <ul className="flex flex-col gap-0.5 min-w-0">
                {list.slice(0, 3).map((t) => (
                  <li
                    key={t.id}
                    data-todo
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTodo(t.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenTodo(t.id);
                      }
                    }}
                    title={t.title}
                    className={`truncate text-[11px] leading-tight px-1 py-0.5 rounded ${
                      t.completed
                        ? "line-through text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-900"
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {t.title}
                  </li>
                ))}
                {list.length > 3 && (
                  <li className="text-[10px] text-neutral-500 dark:text-neutral-400 px-1">
                    +{list.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
