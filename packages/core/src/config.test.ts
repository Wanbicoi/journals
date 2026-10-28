import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { ConfigSchema } from "./config.js";

/**
 * The example config is also the fallback `loadConfig` reads when the user has no config, so it
 * must stay in lockstep with the schema defaults. Zod strips unknown keys and fills missing ones,
 * which hides drift; compare the raw key shape as well as the parsed values.
 */
const examplePath = path.resolve(import.meta.dir, "../../../configs/journal.config.example.yaml");
const raw = yaml.parse(fs.readFileSync(examplePath, "utf-8")) as Record<string, unknown>;
const defaults = ConfigSchema.parse({});

function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, shapeOf(child)]),
    );
  }
  return typeof value;
}

describe("example configuration", () => {
  it("parses against the config schema", () => {
    expect(() => ConfigSchema.parse(raw)).not.toThrow();
  });

  it("documents every default keymap and icon without stale keys", () => {
    expect(shapeOf(raw.keymaps)).toEqual(shapeOf(defaults.keymaps));
    expect(shapeOf(raw.icons)).toEqual(shapeOf(defaults.icons));
  });

  it("keeps the example keymaps and icons equal to the defaults", () => {
    expect(raw.keymaps).toEqual(defaults.keymaps);
    expect(raw.icons).toEqual(defaults.icons);
  });
});
