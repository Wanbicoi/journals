import { afterAll, describe, expect, it } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { config } from "../../../api/client.js";
import type { Keymaps } from "../../../contexts/keymaps.js";
import type { ModalsValue } from "../../../contexts/modals.js";
import { useModals } from "../../../contexts/modals.js";
import { useNavigation } from "../../../contexts/navigation.js";
import { useNotifications } from "../../../contexts/notification.js";
import type { Entry, Project, TagInfo } from "../../../hooks/queries.js";
import { queryKeys } from "../../../hooks/queries.js";
import { createQueryClient } from "../../../queryClient.js";
import { AppProviders } from "../../../test-support/AppProviders.js";
import { ActiveModal } from "../ActiveModal.js";

type TestSetup = Awaited<ReturnType<typeof testRender>>;

const projects: Project[] = [
  {
    id: "p1",
    name: "Alpha",
    content: "",
    recurrence: null,
    missedPolicy: "spike",
    createdAt: Date.now(),
    entryCount: 1,
  },
  {
    id: "p2",
    name: "Beta",
    content: "",
    recurrence: "FREQ=DAILY",
    missedPolicy: "accumulate",
    createdAt: Date.now(),
    entryCount: 0,
  },
];

const tags: TagInfo[] = [{ name: "work", count: 5 }];

const entry: Entry = {
  id: "e1",
  projectId: "p1",
  projectName: "Alpha",
  content: "Test note content",
  tags: ["work"],
  breakDays: 0,
  createdAt: Date.now(),
};

const originalFetch = globalThis.fetch;

interface RecordedCall {
  method: string;
  url: string;
  body: unknown;
}

function stubServer(): RecordedCall[] {
  const calls: RecordedCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({
      method: init?.method ?? "GET",
      url,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  return calls;
}

afterAll(() => {
  globalThis.fetch = originalFetch;
});

interface Harness {
  api: ModalsValue;
  message: string;
  filter: string;
}

async function renderModal(initialTab: "TIMELINE" | "PROJECTS" = "TIMELINE", keymaps?: Keymaps) {
  const client = createQueryClient();
  client.setQueryData(queryKeys.projects, projects);
  client.setQueryData(queryKeys.tags, tags);

  const harness: Harness = { api: {} as ModalsValue, message: "", filter: "" };

  function Probe() {
    harness.api = useModals();
    harness.message = useNotifications().message;
    harness.filter = useNavigation().filter;
    return <ActiveModal />;
  }

  let testSetup!: TestSetup;
  await act(async () => {
    testSetup = await testRender(
      <AppProviders client={client} initialTab={initialTab} keymaps={keymaps}>
        <Probe />
      </AppProviders>,
      { onDestroy: () => {} },
    );
  });

  const press = async (key: string) => {
    await act(async () => {
      testSetup.mockInput.pressKey(key);
    });
  };

  const frame = async () => {
    await act(async () => {
      await testSetup.flush();
    });
    return testSetup.captureCharFrame();
  };

  return { testSetup, harness, press, frame };
}

describe("ActiveModal dispatcher", () => {
  it("renders nothing while no modal is open", async () => {
    stubServer();
    const { testSetup, frame } = await renderModal();

    expect(await frame()).not.toContain("QUICK CAPTURE");
    testSetup.renderer.destroy();
  });

  it("captures a line and reports it", async () => {
    const calls = stubServer();
    const { testSetup, harness, frame } = await renderModal();

    await act(async () => {
      harness.api.open({ name: "capture" });
    });
    expect(await frame()).toContain("QUICK CAPTURE");

    await act(async () => {
      testSetup.mockInput.typeText("Wrote tests @Alpha #work");
    });
    await act(async () => {
      testSetup.mockInput.pressEnter();
    });

    const capture = calls.find((call) => call.url.includes("/capture"));
    expect((capture?.body as { raw: string }).raw).toBe("Wrote tests @Alpha #work");
    expect(harness.api.isOpen).toBe(false);
    expect(harness.message).toBe("Captured new journal entry!");

    testSetup.renderer.destroy();
  });

  it("suggests project names from the cache", async () => {
    stubServer();
    const { testSetup, harness, frame } = await renderModal();

    await act(async () => {
      harness.api.open({ name: "capture" });
    });
    await act(async () => {
      testSetup.mockInput.typeText("Quick note @Al");
    });

    expect(await frame()).toContain("[@Alpha]");
    testSetup.renderer.destroy();
  });

  it("cancels the capture modal on a rebound key", async () => {
    stubServer();
    const keymaps = { ...config.keymaps, modal: { ...config.keymaps.modal, cancel: "x" } };
    const { testSetup, harness, press } = await renderModal("TIMELINE", keymaps);

    await act(async () => {
      harness.api.open({ name: "capture" });
    });
    await press("x");
    expect(harness.api.isOpen).toBe(false);

    testSetup.renderer.destroy();
  });

  it("confirms the opened entry before deleting it", async () => {
    const calls = stubServer();
    const { testSetup, harness, press, frame } = await renderModal();

    await act(async () => {
      harness.api.open({ name: "delete-entry", entry });
    });
    expect(await frame()).toContain("DELETE NOTE");

    await press("y");

    expect(calls.some((call) => call.method === "DELETE" && call.url.includes("/entries/e1"))).toBe(
      true,
    );
    expect(harness.api.isOpen).toBe(false);
    expect(harness.message).toContain("Press 'u' to undo");

    testSetup.renderer.destroy();
  });

  it("creates a project from the slash syntax", async () => {
    const calls = stubServer();
    const { testSetup, harness } = await renderModal("PROJECTS");

    await act(async () => {
      harness.api.open({ name: "new-project" });
    });
    await act(async () => {
      testSetup.mockInput.typeText("Reading /recur:FREQ=DAILY /policy:accumulate");
    });
    await act(async () => {
      testSetup.mockInput.pressEnter();
    });

    const created = calls.find((call) => call.method === "POST" && call.url.endsWith("/projects"));
    expect(created?.body).toMatchObject({
      name: "Reading",
      recurrence: "FREQ=DAILY",
      missedPolicy: "accumulate",
    });
    expect(harness.api.isOpen).toBe(false);

    testSetup.renderer.destroy();
  });

  it("applies a filter to the active view", async () => {
    stubServer();
    const { testSetup, harness } = await renderModal("TIMELINE");

    await act(async () => {
      harness.api.open({ name: "filter" });
    });
    await act(async () => {
      testSetup.mockInput.typeText("tag:important");
    });
    await act(async () => {
      testSetup.mockInput.pressEnter();
    });

    expect(harness.filter).toBe("tag:important");
    expect(harness.api.isOpen).toBe(false);

    testSetup.renderer.destroy();
  });

  it("shows the keyboard help and closes on the next key", async () => {
    stubServer();
    const { testSetup, harness, press, frame } = await renderModal();

    await act(async () => {
      harness.api.open({ name: "help" });
    });
    const help = await frame();
    expect(help).toContain("KEYBOARD SHORTCUTS");
    expect(help).toContain("Ctrl+C");

    await press("x");
    expect(harness.api.isOpen).toBe(false);

    testSetup.renderer.destroy();
  });

  it("edits an entry's content in the textarea", async () => {
    stubServer();
    const { testSetup, harness, frame } = await renderModal();

    await act(async () => {
      harness.api.open({ name: "edit-content", entry });
    });
    expect(await frame()).toContain("Test note content");

    await act(async () => {
      testSetup.mockInput.pressEscape();
      // The terminal parser waits to distinguish a lone Escape from an escape sequence.
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(harness.api.isOpen).toBe(false);

    testSetup.renderer.destroy();
  });
});
