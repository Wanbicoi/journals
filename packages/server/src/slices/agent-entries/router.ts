import { zValidator } from "@hono/zod-validator";
import {
  CreateAgentEntryInputSchema,
  IncrementAgentEntryHitSchema,
  SearchAgentEntriesQuerySchema,
} from "@journals/core";
import { Hono } from "hono";
import type { DatabaseInstance } from "../../db/client.js";
import {
  createAgentEntry,
  getAgentEntries,
  incrementAgentEntryHits,
  listAgentEntries,
  searchAgentEntries,
} from "./handler.js";

export function createAgentEntriesRouter(db: DatabaseInstance) {
  return new Hono()
    .get("/", (c) => {
      const projectId = c.req.query("projectId");
      const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;
      const entries = listAgentEntries(db, projectId, limit);
      return c.json({ entries });
    })
    .get("/search", zValidator("query", SearchAgentEntriesQuerySchema), (c) => {
      const { q, limit } = c.req.valid("query");
      const results = searchAgentEntries(db, q, limit);
      return c.json({ entries: results });
    })
    .get("/batch", (c) => {
      const idsParam = c.req.query("ids") || "";
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const entries = getAgentEntries(db, ids);
      return c.json({ entries });
    })
    .post("/", zValidator("json", CreateAgentEntryInputSchema), (c) => {
      const { content, projectId, projectName } = c.req.valid("json");
      const entry = createAgentEntry(db, content, projectId, projectName);
      return c.json(entry, 201);
    })
    .post("/hit", zValidator("json", IncrementAgentEntryHitSchema), (c) => {
      const { ids } = c.req.valid("json");
      const res = incrementAgentEntryHits(db, ids);
      return c.json(res);
    });
}
