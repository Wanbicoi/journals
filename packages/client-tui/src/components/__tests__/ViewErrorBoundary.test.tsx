import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { TestProviders } from "../../test-support/TestProviders.js";
import { ViewErrorBoundary } from "../ViewErrorBoundary.js";

function ExplodingPanel(): never {
  throw new Error("panel exploded");
}

describe("ViewErrorBoundary", () => {
  it("keeps the rest of the app alive when a view throws", async () => {
    const originalError = console.error;
    console.error = () => {};

    try {
      let testSetup!: Awaited<ReturnType<typeof testRender>>;
      await act(async () => {
        testSetup = await testRender(
          <TestProviders>
            <box flexDirection="column">
              <ViewErrorBoundary viewName="Timeline">
                <ExplodingPanel />
              </ViewErrorBoundary>
              <text>still here</text>
            </box>
          </TestProviders>,
          { onDestroy: () => {} },
        );
      });

      await act(async () => {
        await testSetup.flush();
      });
      const frame = testSetup.captureCharFrame();
      expect(frame).toContain("The Timeline view crashed.");
      expect(frame).toContain("panel exploded");
      expect(frame).toContain("still here");

      testSetup.renderer.destroy();
    } finally {
      console.error = originalError;
    }
  });
});
