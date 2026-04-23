import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db-server";
import { userPrefs } from "@/lib/schema";

const VALID_SORT = new Set(["created", "due", "alpha"]);

export async function GET() {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  const db = getDb();
  const [row] = await db
    .select()
    .from(userPrefs)
    .where(eq(userPrefs.user_id, user.id))
    .limit(1);

  if (!row) {
    return Response.json({ prefs: null });
  }

  return Response.json({
    prefs: {
      sort_mode: row.sort_mode,
      updated_at: row.updated_at,
    },
  });
}

type UpsertBody = {
  sort_mode?: string;
  updated_at?: string;
};

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body?.sort_mode || !VALID_SORT.has(body.sort_mode)) {
    return Response.json(
      { error: "sort_mode must be created|due|alpha" },
      { status: 400 },
    );
  }

  const db = getDb();
  const now = body.updated_at ? new Date(body.updated_at) : new Date();

  const [saved] = await db
    .insert(userPrefs)
    .values({
      user_id: user.id,
      sort_mode: body.sort_mode,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: userPrefs.user_id,
      set: {
        sort_mode: body.sort_mode,
        updated_at: now,
      },
    })
    .returning();

  return Response.json({
    prefs: {
      sort_mode: saved.sort_mode,
      updated_at: saved.updated_at,
    },
  });
}
