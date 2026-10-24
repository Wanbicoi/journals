import { describe, expect, it } from "bun:test";
import { detectSuggestionQuery } from "./suggest.js";

describe("detectSuggestionQuery", () => {
  it("detects tags (#)", () => {
    expect(detectSuggestionQuery("Hello #wor")).toEqual({
      type: "tag",
      query: "wor",
      triggerIndex: 6,
    });
    expect(detectSuggestionQuery("#first")).toEqual({
      type: "tag",
      query: "first",
      triggerIndex: 0,
    });
  });

  it("detects projects (@)", () => {
    expect(detectSuggestionQuery("Task @Fit")).toEqual({
      type: "project",
      query: "Fit",
      triggerIndex: 5,
    });
    expect(detectSuggestionQuery("@Inbox")).toEqual({
      type: "project",
      query: "Inbox",
      triggerIndex: 0,
    });
  });

  it("detects break commands (/break)", () => {
    expect(detectSuggestionQuery("Resting /")).toEqual({
      type: "break",
      query: "/",
      triggerIndex: 8,
    });
    expect(detectSuggestionQuery("Resting /b")).toEqual({
      type: "break",
      query: "/b",
      triggerIndex: 8,
    });
    expect(detectSuggestionQuery("Resting /break")).toEqual({
      type: "break",
      query: "/break",
      triggerIndex: 8,
    });
    expect(detectSuggestionQuery("Resting /break 3")).toEqual({
      type: "break",
      query: "/break 3",
      triggerIndex: 8,
    });
    expect(detectSuggestionQuery("Resting /break:3d")).toEqual({
      type: "break",
      query: "/break:3d",
      triggerIndex: 8,
    });
    expect(detectSuggestionQuery("/break")).toEqual({
      type: "break",
      query: "/break",
      triggerIndex: 0,
    });
  });

  it("returns null when no suggestion trigger is present", () => {
    expect(detectSuggestionQuery("Hello world")).toBeNull();
    expect(detectSuggestionQuery("path/to/file")).toBeNull();
    expect(detectSuggestionQuery("")).toBeNull();
  });
});
