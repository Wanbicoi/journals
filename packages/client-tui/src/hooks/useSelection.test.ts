import { describe, expect, it } from "bun:test";
import { resolveSelectedIndex } from "./useSelection.js";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("resolveSelectedIndex", () => {
  it("returns the index of the selected id", () => {
    expect(resolveSelectedIndex(items, "b")).toBe(1);
  });

  it("falls back to the first row when nothing is selected", () => {
    expect(resolveSelectedIndex(items, null)).toBe(0);
  });

  it("falls back to the first row when the selected id disappears", () => {
    expect(resolveSelectedIndex(items, "deleted")).toBe(0);
  });

  it("returns -1 for an empty list so callers can render the empty state", () => {
    expect(resolveSelectedIndex([], "a")).toBe(-1);
    expect(resolveSelectedIndex([], null)).toBe(-1);
  });
});
