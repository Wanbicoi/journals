import { zValidator } from "@hono/zod-validator";
import {
  CreateAgentEntryInputSchema,
  IncrementAgentEntryHitSchema,
  SearchAgentEntriesQuerySchema,
} from "@journals/core";
import { Hono } from "hono";
import type { DatabaseInstance } from "../../db/client.js";
import {
  AgentEntryError,
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
      const includeSuperseded = c.req.query("includeSuperseded") === "true";
      const entries = listAgentEntries(db, projectId, limit, includeSuperseded);
      return c.json({ entries });
    })
    .get("/search", zValidator("query", SearchAgentEntriesQuerySchema), (c) => {
      const { q, limit, includeSuperseded } = c.req.valid("query");
      const results = searchAgentEntries(db, q, limit, includeSuperseded);
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
      const { content, projectId, projectName, previousEntryId } = c.req.valid("json");
      try {
        const entry = createAgentEntry(db, content, projectId, projectName, previousEntryId);
        return c.json(entry, 201);
      } catch (err) {
        if (err instanceof AgentEntryError) return c.json({ error: err.message }, 400);
        throw err;
      }
    })
    .post("/hit", zValidator("json", IncrementAgentEntryHitSchema), (c) => {
      const { ids, content } = c.req.valid("json");
      try {
        const res = incrementAgentEntryHits(db, ids, content);
        return c.json(res);
      } catch (err) {
        if (err instanceof AgentEntryError) return c.json({ error: err.message }, 400);
        throw err;
      }
    });
}
