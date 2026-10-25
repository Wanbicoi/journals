import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import type { Entry, Project, TagInfo } from "../../../hooks/useJournalData.js";
import { TestProviders } from "../../../test-support/TestProviders.js";
import { ActiveModal } from "../ActiveModal.js";
import { useModalManager } from "../useModalManager.js";

type TestSetup = Awaited<ReturnType<typeof testRender>>;
const dummyProjects: Project[] = [
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

const dummyTags: TagInfo[] = [
  { name: "work", count: 5 },
  { name: "ideas", count: 2 },
];

const dummyEntry: Entry = {
  id: "e1",
  projectId: "p1",
  projectName: "Alpha",
  content: "Test note content",
  tags: ["work"],
  breakDays: 0,
  createdAt: Date.now(),
};

describe("ActiveModal Dispatcher & useModalManager", () => {
  it("renders null when inputMode is NONE", async () => {
    let managerInstance!: ReturnType<typeof useModalManager>;

    function TestWrapper() {
      const modal = useModalManager({
        projects: dummyProjects,
        tags: dummyTags,
        currentTab: "TIMELINE",
      });
      managerInstance = modal;

      return <ActiveModal modal={modal} width={80} height={24} currentTab="TIMELINE" />;
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(
        <TestProviders>
          <TestWrapper />
        </TestProviders>,
        { onDestroy: () => {} },
      );
    });

    expect(managerInstance.isOpen).toBe(false);
    expect(managerInstance.inputMode).toBe("NONE");
    expect(testSetup.renderer.currentFocusedRenderable).toBeNull();
    testSetup.renderer.destroy();
  });

  it("renders QuickCaptureModal when inputMode is CAPTURE", async () => {
    let managerInstance!: ReturnType<typeof useModalManager>;

    function TestWrapper() {
      const modal = useModalManager({
        projects: dummyProjects,
        tags: dummyTags,
        currentTab: "TIMELINE",
      });

      managerInstance = modal;
      return <ActiveModal modal={modal} width={80} height={24} currentTab="TIMELINE" />;
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(
        <TestProviders>
          <TestWrapper />
        </TestProviders>,
        { onDestroy: () => {} },
      );
    });

    await act(async () => {
      managerInstance.openCapture();
    });

    expect(managerInstance.isOpen).toBe(true);
    expect(managerInstance.inputMode).toBe("CAPTURE");
    expect(testSetup.renderer.currentFocusedRenderable).toBeDefined();
    expect(testSetup.renderer.currentFocusedRenderable?.constructor.name).toBe("InputRenderable");
    testSetup.renderer.destroy();
  });

  it("renders DeleteConfirmModal when DELETE_CONFIRM is active and handles confirm", async () => {
    let deletedId = "";
    let managerInstance!: ReturnType<typeof useModalManager>;

    function TestWrapper() {
      const modal = useModalManager({
        projects: dummyProjects,
        tags: dummyTags,
        currentTab: "TIMELINE",
        selectedEntry: dummyEntry,
        deleteEntry: async (id) => {
          deletedId = id;
        },
      });

      managerInstance = modal;
      return (
        <ActiveModal
          modal={modal}
          width={80}
          height={24}
          selectedEntry={dummyEntry}
          currentTab="TIMELINE"
        />
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(
        <TestProviders>
          <TestWrapper />
        </TestProviders>,
        { onDestroy: () => {} },
      );
    });

    await act(async () => {
      managerInstance.openDeleteConfirm();
    });

    expect(managerInstance.isOpen).toBe(true);
    expect(managerInstance.inputMode).toBe("DELETE_CONFIRM");

    // Press 'y' to confirm delete
    await act(async () => {
      testSetup.mockInput.pressKey("y");
    });

    expect(deletedId).toBe("e1");
    expect(managerInstance.isOpen).toBe(false);
    expect(managerInstance.inputMode).toBe("NONE");

    testSetup.renderer.destroy();
  });

  it("parses and commits new project creation", async () => {
    let createdName = "";
    let createdRecur: string | null | undefined;
    let createdPolicy: string | undefined;

    let managerInstance!: ReturnType<typeof useModalManager>;

    function TestWrapper() {
      const modal = useModalManager({
        projects: dummyProjects,
        tags: dummyTags,
        currentTab: "PROJECTS",
        createProject: async (name, recurrence, policy) => {
          createdName = name;
          createdRecur = recurrence;
          createdPolicy = policy;
        },
      });

      managerInstance = modal;
      return <ActiveModal modal={modal} width={80} height={24} currentTab="PROJECTS" />;
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(
        <TestProviders>
          <TestWrapper />
        </TestProviders>,
        { onDestroy: () => {} },
      );
    });

    await act(async () => {
      managerInstance.openNewProject();
    });

    expect(managerInstance.isOpen).toBe(true);
    expect(managerInstance.inputMode).toBe("NEW_PROJECT");

    await act(async () => {
      await managerInstance.commitModalInput("Reading /recur:FREQ=DAILY /policy:accumulate");
    });

    expect(createdName).toBe("Reading");
    expect(createdRecur as string | null).toBe("FREQ=DAILY");
    expect(createdPolicy as string).toBe("accumulate");
    expect(managerInstance.isOpen).toBe(false);
    expect(managerInstance.inputMode).toBe("NONE");

    testSetup.renderer.destroy();
  });

  it("parses and commits filter queries for timeline and projects", async () => {
    let timelineQuery = "";
    let projectsQuery = "";
    let currentTab: "TIMELINE" | "PROJECTS" = "TIMELINE";
    let managerInstance!: ReturnType<typeof useModalManager>;

    function TestWrapper() {
      const modal = useModalManager({
        projects: dummyProjects,
        tags: dummyTags,
        currentTab,
        onTimelineFilterChange: (q) => {
          timelineQuery = q;
        },
        onProjectsFilterChange: (q) => {
          projectsQuery = q;
        },
      });

      managerInstance = modal;
      return <ActiveModal modal={modal} width={80} height={24} currentTab={currentTab} />;
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(
        <TestProviders>
          <TestWrapper />
        </TestProviders>,
        { onDestroy: () => {} },
      );
    });

    await act(async () => {
      managerInstance.openFilter();
    });

    await act(async () => {
      await managerInstance.commitModalInput("@Alpha");
    });

    expect(timelineQuery).toBe("@Alpha");

    // Now test projects tab filter
    currentTab = "PROJECTS";
    await act(async () => {
      managerInstance.openFilter();
    });
    await act(async () => {
      await managerInstance.commitModalInput("Beta");
    });
    expect(projectsQuery).toBe("Beta");

    testSetup.renderer.destroy();
  });

  it("handles suggestions for projects and tags in capture mode", async () => {
    let managerInstance!: ReturnType<typeof useModalManager>;

    function TestWrapper() {
      const modal = useModalManager({
        projects: dummyProjects,
        tags: dummyTags,
        currentTab: "TIMELINE",
      });

      managerInstance = modal;
      return <ActiveModal modal={modal} width={80} height={24} currentTab="TIMELINE" />;
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(
        <TestProviders>
          <TestWrapper />
        </TestProviders>,
        { onDestroy: () => {} },
      );
    });

    await act(async () => {
      managerInstance.openCapture();
    });

    await act(async () => {
      managerInstance.setInputBuffer("Quick note @Al");
    });

    expect(managerInstance.suggestions).not.toBeNull();
    expect(managerInstance.suggestions?.type).toBe("project");
    expect(managerInstance.suggestions?.matches).toEqual(["Alpha"]);

    await act(async () => {
      managerInstance.setInputBuffer("Quick note #wo");
    });

    expect(managerInstance.suggestions?.type).toBe("tag");
    expect(managerInstance.suggestions?.matches).toEqual(["work"]);

    testSetup.renderer.destroy();
  });
});
