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

type PatchBody = {
  title?: string;
  description?: string;
  completed?: boolean;
  due_at?: string | null;
  due_has_time?: boolean;
  updated_at?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await context.params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db
    .select({ user_id: todos.user_id, due_at: todos.due_at })
    .from(todos)
    .where(eq(todos.id, id))
    .limit(1);
  if (existing.length === 0)
    return Response.json({ error: "not found" }, { status: 404 });
  if (existing[0].user_id !== user.id)
    return Response.json({ error: "forbidden" }, { status: 403 });

  const set: Record<string, unknown> = {
    updated_at: body.updated_at ? new Date(body.updated_at) : new Date(),
  };
  if (typeof body.title === "string") set.title = body.title;
  if (typeof body.description === "string") set.description = body.description;
  if (typeof body.completed === "boolean") set.completed = body.completed;
  if (body.due_at !== undefined) {
    const newDue = body.due_at ? new Date(body.due_at) : null;
    set.due_at = newDue;
    const existingDue = existing[0].due_at ?? null;
    if ((newDue?.getTime() ?? null) !== (existingDue?.getTime() ?? null)) {
      set.notified_at = null;
    }
  }
  if (typeof body.due_has_time === "boolean") {
    set.due_has_time = body.due_has_time;
  }

  const [saved] = await db
    .update(todos)
    .set(set)
    .where(and(eq(todos.id, id), eq(todos.user_id, user.id)))
    .returning();

  return Response.json({ todo: saved });
}
