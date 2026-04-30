import Dexie, { type EntityTable, type Table } from "dexie";

export type SyncStatus = "synced" | "pending" | "deleting";

export type Todo = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  due_at: number | null;
  due_has_time: boolean;
  recurrence_rule: string | null;
  recurrence_series_id: string | null;
  created_at: number;
  updated_at: number;
  sync_status: SyncStatus;
};

export type Meta = {
  key: string;
  value: string | number | null;
};

export type Tag = {
  id: string;
  name: string;
  created_at: number;
  sync_status: SyncStatus;
};

export type TodoTag = {
  todo_id: string;
  tag_id: string;
  sync_status: SyncStatus;
};

type TodoDB = Dexie & {
  todos: EntityTable<Todo, "id">;
  meta: EntityTable<Meta, "key">;
  tags: EntityTable<Tag, "id">;
  todo_tags: Table<TodoTag, [string, string]>;
};

const db = new Dexie("todo_app") as TodoDB;

db.version(1).stores({
  todos: "id, completed, due_at, created_at, updated_at",
});

db.version(2)
  .stores({
    todos: "id, completed, due_at, created_at, updated_at, sync_status",
    meta: "key",
  })
  .upgrade((tx) => {
    return tx
      .table("todos")
      .toCollection()
      .modify((todo: Partial<Todo>) => {
        if (todo.sync_status === undefined) todo.sync_status = "synced";
      });
  });

db.version(3)
  .stores({
    todos: "id, completed, due_at, created_at, updated_at, sync_status",
    meta: "key",
  })
  .upgrade((tx) => {
    return tx
      .table("todos")
      .toCollection()
      .modify((todo: Partial<Todo>) => {
        if (todo.description === undefined) todo.description = "";
      });
  });

db.version(4)
  .stores({
    todos: "id, completed, due_at, created_at, updated_at, sync_status",
    meta: "key",
  })
  .upgrade((tx) => {
    return tx
      .table("todos")
      .toCollection()
      .modify((todo: Partial<Todo>) => {
        if (todo.recurrence_rule === undefined) todo.recurrence_rule = null;
        if (todo.recurrence_series_id === undefined)
          todo.recurrence_series_id = null;
      });
  });

db.version(5).stores({
  todos: "id, completed, due_at, created_at, updated_at, sync_status",
  meta: "key",
  tags: "id, name, sync_status",
  todo_tags: "[todo_id+tag_id], todo_id, tag_id, sync_status",
});

db.version(6)
  .stores({
    todos: "id, completed, due_at, created_at, updated_at, sync_status",
    meta: "key",
    tags: "id, name, sync_status",
    todo_tags: "[todo_id+tag_id], todo_id, tag_id, sync_status",
  })
  .upgrade((tx) => {
    return tx
      .table("todos")
      .toCollection()
      .modify((todo: Partial<Todo>) => {
        if (todo.due_has_time === undefined) todo.due_has_time = true;
      });
  });

export { db };
