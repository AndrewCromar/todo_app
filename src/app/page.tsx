import { AddTodo } from "@/components/AddTodo";
import { TodoList } from "@/components/TodoList";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center p-4 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-semibold pt-4">Todos</h1>
        <AddTodo />
        <TodoList />
      </div>
    </main>
  );
}
