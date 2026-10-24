import { z } from "zod";

export const TagSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[a-zA-Z0-9-_]+$/, "Tag can only contain letters, numbers, hyphens, and underscores")
  .transform((val) => val.toLowerCase());

export const ProjectMissedPolicySchema = z.enum(["accumulate", "spike", "mark_done"]);
export type ProjectMissedPolicy = z.infer<typeof ProjectMissedPolicySchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  content: z.string().default(""),
  recurrence: z.string().nullable().optional(),
  missedPolicy: ProjectMissedPolicySchema.default("spike"),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1),
  content: z.string().optional().default(""),
  recurrence: z.string().nullable().optional(),
  missedPolicy: ProjectMissedPolicySchema.optional().default("spike"),
});

export const UpdateProjectContentInputSchema = z.object({
  content: z.string(),
  recurrence: z.string().nullable().optional(),
  missedPolicy: ProjectMissedPolicySchema.optional(),
});

export const EntrySchema = z.object({
  id: z.string(),
  projectId: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  breakDays: z.number().int().nonnegative().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const QuickCaptureInputSchema = z.object({
  raw: z.string().min(1),
  defaultProject: z.string().nullable().optional().default("Inbox"),
});

export const UpdateEntryProjectSchema = z.object({
  projectName: z.string().nullable().optional(),
});

export const UpdateEntryTagsSchema = z.object({
  tags: z.array(z.string()),
});

export const UpdateEntryContentSchema = z.object({
  content: z.string().min(1),
  breakDays: z.number().int().nonnegative().optional(),
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

export const AgentEntrySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string().optional(),
  content: z.string(),
  hitTime: z.number().int().nonnegative().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const CreateAgentEntryInputSchema = z.object({
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  content: z.string().min(1),
});

export const SearchAgentEntriesQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().default(20),
});

export const AgentEntrySearchResultSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  content: z.string(),
  snippet: z.string(),
  preview: z.string().optional(),
  hitTime: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  rank: z.number().optional(),
});

export const IncrementAgentEntryHitSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type SearchEntriesQuery = z.infer<typeof SearchEntriesQuerySchema>;
export type SearchProjectsQuery = z.infer<typeof SearchProjectsQuerySchema>;
export type EntrySearchResult = z.infer<typeof EntrySearchResultSchema>;
export type ProjectSearchResult = z.infer<typeof ProjectSearchResultSchema>;

export type AgentEntry = z.infer<typeof AgentEntrySchema>;
export type CreateAgentEntryInput = z.infer<typeof CreateAgentEntryInputSchema>;
export type SearchAgentEntriesQuery = z.infer<typeof SearchAgentEntriesQuerySchema>;
export type AgentEntrySearchResult = z.infer<typeof AgentEntrySearchResultSchema>;
export type IncrementAgentEntryHitInput = z.infer<typeof IncrementAgentEntryHitSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type QuickCaptureInput = z.infer<typeof QuickCaptureInputSchema>;
