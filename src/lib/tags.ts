import { db, type Tag, type TodoTag } from "./db";

export async function listTags(): Promise<Tag[]> {
  const rows = await db.tags.toArray();
  return rows
    .filter((t) => t.sync_status !== "deleting")
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

export async function findTagByName(name: string): Promise<Tag | null> {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return null;
  const rows = await db.tags.toArray();
  return (
    rows.find(
      (t) => t.sync_status !== "deleting" && t.name.toLowerCase() === trimmed,
    ) ?? null
  );
}

export async function createTag(name: string): Promise<Tag> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name cannot be empty");
  const existing = await findTagByName(trimmed);
  if (existing) return existing;

  const now = Date.now();
  const tag: Tag = {
    id: crypto.randomUUID(),
    name: trimmed,
    created_at: now,
    sync_status: "pending",
  };
  await db.tags.add(tag);
  return tag;
}

export async function renameTag(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name cannot be empty");
  const existing = await findTagByName(trimmed);
  if (existing && existing.id !== id) {
    throw new Error(`A tag named "${trimmed}" already exists`);
  }

  let res: Response;
  try {
    res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: trimmed }),
    });
  } catch {
    throw new Error("Rename needs an internet connection");
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error ?? `Rename failed (${res.status})`);
  }

  await db.tags.update(id, { name: trimmed, sync_status: "synced" });
}

export async function countTodosWithTag(tagId: string): Promise<number> {
  const links = await db.todo_tags
    .where("tag_id")
    .equals(tagId)
    .toArray();
  return links.filter((l) => l.sync_status !== "deleting").length;
}

export async function deleteTag(id: string): Promise<void> {
  await db.tags.update(id, { sync_status: "deleting" });
  const links = await db.todo_tags.where("tag_id").equals(id).toArray();
  await db.transaction("rw", db.todo_tags, async () => {
    for (const link of links) {
      await db.todo_tags.update([link.todo_id, link.tag_id], {
        sync_status: "deleting",
      });
    }
  });
}

export async function getTagsForTodo(todoId: string): Promise<Tag[]> {
  const links = await db.todo_tags.where("todo_id").equals(todoId).toArray();
  const tagIds = links
    .filter((l) => l.sync_status !== "deleting")
    .map((l) => l.tag_id);
  if (tagIds.length === 0) return [];
  const tags = await db.tags.bulkGet(tagIds);
  return tags
    .filter(
      (t): t is Tag => t !== undefined && t.sync_status !== "deleting",
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

export async function setTagsForTodo(
  todoId: string,
  tagIds: string[],
): Promise<void> {
  const existing = await db.todo_tags.where("todo_id").equals(todoId).toArray();
  const now = Date.now();
  const desired = new Set(tagIds);
  const have = new Set(existing.map((l) => l.tag_id));

  await db.transaction("rw", db.todo_tags, db.todos, async () => {
    for (const link of existing) {
      if (!desired.has(link.tag_id)) {
        await db.todo_tags.update([link.todo_id, link.tag_id], {
          sync_status: "deleting",
        });
      } else if (link.sync_status === "deleting") {
        await db.todo_tags.update([link.todo_id, link.tag_id], {
          sync_status: "pending",
        });
      }
    }
    for (const tagId of desired) {
      if (!have.has(tagId)) {
        await db.todo_tags.put({
          todo_id: todoId,
          tag_id: tagId,
          sync_status: "pending",
        });
      }
    }
    await db.todos.update(todoId, {
      updated_at: now,
      sync_status: "pending",
    });
  });
}

export async function addTagToTodo(
  todoId: string,
  tagName: string,
): Promise<Tag> {
  const tag = await createTag(tagName);
  const current = await getTagsForTodo(todoId);
  const currentIds = current.map((t) => t.id);
  if (!currentIds.includes(tag.id)) {
    await setTagsForTodo(todoId, [...currentIds, tag.id]);
  }
  return tag;
}

export async function removeTagFromTodo(
  todoId: string,
  tagId: string,
): Promise<void> {
  const current = await getTagsForTodo(todoId);
  await setTagsForTodo(
    todoId,
    current.map((t) => t.id).filter((id) => id !== tagId),
  );
}

export function matchesTagFilter(
  linksByTodo: Map<string, string[]>,
  todoId: string,
  activeTagIds: string[],
): boolean {
  if (activeTagIds.length === 0) return true;
  const todoTagIds = linksByTodo.get(todoId) ?? [];
  return activeTagIds.every((id) => todoTagIds.includes(id));
}

export function buildLinksByTodo(links: TodoTag[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const l of links) {
    if (l.sync_status === "deleting") continue;
    const arr = map.get(l.todo_id);
    if (arr) arr.push(l.tag_id);
    else map.set(l.todo_id, [l.tag_id]);
  }
  return map;
}
