import * as chrono from "chrono-node";

export type Parse = {
  date: Date;
  hasTime: boolean;
  strippedTitle: string;
};

export function parseDate(raw: string): Parse | null {
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

  const hasTime = r.start.isCertain("hour");
  let date = r.start.date();
  if (!hasTime) {
    date = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );
  }
  return { date, hasTime, strippedTitle: stripped };
}

export function formatShort(d: Date, hasTime = true): string {
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
