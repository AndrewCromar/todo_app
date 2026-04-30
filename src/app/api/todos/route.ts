import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db-server";
import { todos } from "@/lib/schema";

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const db = getDb();
  const rows = await db.select().from(todos).where(eq(todos.user_id, user.id));
  return Response.json({ todos: rows });
}

type UpsertBody = {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  due_at?: string | null;
  due_has_time?: boolean;
  recurrence_rule?: string | null;
  recurrence_series_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body?.id || typeof body.title !== "string") {
    return Response.json({ error: "id and title required" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db
    .select({ user_id: todos.user_id, due_at: todos.due_at })
    .from(todos)
    .where(eq(todos.id, body.id))
    .limit(1);
  if (existing.length > 0 && existing[0].user_id !== user.id) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const newDue = body.due_at ? new Date(body.due_at) : null;
  const existingDue = existing[0]?.due_at ?? null;
  const dueChanged =
    (newDue?.getTime() ?? null) !== (existingDue?.getTime() ?? null);

  const values = {
    id: body.id,
    user_id: user.id,
    title: body.title,
    description: typeof body.description === "string" ? body.description : "",
    completed: !!body.completed,
    due_at: newDue,
    due_has_time:
      typeof body.due_has_time === "boolean" ? body.due_has_time : true,
    recurrence_rule:
      typeof body.recurrence_rule === "string" ? body.recurrence_rule : null,
    recurrence_series_id:
      typeof body.recurrence_series_id === "string"
        ? body.recurrence_series_id
        : null,
    created_at: body.created_at ? new Date(body.created_at) : now,
    updated_at: body.updated_at ? new Date(body.updated_at) : now,
  };

  const [saved] = await db
    .insert(todos)
    .values(values)
    .onConflictDoUpdate({
      target: todos.id,
      set: {
        title: values.title,
        description: values.description,
        completed: values.completed,
        due_at: values.due_at,
        due_has_time: values.due_has_time,
        recurrence_rule: values.recurrence_rule,
        recurrence_series_id: values.recurrence_series_id,
        updated_at: values.updated_at,
        ...(dueChanged ? { notified_at: null } : {}),
      },
      setWhere: and(eq(todos.id, body.id), eq(todos.user_id, user.id)),
    })
    .returning();

  return Response.json({ todo: saved });
}
