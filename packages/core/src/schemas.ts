import { z } from "zod";

export const TagSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[a-zA-Z0-9-_]+$/, "Tag can only contain letters, numbers, hyphens, and underscores")
  .transform((val) => val.toLowerCase());

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  content: z.string().default(""),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1),
  content: z.string().optional().default(""),
});

export const UpdateProjectContentInputSchema = z.object({
  content: z.string(),
});

export const EntrySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string().optional(),
  content: z.string(),
  isQuickCapture: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const QuickCaptureInputSchema = z.object({
  raw: z.string().min(1),
  defaultProject: z.string().optional().default("Inbox"),
  defaultTags: z.array(z.string()).optional().default(["quick"]),
});

export const UpdateEntryProjectSchema = z.object({
  projectName: z.string().min(1),
});

export const UpdateEntryTagsSchema = z.object({
  tags: z.array(z.string()),
});

export const UpdateEntryContentSchema = z.object({
  content: z.string().min(1),
});

export const SearchEntriesQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().default(50),
});

export const SearchProjectsQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().default(50),
});

export const EntrySearchResultSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  content: z.string(),
  snippet: z.string(),
  isQuickCapture: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
  rank: z.number().optional(),
});

export const ProjectSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  snippet: z.string(),
  entryCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  rank: z.number().optional(),
});

export type SearchEntriesQuery = z.infer<typeof SearchEntriesQuerySchema>;
export type SearchProjectsQuery = z.infer<typeof SearchProjectsQuerySchema>;
export type EntrySearchResult = z.infer<typeof EntrySearchResultSchema>;
export type ProjectSearchResult = z.infer<typeof ProjectSearchResultSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type QuickCaptureInput = z.infer<typeof QuickCaptureInputSchema>;
