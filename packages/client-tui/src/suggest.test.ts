import { describe, expect, it } from "bun:test";
import { detectPlainSuggestionQuery, detectSuggestionQuery } from "./suggest.js";

describe("detectSuggestionQuery", () => {
  it("lists command prefixes on a bare slash", () => {
    expect(detectSuggestionQuery("Resting /")).toEqual({
      type: "command",
      query: "",
      triggerIndex: 8,
    });
    expect(detectSuggestionQuery("Resting /pro")).toEqual({
      type: "command",
      query: "pro",
      triggerIndex: 8,
    });
  });

  it("detects colon commands and their values", () => {
    expect(detectSuggestionQuery("Task /project:Al")).toEqual({
      type: "project",
      query: "Al",
      triggerIndex: 5,
    });
    expect(detectSuggestionQuery("/tag:wor")).toEqual({
      type: "tag",
      query: "wor",
      triggerIndex: 0,
    });
    expect(detectSuggestionQuery("Resting /break:3")).toEqual({
      type: "break",
      query: "3",
      triggerIndex: 8,
    });
    expect(detectSuggestionQuery("Old note /date:y")).toEqual({
      type: "date",
      query: "y",
      triggerIndex: 9,
    });
    expect(detectSuggestionQuery("Reading /recur:every w")).toEqual({
      type: "recurrence",
      query: "every w",
      triggerIndex: 8,
    });
    expect(detectSuggestionQuery("Reading /policy:acc")).toEqual({
      type: "policy",
      query: "acc",
      triggerIndex: 8,
    });
  });

  it("points at a trailing bare command after an earlier complete command", () => {
    expect(detectSuggestionQuery("/policy:spike /recu")).toEqual({
      type: "command",
      query: "recu",
      triggerIndex: 14,
    });
  });

  it("points at the last command when a line has several", () => {
    expect(detectSuggestionQuery("/project:Al /tag:wo")).toEqual({
      type: "tag",
      query: "wo",
      triggerIndex: 12,
    });
  });

  it("reads quoted values without the quotes", () => {
    expect(detectSuggestionQuery('/project:"My Pro')).toEqual({
      type: "project",
      query: "My Pro",
      triggerIndex: 0,
    });
  });

  it("ignores removed trigger syntax and unknown commands", () => {
    expect(detectSuggestionQuery("Hello @Al")).toBeNull();
    expect(detectSuggestionQuery("Hello #wo")).toBeNull();
    expect(detectSuggestionQuery("Hello /foo:bar")).toBeNull();
    expect(detectSuggestionQuery("path/to/file")).toBeNull();
    expect(detectSuggestionQuery("")).toBeNull();
  });
});

describe("detectPlainSuggestionQuery", () => {
  it("uses the whole field for a project", () => {
    expect(detectPlainSuggestionQuery("Al", "project")).toEqual({
      type: "project",
      query: "Al",
      triggerIndex: 0,
    });
    expect(detectPlainSuggestionQuery("  ", "project")).toEqual({
      type: "project",
      query: "",
      triggerIndex: 0,
    });
  });

  it("uses only the current comma-separated tag", () => {
    expect(detectPlainSuggestionQuery("work, rea", "tag")).toEqual({
      type: "tag",
      query: "rea",
      triggerIndex: 6,
    });
    expect(detectPlainSuggestionQuery("work", "tag")).toEqual({
      type: "tag",
      query: "work",
      triggerIndex: 0,
    });
  });
});
