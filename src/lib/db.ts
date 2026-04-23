import Dexie, { type EntityTable } from "dexie";

export type SyncStatus = "synced" | "pending" | "deleting";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  due_at: number | null;
  created_at: number;
  updated_at: number;
  sync_status: SyncStatus;
};

export type Meta = {
  key: string;
  value: string | number | null;
};

type TodoDB = Dexie & {
  todos: EntityTable<Todo, "id">;
  meta: EntityTable<Meta, "key">;
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

export { db };
