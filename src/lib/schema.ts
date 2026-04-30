import {
  pgTable,
  uuid,
  integer,
  text,
  boolean,
  timestamp,
  index,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: integer("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    completed: boolean("completed").notNull().default(false),
    due_at: timestamp("due_at", { withTimezone: true }),
    due_has_time: boolean("due_has_time").notNull().default(true),
    notified_at: timestamp("notified_at", { withTimezone: true }),
    recurrence_rule: text("recurrence_rule"),
    recurrence_series_id: uuid("recurrence_series_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("todos_user_idx").on(t.user_id)],
);

export type ServerTodo = typeof todos.$inferSelect;
export type NewServerTodo = typeof todos.$inferInsert;

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: integer("user_id").notNull(),
    name: text("name").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tags_user_idx").on(t.user_id),
    unique("tags_user_name_unique").on(t.user_id, t.name),
  ],
);

export const todoTags = pgTable(
  "todo_tags",
  {
    todo_id: uuid("todo_id").notNull(),
    tag_id: uuid("tag_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.todo_id, t.tag_id] }),
    index("todo_tags_tag_idx").on(t.tag_id),
  ],
);

export const userPrefs = pgTable("user_prefs", {
  user_id: integer("user_id").primaryKey(),
  sort_mode: text("sort_mode").notNull().default("created"),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: integer("user_id").notNull(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    user_agent: text("user_agent"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    last_seen_at: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.user_id)],
);
