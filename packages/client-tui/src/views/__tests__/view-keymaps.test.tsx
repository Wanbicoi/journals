import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { type ReactNode, act } from "react";
import { type ModalsValue, useModals } from "../../contexts/modals.js";
import { type NavigationValue, type Tab, useNavigation } from "../../contexts/navigation.js";
import { useNotifications } from "../../contexts/notification.js";
import type { DashboardData, Entry, Project } from "../../hooks/queries.js";
import { DASHBOARD_POLL_INTERVAL_MS, queryKeys } from "../../hooks/queries.js";
import { createQueryClient } from "../../queryClient.js";
import { AppProviders } from "../../test-support/AppProviders.js";
import { DashboardView } from "../dashboard/DashboardView.js";
import { ProjectsView } from "../projects/ProjectsView.js";
import { ReflectionsView } from "../reflections/ReflectionsView.js";
import { TimelineView } from "../timeline/TimelineView.js";

type TestSetup = Awaited<ReturnType<typeof testRender>>;

const sampleEntries: Entry[] = [
  {
    id: "entry-1",
    projectId: "proj-1",
    content: "First note",
    createdAt: Date.now() - 86400000 * 2,
    tags: ["feature"],
    projectName: "Alpha",
    breakDays: 0,
  },
  {
    id: "entry-2",
    projectId: "proj-2",
    content: "Second note",
    createdAt: Date.now() - 86400000,
    tags: ["bug"],
    projectName: "Beta",
    breakDays: 0,
  },
  {
    id: "entry-3",
    projectId: "proj-1",
    content: "Third note today",
    createdAt: Date.now(),
    tags: ["release"],
    projectName: "Alpha",
    breakDays: 0,
  },
];

const sampleProjects: Project[] = [
  {
    id: "proj-1",
    name: "Alpha",
    content: "# Alpha overview",
    recurrence: "FREQ=DAILY",
    missedPolicy: "spike",
    entryCount: 2,
    createdAt: Date.now(),
  },
  {
    id: "proj-2",
    name: "Beta",
    content: "# Beta overview",
    recurrence: null,
    missedPolicy: "spike",
    entryCount: 1,
    createdAt: Date.now(),
  },
];

const sampleDashboard: DashboardData = {
  status: "NORMAL",
  totalEntries: 2,
  days: [
    {
      date: "2026-10-23",
      timestamp: Date.now() - 86400000,
      entryCount: 0,
      breakDaysCount: 0,
      dueProjectsCount: 1,
      completedProjectsCount: 1,
      missedProjectsCount: 0,
      missedProjectNames: [],
    },
    {
      date: "2026-10-24",
      timestamp: Date.now(),
      entryCount: 1,
      breakDaysCount: 0,
      dueProjectsCount: 1,
      completedProjectsCount: 0,
      missedProjectsCount: 1,
      missedProjectNames: ["Alpha"],
    },
  ],
  todayRoutines: [
    {
      projectId: "proj-1",
      projectName: "Alpha",
      recurrence: "FREQ=DAILY",
      isDueToday: true,
      isCompletedToday: false,
    },
  ],
  totalBreakDays: 0,
  activeDebts: [],
  activeBreaks: [],
};

interface Sink {
  modals: ModalsValue;
  message: string;
  navigation: Pick<NavigationValue, "tab" | "filter">;
}

/** Mirrors the context values a test asserts on, without rendering a fake UI. */
function Probes({ sink }: { sink: Sink }) {
  sink.modals = useModals();
  sink.message = useNotifications().message;
  const { tab, filter } = useNavigation();
  sink.navigation = { tab, filter };
  return null;
}

const originalFetch = globalThis.fetch;

/** Every mutation succeeds; reads return the seeded fixtures. */
function stubServer(seed: { entries?: Entry[]; projects?: Project[]; dashboard?: DashboardData }) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/analytics/dashboard")) {
      return new Response(JSON.stringify(seed.dashboard ?? sampleDashboard), { status: 200 });
    }
    if (url.includes("/entries")) {
      return new Response(JSON.stringify({ entries: seed.entries ?? [] }), { status: 200 });
    }
    if (url.includes("/projects")) {
      return new Response(JSON.stringify({ projects: seed.projects ?? [] }), { status: 200 });
    }
    if (url.includes("/tags")) {
      return new Response(JSON.stringify({ tags: [] }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
}

beforeAll(() => {
  // `o` opens $EDITOR; `true` exits without changing the buffer.
  process.env.EDITOR = "true";
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

async function renderView(
  ui: ReactNode,
  seed: { entries?: Entry[]; projects?: Project[]; dashboard?: DashboardData } = {},
  initialTab?: Tab,
) {
  const client = createQueryClient();
  if (seed.entries) client.setQueryData(queryKeys.entries, seed.entries);
  if (seed.projects) client.setQueryData(queryKeys.projects, seed.projects);
  if (seed.dashboard) client.setQueryData(queryKeys.dashboard(60), seed.dashboard);

  const sink: Sink = {
    modals: {} as ModalsValue,
    message: "",
    navigation: { tab: "DASHBOARD", filter: "" },
  };

  let testSetup!: TestSetup;
  await act(async () => {
    testSetup = await testRender(
      <AppProviders client={client} initialTab={initialTab}>
        <box flexDirection="column">
          {ui}
          <Probes sink={sink} />
        </box>
      </AppProviders>,
      { onDestroy: () => {} },
    );
  });

  const press = async (key: string) => {
    await act(async () => {
      testSetup.mockInput.pressKey(key);
    });
  };

  const closeModal = async () => {
    await act(async () => {
      sink.modals.close();
    });
  };

  return { testSetup, sink, press, closeModal, client };
}

describe("Collocated View Keymaps", () => {
  describe("TimelineView", () => {
    it("moves the selection with j/k/g/G and jumps between days with [ ] and T", async () => {
      stubServer({ entries: sampleEntries });
      const { testSetup, sink, press, closeModal } = await renderView(<TimelineView />, {
        entries: sampleEntries,
      });

      // `d` opens the delete confirmation for the selected row, so the probe names the row.
      const selectedAfter = async () => {
        await press("d");
        const modal = sink.modals.modal;
        await closeModal();
        return modal?.name === "delete-entry" ? modal.entry.id : "";
      };

      await press("j");
      expect(await selectedAfter()).toBe("entry-2");

      await press("k");
      expect(await selectedAfter()).toBe("entry-1");

      await press("G");
      expect(await selectedAfter()).toBe("entry-3");

      await press("g");
      expect(await selectedAfter()).toBe("entry-1");

      await press("]");
      expect(sink.message).toContain("Jumped to");
      expect(await selectedAfter()).toBe("entry-2");

      await press("[");
      expect(await selectedAfter()).toBe("entry-1");

      await press("T");
      expect(sink.message).toContain("Jumped to Today");
      expect(await selectedAfter()).toBe("entry-3");

      testSetup.renderer.destroy();
      globalThis.fetch = originalFetch;
    });

    it("opens the action modals for the selected entry (c, e, p, t, d, u)", async () => {
      stubServer({ entries: sampleEntries });
      const { testSetup, sink, press, closeModal } = await renderView(<TimelineView />, {
        entries: sampleEntries,
      });

      await press("j");

      await press("c");
      expect(sink.modals.modal?.name).toBe("capture");
      await closeModal();

      await press("e");
      expect(sink.modals.modal?.name).toBe("edit-content");
      await closeModal();

      await press("p");
      expect(sink.modals.modal?.name).toBe("edit-project");
      await closeModal();

      await press("t");
      expect(sink.modals.modal?.name).toBe("edit-tags");
      await closeModal();

      await press("d");
      expect(sink.modals.modal?.name).toBe("delete-entry");
      await closeModal();

      await press("u");
      expect(sink.message).toBe("No recently deleted entry to undo");

      testSetup.renderer.destroy();
      globalThis.fetch = originalFetch;
    });

    it("ignores view keys while a modal is open", async () => {
      stubServer({});
      const { testSetup, sink, press } = await renderView(<TimelineView />, {
        entries: sampleEntries,
      });

      await act(async () => {
        sink.modals.open({ name: "help" });
      });
      await press("c");
      await press("d");
      await press("j");
      expect(sink.modals.modal?.name).toBe("help");

      testSetup.renderer.destroy();
      globalThis.fetch = originalFetch;
    });
  });

  describe("ProjectsView", () => {
    it("moves the selection and opens the project modals (n, P)", async () => {
      stubServer({ projects: sampleProjects });
      const { testSetup, sink, press, closeModal } = await renderView(<ProjectsView />, {
        projects: sampleProjects,
        entries: [],
      });

      await press("j");
      await press("P");
      expect(sink.modals.modal?.name).toBe("edit-project-settings");
      expect(
        sink.modals.modal?.name === "edit-project-settings" && sink.modals.modal.project.name,
      ).toBe("Beta");
      await closeModal();

      await press("k");
      await press("P");
      expect(
        sink.modals.modal?.name === "edit-project-settings" && sink.modals.modal.project.name,
      ).toBe("Alpha");
      await closeModal();

      await press("n");
      expect(sink.modals.modal?.name).toBe("new-project");

      testSetup.renderer.destroy();
      globalThis.fetch = originalFetch;
    });

    it("ignores view keys while a modal is open", async () => {
      stubServer({});
      const { testSetup, sink, press } = await renderView(<ProjectsView />, {
        projects: sampleProjects,
        entries: [],
      });

      await act(async () => {
        sink.modals.open({ name: "help" });
      });
      await press("n");
      await press("j");
      expect(sink.modals.modal?.name).toBe("help");

      testSetup.renderer.destroy();
      globalThis.fetch = originalFetch;
    });
  });

  describe("DashboardView", () => {
    it("focuses days (h/l), completes a routine (Space), and routes Enter to the timeline", async () => {
      stubServer({ dashboard: sampleDashboard, projects: sampleProjects });
      const { testSetup, sink, press } = await renderView(<DashboardView />, {
        dashboard: sampleDashboard,
        projects: sampleProjects,
      });

      await press("h");
      await act(async () => {
        testSetup.mockInput.pressEnter();
      });
      expect(sink.navigation.tab).toBe("TIMELINE");
      expect(sink.navigation.filter).toBe("2026-10-23");

      await press("l");
      await act(async () => {
        testSetup.mockInput.pressEnter();
      });
      expect(sink.navigation.filter).toBe("2026-10-24");

      await press(" ");
      expect(sink.message).toBe("Completed today's routine for @Alpha!");

      testSetup.renderer.destroy();
      globalThis.fetch = originalFetch;
    });

    it("ignores view keys while a modal is open", async () => {
      stubServer({});
      const { testSetup, sink, press } = await renderView(<DashboardView />, {
        dashboard: sampleDashboard,
        projects: sampleProjects,
      });

      await act(async () => {
        sink.modals.open({ name: "help" });
      });
      await press(" ");
      await press("h");
      expect(sink.message).not.toBe("Completed today's routine for @Alpha!");

      testSetup.renderer.destroy();
      globalThis.fetch = originalFetch;
    });

    it("polls only while the Dashboard tab is active", async () => {
      stubServer({ dashboard: sampleDashboard, projects: sampleProjects });

      const active = await renderView(<DashboardView />, {}, "DASHBOARD");
      const activeQuery = active.client.getQueryCache().find({ queryKey: queryKeys.dashboard(60) });
      expect(activeQuery?.observers[0]?.options.refetchInterval).toBe(DASHBOARD_POLL_INTERVAL_MS);
      expect(activeQuery?.observers[0]?.options.enabled).toBe(true);
      active.testSetup.renderer.destroy();

      const inactive = await renderView(<DashboardView />, {}, "TIMELINE");
      const inactiveQuery = inactive.client
        .getQueryCache()
        .find({ queryKey: queryKeys.dashboard(60) });
      expect(inactiveQuery?.observers[0]?.options.refetchInterval).toBe(false);
      expect(inactiveQuery?.observers[0]?.options.enabled).toBe(false);
      inactive.testSetup.renderer.destroy();

      globalThis.fetch = originalFetch;
    });
  });

  describe("ReflectionsView", () => {
    it("switches cadence with w, m, Q, y", async () => {
      stubServer({});
      const { testSetup, sink, press } = await renderView(<ReflectionsView />);

      await press("m");
      expect(sink.message).toBe("Monthly Reflections");

      await press("Q");
      expect(sink.message).toBe("Quarterly Reflections");

      await press("y");
      expect(sink.message).toBe("Yearly Reflections");

      await press("w");
      expect(sink.message).toBe("Weekly Reflections");

      testSetup.renderer.destroy();
      globalThis.fetch = originalFetch;
    });
  });
});
