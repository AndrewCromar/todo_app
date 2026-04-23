import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db-server";
import { todos } from "@/lib/schema";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await context.params;
  const db = getDb();
  await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.user_id, user.id)));

  return Response.json({ ok: true });
}
