import { zValidator } from "@hono/zod-validator";
import {
  PeriodDetailParamSchema,
  PeriodTypeParamSchema,
  SaveReflectionInputSchema,
} from "@journals/core";
import { Hono } from "hono";
import type { DatabaseInstance } from "../../db/client.js";
import { getPeriodDetail, listPeriodStatuses, saveReflection } from "./handler.js";

export function createReflectionsRouter(db: DatabaseInstance) {
  return new Hono()
    .get("/:periodType", zValidator("param", PeriodTypeParamSchema), (c) => {
      const { periodType } = c.req.valid("param");
      const periods = listPeriodStatuses(db, periodType);
      return c.json({ periods });
    })
    .get("/:periodType/:periodKey", zValidator("param", PeriodDetailParamSchema), (c) => {
      const { periodType, periodKey } = c.req.valid("param");
      const detail = getPeriodDetail(db, periodType, periodKey);
      if (!detail) {
        return c.json({ error: "Invalid period key" }, 404);
      }
      return c.json(detail);
    })
    .put(
      "/:periodType/:periodKey",
      zValidator("param", PeriodDetailParamSchema),
      zValidator("json", SaveReflectionInputSchema),
      (c) => {
        const { periodType, periodKey } = c.req.valid("param");
        const { content } = c.req.valid("json");
        const reflection = saveReflection(db, periodType, periodKey, content);
        return c.json({ reflection });
      },
    );
}
