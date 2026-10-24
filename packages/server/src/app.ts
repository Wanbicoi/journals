import { zValidator } from "@hono/zod-validator";
import {
  CreateProjectInputSchema,
  QuickCaptureInputSchema,
  SearchEntriesQuerySchema,
  SearchProjectsQuerySchema,
  UpdateEntryContentSchema,
  UpdateEntryProjectSchema,
  UpdateEntryTagsSchema,
  UpdateProjectContentInputSchema,
} from "@journals/core";
import { Hono } from "hono";
import type { DatabaseInstance } from "./db/client.js";
import { createAgentEntriesRouter } from "./slices/agent-entries/router.js";
import { getDashboardAnalytics } from "./slices/analytics/handler.js";
import {
  deleteEntry,
  listEntries,
  restoreEntry,
  searchEntries,
  updateEntryContent,
  updateEntryProject,
  updateEntryTags,
} from "./slices/entries/handler.js";
import {
  createProject,
  listProjects,
  searchProjects,
  updateProject,
} from "./slices/projects/handler.js";
import { handleQuickCapture } from "./slices/quick-capture/handler.js";
import { createReflectionsRouter } from "./slices/reflections/router.js";
import { listTags } from "./slices/tags/handler.js";

export function createApp(db: DatabaseInstance) {
  const app = new Hono()
    .get("/health", (c) => c.json({ status: "ok" }))

    // Quick Capture
    .post("/capture", zValidator("json", QuickCaptureInputSchema), (c) => {
      const data = c.req.valid("json");
      const result = handleQuickCapture(db, data.raw, data.defaultProject ?? null);
      return c.json(result);
    })

    // Entries
    .get("/entries", (c) => {
      const entries = listEntries(db);
      return c.json({ entries });
    })
    .get("/entries/search", zValidator("query", SearchEntriesQuerySchema), (c) => {
      const { q, limit } = c.req.valid("query");
      const results = searchEntries(db, q, limit);
      return c.json({ entries: results });
    })
    .patch("/entries/:id/project", zValidator("json", UpdateEntryProjectSchema), (c) => {
      const id = c.req.param("id");
      const { projectName } = c.req.valid("json");
      const res = updateEntryProject(db, id, projectName);
      return c.json(res);
    })
    .patch("/entries/:id/tags", zValidator("json", UpdateEntryTagsSchema), (c) => {
      const id = c.req.param("id");
      const { tags } = c.req.valid("json");
      const res = updateEntryTags(db, id, tags);
      return c.json(res);
    })
    .patch("/entries/:id/content", zValidator("json", UpdateEntryContentSchema), (c) => {
      const id = c.req.param("id");
      const { content, breakDays } = c.req.valid("json");
      const res = updateEntryContent(db, id, content, breakDays);
      return c.json(res);
    })
    .delete("/entries/:id", (c) => {
      const id = c.req.param("id");
      const res = deleteEntry(db, id);
      return c.json(res);
    })
    .post("/entries/:id/restore", (c) => {
      const id = c.req.param("id");
      const res = restoreEntry(db, id);
      return c.json(res);
    })

    // Projects
    .get("/projects", (c) => {
      const projects = listProjects(db);
      return c.json({ projects });
    })
    .get("/projects/search", zValidator("query", SearchProjectsQuerySchema), (c) => {
      const { q, limit } = c.req.valid("query");
      const results = searchProjects(db, q, limit);
      return c.json({ projects: results });
    })
    .post("/projects", zValidator("json", CreateProjectInputSchema), (c) => {
      const { name, content, recurrence, missedPolicy } = c.req.valid("json");
      const res = createProject(db, name, content, recurrence, missedPolicy);
      return c.json(res);
    })
    .patch("/projects/:id/content", zValidator("json", UpdateProjectContentInputSchema), (c) => {
      const id = c.req.param("id");
      const body = c.req.valid("json");
      const res = updateProject(db, id, body);
      return c.json(res);
    })

    // Analytics / Dashboard
    .get("/analytics/dashboard", (c) => {
      const days = Number.parseInt(c.req.query("days") || "60", 10);
      const data = getDashboardAnalytics(db, Number.isNaN(days) ? 60 : days);
      return c.json(data);
    })

    // Tags
    .get("/tags", (c) => {
      const tags = listTags(db);
      return c.json({ tags });
    })

    // Periodic Reflections Slice
    .route("/reflections", createReflectionsRouter(db))

    // Agent Entries Slice
    .route("/agent-entries", createAgentEntriesRouter(db));

  return app;
}

export type AppType = ReturnType<typeof createApp>;
