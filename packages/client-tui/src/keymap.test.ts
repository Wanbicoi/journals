import { describe, expect, it } from "bun:test";
import {
  actionForKey,
  bindingLabel,
  matchesAnyBinding,
  matchesBinding,
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

  it("matches a Ctrl chord against its ctrl-prefixed binding", () => {
    const ctrlN = { name: "n", sequence: "\x0e", ctrl: true };
    expect(matchesBinding(ctrlN, "ctrl+n")).toBe(true);
    expect(matchesBinding(ctrlN, "n")).toBe(true);
    expect(matchesBinding({ name: "n", sequence: "n" }, "ctrl+n")).toBe(false);
  });

  it("prefers a Ctrl chord over the unmodified binding", () => {
    const bindings = { next_suggestion: "ctrl+n", quick_capture: "n" } as const;
    expect(actionForKey({ name: "n", sequence: "\x0e", ctrl: true }, bindings)).toBe(
      "next_suggestion",
    );
    expect(actionForKey({ name: "n", sequence: "n" }, bindings)).toBe("quick_capture");
  });

  it("labels chords with their modifier", () => {
    expect(bindingLabel("ctrl+n")).toBe("Ctrl+N");
    expect(bindingLabel(["down", "ctrl+p"])).toBe("↓");
  });

  it("falls back to the uppercase binding when the terminal omits the shifted sequence", () => {
    const bindings = { jump_today: "T" } as const;
    expect(actionForKey({ name: "t", sequence: "t", shift: true }, bindings)).toBe("jump_today");
    expect(actionForKey({ name: "t", sequence: "t" }, bindings)).toBeNull();
  });
});
