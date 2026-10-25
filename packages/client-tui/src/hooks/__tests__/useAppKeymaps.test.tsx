import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act, useState } from "react";
import { type Tab, useAppKeymaps } from "../useAppKeymaps.js";

type TestSetup = Awaited<ReturnType<typeof testRender>>;

describe("useAppKeymaps", () => {
  it("routes tab keys, global actions, and quit without touching process lifecycle", async () => {
    let quit = false;
    let filterOpened = false;
    let helpOpened = false;
    let refreshed = false;
    let cleared = false;
    let activeTab: Tab = "DASHBOARD";

    function Probe() {
      const [tab, setTab] = useState<Tab>("DASHBOARD");
      activeTab = tab;
      useAppKeymaps({
        currentTab: tab,
        modalOpen: false,
        onSelectTab: setTab,
        onOpenFilter: () => {
          filterOpened = true;
        },
        onOpenHelp: () => {
          helpOpened = true;
        },
        onRefresh: () => {
          refreshed = true;
        },
        onClearFilter: () => {
          cleared = true;
        },
        onQuit: () => {
          quit = true;
        },
      });
      return (
        <box>
          <text>{tab}</text>
        </box>
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(<Probe />, { onDestroy: () => {} });
    });

    await act(async () => {
      testSetup.mockInput.pressKey("2");
    });
    expect(activeTab as string).toBe("TIMELINE");

    await act(async () => {
      testSetup.mockInput.pressTab();
    });
    expect(activeTab as string).toBe("REFLECTIONS");

    await act(async () => {
      testSetup.mockInput.pressKey("/");
    });
    expect(filterOpened).toBe(true);

    await act(async () => {
      testSetup.mockInput.pressKey("?");
    });
    expect(helpOpened).toBe(true);

    await act(async () => {
      testSetup.mockInput.pressKey("r");
    });
    expect(refreshed).toBe(true);

    await act(async () => {
      testSetup.mockInput.pressEscape();
      // The terminal parser waits to distinguish a lone Escape from an escape sequence.
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(cleared).toBe(true);

    await act(async () => {
      testSetup.mockInput.pressKey("q");
    });
    expect(quit).toBe(true);

    testSetup.renderer.destroy();
  });

  it("ignores global keys while a modal is open", async () => {
    let quit = false;

    function Probe() {
      useAppKeymaps({
        currentTab: "DASHBOARD",
        modalOpen: true,
        onSelectTab: () => {},
        onOpenFilter: () => {},
        onOpenHelp: () => {},
        onRefresh: () => {},
        onClearFilter: () => {},
        onQuit: () => {
          quit = true;
        },
      });
      return (
        <box>
          <text>modal</text>
        </box>
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(<Probe />, { onDestroy: () => {} });
    });

    await act(async () => {
      testSetup.mockInput.pressKey("q");
      testSetup.mockInput.pressKey("2");
    });

    expect(quit).toBe(false);
    testSetup.renderer.destroy();
  });
});
