import { SyncRunner } from "@/components/SyncRunner";
import { TodoArea } from "@/components/TodoArea";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 sm:px-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] font-[family-name:var(--font-geist-sans)]">
      <SyncRunner />
      <div className="w-full max-w-md flex flex-col">
        <TodoArea />
      </div>
    </main>
  );
}
