import { describe, expect, it } from "bun:test";
import { parseProjectSpec } from "./projectSpec.js";

describe("parseProjectSpec", () => {
  it("splits the name from colon commands", () => {
    const spec = parseProjectSpec("My Project /recur:every 3 days /policy:accumulate");

    expect(spec.name).toBe("My Project");
    expect(spec.recurrence).toContain("FREQ");
    expect(spec.missedPolicy).toBe("accumulate");
  });

  it("does not leave a policy command in the name", () => {
    expect(parseProjectSpec("Reading /policy:spike")).toEqual({
      name: "Reading",
      recurrence: undefined,
      missedPolicy: "spike",
    });
  });

  it("clears the routine with /recur:none", () => {
    expect(parseProjectSpec("Reading /recur:none")).toEqual({
      name: "Reading",
      recurrence: null,
      missedPolicy: undefined,
    });
  });

  it("accepts commands in either order", () => {
    const spec = parseProjectSpec("Reading /policy:mark_done /recur:FREQ=DAILY");

    expect(spec.recurrence).toBe("FREQ=DAILY");
    expect(spec.missedPolicy).toBe("mark_done");
  });

  it("treats the removed /every syntax as part of the name", () => {
    expect(parseProjectSpec("Reading /every weekday").name).toBe("Reading /every weekday");
  });

  it("throws on invalid values only in strict mode", () => {
    expect(parseProjectSpec("Reading /recur:blahblah").recurrence).toBeUndefined();
    expect(() => parseProjectSpec("Reading /recur:blahblah", { strict: true })).toThrow(
      "Invalid /recur value",
    );
    expect(() => parseProjectSpec("Reading /policy:nope", { strict: true })).toThrow(
      "Invalid /policy value",
    );
  });
});
