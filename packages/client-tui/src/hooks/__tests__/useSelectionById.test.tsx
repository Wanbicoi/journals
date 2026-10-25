import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { TestProviders } from "../../test-support/TestProviders.js";
import { type SelectionById, useSelectionById } from "../useSelection.js";

type TestSetup = Awaited<ReturnType<typeof testRender>>;
type Row = { id: string };

describe("useSelectionById", () => {
  it("derives the selected record from its id and falls back to the first row", async () => {
    const rows: Row[] = [{ id: "a" }, { id: "b" }, { id: "c" }];
    let selection!: SelectionById<Row>;

    function Probe() {
      selection = useSelectionById(rows);
      return <text>{selection.selected?.id ?? "none"}</text>;
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(
        <TestProviders>
          <Probe />
        </TestProviders>,
        { onDestroy: () => {} },
      );
    });

    expect(selection.selected?.id).toBe("a");

    await act(async () => {
      selection.selectIndex(1);
    });
    expect(selection.selected?.id).toBe("b");

    await act(async () => {
      selection.clear();
    });
    expect(selection.selected?.id).toBe("a");

    testSetup.renderer.destroy();
  });
});
