import { describe, expect, it } from "bun:test";
import {
  matchesAnyBinding,
  matchesBinding,
  matchesShiftedBinding,
  normalizeKey,
} from "./keymap.js";

describe("key normalization", () => {
  it("matches plain letters by name and sequence", () => {
    expect(matchesBinding({ name: "j", sequence: "j" }, "j")).toBe(true);
    expect(matchesBinding({ name: "j" }, "j")).toBe(true);
  });

  it("keeps shifted letters distinct from their lowercase binding", () => {
    const shiftedG = { name: "g", sequence: "G", shift: true };
    expect(matchesBinding(shiftedG, "G")).toBe(true);
    expect(matchesBinding(shiftedG, "g")).toBe(false);
  });

  it("normalizes control sequences to the key name", () => {
    expect(normalizeKey({ name: "return", sequence: "\r" })).toBe("return");
    expect(normalizeKey({ name: "tab", sequence: "\t" })).toBe("tab");
    expect(normalizeKey({ name: "escape", sequence: "\x1b" })).toBe("escape");
  });

  it("normalizes multi-character arrow sequences to the key name", () => {
    expect(matchesBinding({ name: "up", sequence: "\x1b[A" }, "up")).toBe(true);
  });

  it("matches a space typed as either the named key or the character", () => {
    const key = { name: "space", sequence: " " };
    expect(matchesAnyBinding(key, "space", " ")).toBe(true);
  });

  it("matches configured multi-character key names", () => {
    expect(matchesBinding({ name: "tab", sequence: "\t" }, "tab")).toBe(true);
  });

  it("matches a shifted letter even when the terminal omits the uppercase sequence", () => {
    expect(matchesShiftedBinding({ name: "t", sequence: "t", shift: true }, "T")).toBe(true);
    expect(matchesShiftedBinding({ name: "t", sequence: "t" }, "T")).toBe(false);
  });
});
