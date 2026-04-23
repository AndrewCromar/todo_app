"use client";

import { useMemo, useState, type FormEvent } from "react";
import * as chrono from "chrono-node";
import { createTodo } from "@/lib/todos";

type Parse = {
  date: Date;
  strippedTitle: string;
};

function parseDate(raw: string): Parse | null {
  if (!raw.trim()) return null;
  const results = chrono.parse(raw, new Date(), { forwardDate: true });
  if (results.length === 0) return null;
  const r = results[0];
  const start = r.index;
  const end = r.index + r.text.length;
  let stripped = (raw.slice(0, start) + raw.slice(end))
    .replace(/\s{2,}/g, " ")
    .trim();
  stripped = stripped.replace(/\b(due|on|at|by)\s*$/i, "").trim();
  if (!stripped) return null;
  return { date: r.start.date(), strippedTitle: stripped };
}

function formatShort(d: Date): string {
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

export function AddTodo() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueInput, setDueInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ignoreParse, setIgnoreParse] = useState(false);

  const parse = useMemo(
    () => (ignoreParse ? null : parseDate(title)),
    [title, ignoreParse],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const manualDue = dueInput ? new Date(dueInput).getTime() : null;
    const useParse = parse && manualDue === null;
    const finalTitle = (useParse ? parse!.strippedTitle : title).trim();
    const finalDue = useParse ? parse!.date.getTime() : manualDue;
    if (!finalTitle) return;

    setSubmitting(true);
    try {
      await createTodo(finalTitle, {
        description: description.trim(),
        due_at: finalDue,
      });
      setTitle("");
      setDescription("");
      setDueInput("");
      setIgnoreParse(false);
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  }

  function collapseIfEmpty() {
    if (!title.trim() && !description.trim() && !dueInput) {
      setExpanded(false);
    }
  }

  const showParseChip = parse !== null && dueInput === "";

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-lg border transition-colors ${
        expanded
          ? "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-2"
          : "border-transparent"
      }`}
    >
      <div className="flex gap-2 w-full">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setIgnoreParse(false);
          }}
          onFocus={() => setExpanded(true)}
          onBlur={collapseIfEmpty}
          placeholder="What needs doing?"
          className="flex-1 min-w-0 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-base outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={!title.trim() || submitting}
          className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-40 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          Add
        </button>
      </div>

      {showParseChip && parse && (
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5">
            → <span className="font-medium">{parse.strippedTitle}</span> · due{" "}
            {formatShort(parse.date)}
          </span>
          <button
            type="button"
            onClick={() => setIgnoreParse(true)}
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
            aria-label="Don't parse date from title"
          >
            ✕
          </button>
        </div>
      )}

      {expanded && (
        <div className="flex flex-col gap-3 mt-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={collapseIfEmpty}
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
              onChange={(e) => setDueInput(e.target.value)}
              onBlur={collapseIfEmpty}
              className="w-full max-w-full min-w-0 box-border rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500"
            />
          </label>
        </div>
      )}
    </form>
  );
}
