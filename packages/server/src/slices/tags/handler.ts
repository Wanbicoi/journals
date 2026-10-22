import { count, desc, eq, like } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { entryTags, tags } from "../../db/schema.js";

export function listTags(db: DatabaseInstance, prefix?: string) {
  const query = db
    .select({
      name: tags.name,
      count: count(entryTags.entryId),
    })
    .from(tags)
    .leftJoin(entryTags, eq(tags.name, entryTags.tagName))
    .groupBy(tags.name)
    .orderBy(desc(count(entryTags.entryId)));

  if (prefix) {
    return query.where(like(tags.name, `${prefix.toLowerCase()}%`)).all();
  }

  return query.all();
}
