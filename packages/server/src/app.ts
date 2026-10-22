import { zValidator } from "@hono/zod-validator";
import {
  CreateProjectInputSchema,
  QuickCaptureInputSchema,
  UpdateEntryContentSchema,
  UpdateEntryProjectSchema,
  UpdateEntryTagsSchema,
  UpdateProjectContentInputSchema,
} from "@journals/core";
import { Hono } from "hono";
import type { DatabaseInstance } from "./db/client.js";
import {
  deleteEntry,
  listEntries,
  updateEntryContent,
  updateEntryProject,
  updateEntryTags,
} from "./slices/entries/handler.js";
import { createProject, listProjects, updateProjectContent } from "./slices/projects/handler.js";
import { handleQuickCapture } from "./slices/quick-capture/handler.js";
import { listTags } from "./slices/tags/handler.js";

export function createApp(db: DatabaseInstance) {
  const app = new Hono()
    .get("/health", (c) => c.json({ status: "ok" }))

    // Quick Capture
    .post("/capture", zValidator("json", QuickCaptureInputSchema), (c) => {
      const data = c.req.valid("json");
      const result = handleQuickCapture(db, data.raw, data.defaultProject, data.defaultTags);
      return c.json(result);
    })

    // Entries
    .get("/entries", (c) => {
      const entries = listEntries(db);
      return c.json({ entries });
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
      const { content } = c.req.valid("json");
      const res = updateEntryContent(db, id, content);
      return c.json(res);
    })
    .delete("/entries/:id", (c) => {
      const id = c.req.param("id");
      const res = deleteEntry(db, id);
      return c.json(res);
    })

    // Projects
    .get("/projects", (c) => {
      const projects = listProjects(db);
      return c.json({ projects });
    })
    .post("/projects", zValidator("json", CreateProjectInputSchema), (c) => {
      const { name, content } = c.req.valid("json");
      const res = createProject(db, name, content);
      return c.json(res);
    })
    .patch("/projects/:id/content", zValidator("json", UpdateProjectContentInputSchema), (c) => {
      const id = c.req.param("id");
      const { content } = c.req.valid("json");
      const res = updateProjectContent(db, id, content);
      return c.json(res);
    })

    // Tags
    .get("/tags", (c) => {
      const tags = listTags(db);
      return c.json({ tags });
    });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
