import Dexie, { type EntityTable } from "dexie";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  due_at: number | null;
  created_at: number;
  updated_at: number;
};

type TodoDB = Dexie & {
  todos: EntityTable<Todo, "id">;
};

const db = new Dexie("todo_app") as TodoDB;

db.version(1).stores({
  todos: "id, completed, due_at, created_at, updated_at",
});

export { db };
