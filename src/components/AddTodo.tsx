"use client";

import { useState, type FormEvent } from "react";
import { createTodo } from "@/lib/todos";

export function AddTodo() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueInput, setDueInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const due_at = dueInput ? new Date(dueInput).getTime() : null;
      await createTodo(trimmed, {
        description: description.trim(),
        due_at,
      });
      setTitle("");
      setDescription("");
      setDueInput("");
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
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={collapseIfEmpty}
          placeholder="What needs doing?"
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-base outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={!title.trim() || submitting}
          className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-40 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          Add
        </button>
      </div>

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
