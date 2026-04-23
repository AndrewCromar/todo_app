"use client";

import { useState, type FormEvent } from "react";
import { createTodo } from "@/lib/todos";

export function AddTodo() {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await createTodo(trimmed);
      setTitle("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing?"
        autoFocus
        className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:focus:border-neutral-400"
      />
      <button
        type="submit"
        disabled={!title.trim() || submitting}
        className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-40 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Add
      </button>
    </form>
  );
}
