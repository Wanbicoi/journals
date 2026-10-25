import { describe, expect, it } from "bun:test";
import { PLAIN_ICONS, type ReflectionPeriodType } from "@journals/core";
import { testRender } from "@opentui/react/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, useState } from "react";
import type { DashboardData, Entry, Project } from "../../hooks/useJournalData.js";
import { createQueryClient } from "../../queryClient.js";
import { getTheme } from "../../theme.js";
import { DashboardView } from "../dashboard/DashboardView.js";
import { ProjectsView } from "../projects/ProjectsView.js";
import { ReflectionsView } from "../reflections/ReflectionsView.js";
import { TimelineView } from "../timeline/TimelineView.js";

type TestSetup = Awaited<ReturnType<typeof testRender>>;

const theme = getTheme("default");
const icons = PLAIN_ICONS;

const sampleEntries: Entry[] = [
  {
    id: "entry-1",
    projectId: "proj-1",
    content: "First note",
    createdAt: Date.now() - 86400000 * 2, // 2 days ago
    tags: ["feature"],
    projectName: "Alpha",
    breakDays: 0,
  },
  {
    id: "entry-2",
    projectId: "proj-2",
    content: "Second note",
    createdAt: Date.now() - 86400000, // yesterday
    tags: ["bug"],
    projectName: "Beta",
    breakDays: 0,
  },
  {
    id: "entry-3",
    projectId: "proj-1",
    content: "Third note today",
    createdAt: Date.now(), // today
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

describe("Collocated View Keymaps", () => {
  describe("TimelineView", () => {
    it("handles navigation (j/k, g/G) and date jumps ([ / ]) locally", async () => {
      let selectedIdx = 0;
      let statusMsg = "";

      function Wrapper() {
        const [idx, setIdx] = useState(0);
        return (
          <TimelineView
            entries={sampleEntries}
            selectedEntryIdx={idx}
            onSelectEntry={(newIdx) => {
              selectedIdx = newIdx;
              setIdx(newIdx);
            }}
            filterQuery=""
            quickCaptureKey="c"
            icons={icons}
            theme={theme}
            isActive={true}
            onStatusMessage={(m) => {
              statusMsg = m;
            }}
          />
        );
      }

      let testSetup!: TestSetup;
      await act(async () => {
        testSetup = await testRender(<Wrapper />, { onDestroy: () => {} });
      });

      // Press j -> move down
      await act(async () => {
        testSetup.mockInput.pressKey("j");
      });
      expect(selectedIdx).toBe(1);

      // Press k -> move up
      await act(async () => {
        testSetup.mockInput.pressKey("k");
      });
      expect(selectedIdx).toBe(0);

      // Press G -> jump to bottom
      await act(async () => {
        testSetup.mockInput.pressKey("G");
      });
      expect(selectedIdx).toBe(2);

      // Press g -> jump to top
      await act(async () => {
        testSetup.mockInput.pressKey("g");
      });
      expect(selectedIdx).toBe(0);

      // Press ] -> jump to next day
      await act(async () => {
        testSetup.mockInput.pressKey("]");
      });
      expect(selectedIdx).toBe(1);
      expect(statusMsg).toContain("Jumped to");

      // Press [ -> jump to prev day
      await act(async () => {
        testSetup.mockInput.pressKey("[");
      });
      expect(selectedIdx).toBe(0);
      expect(statusMsg).toContain("Jumped to");

      // Press T -> jump to today
      await act(async () => {
        testSetup.mockInput.pressKey("T");
      });
      expect(selectedIdx).toBe(2);
      expect(statusMsg).toContain("Jumped to Today");

      testSetup.renderer.destroy();
    });

    it("triggers entry action callbacks (c, e, p, t, d, u)", async () => {
      let captureTriggered = false;
      let editContentEntry: Entry | null = null;
      let editProjectEntry: Entry | null = null;
      let editTagsEntry: Entry | null = null;
      let deleteEntryCalled: Entry | null = null;
      let undoCalled = false;

      function Wrapper() {
        return (
          <TimelineView
            entries={sampleEntries}
            selectedEntryIdx={1}
            filterQuery=""
            quickCaptureKey="c"
            icons={icons}
            theme={theme}
            isActive={true}
            onQuickCapture={() => {
              captureTriggered = true;
            }}
            onEditContent={(entry) => {
              editContentEntry = entry;
            }}
            onEditProject={(entry) => {
              editProjectEntry = entry;
            }}
            onEditTags={(entry) => {
              editTagsEntry = entry;
            }}
            onDeleteEntry={(entry) => {
              deleteEntryCalled = entry;
            }}
            onUndoDelete={() => {
              undoCalled = true;
            }}
          />
        );
      }

      let testSetup!: TestSetup;
      await act(async () => {
        testSetup = await testRender(<Wrapper />, { onDestroy: () => {} });
      });

      await act(async () => {
        testSetup.mockInput.pressKey("c");
      });
      expect(captureTriggered).toBe(true);

      await act(async () => {
        testSetup.mockInput.pressKey("e");
      });
      expect((editContentEntry as Entry | null)?.id).toBe("entry-2");

      await act(async () => {
        testSetup.mockInput.pressKey("p");
      });
      expect((editProjectEntry as Entry | null)?.id).toBe("entry-2");

      await act(async () => {
        testSetup.mockInput.pressKey("t");
      });
      expect((editTagsEntry as Entry | null)?.id).toBe("entry-2");

      await act(async () => {
        testSetup.mockInput.pressKey("d");
      });
      expect((deleteEntryCalled as Entry | null)?.id).toBe("entry-2");

      await act(async () => {
        testSetup.mockInput.pressKey("u");
      });
      expect(undoCalled).toBe(true);

      testSetup.renderer.destroy();
    });

    it("ignores all keys when isActive is false", async () => {
      let actionFired = false;

      function Wrapper() {
        return (
          <TimelineView
            entries={sampleEntries}
            selectedEntryIdx={0}
            filterQuery=""
            quickCaptureKey="c"
            icons={icons}
            theme={theme}
            isActive={false}
            onQuickCapture={() => {
              actionFired = true;
            }}
            onDeleteEntry={() => {
              actionFired = true;
            }}
          />
        );
      }

      let testSetup!: TestSetup;
      await act(async () => {
        testSetup = await testRender(<Wrapper />, { onDestroy: () => {} });
      });

      await act(async () => {
        testSetup.mockInput.pressKey("c");
        testSetup.mockInput.pressKey("d");
        testSetup.mockInput.pressKey("j");
      });

      expect(actionFired).toBe(false);
      testSetup.renderer.destroy();
    });
  });

  describe("ProjectsView", () => {
    it("handles navigation (j/k) and action modal triggers (n, P, o)", async () => {
      let selectedIdx = 0;
      let newProjectTriggered = false;
      let editSettingsProject: Project | null = null;
      let openEditorProject: Project | null = null;

      function Wrapper() {
        const [idx, setIdx] = useState(0);
        return (
          <ProjectsView
            projects={sampleProjects}
            selectedProjectIdx={idx}
            onSelectProject={(newIdx) => {
              selectedIdx = newIdx;
              setIdx(newIdx);
            }}
            entries={[]}
            width={80}
            icons={icons}
            theme={theme}
            isActive={true}
            onNewProject={() => {
              newProjectTriggered = true;
            }}
            onEditProjectSettings={(proj) => {
              editSettingsProject = proj;
            }}
            onOpenEditor={(proj) => {
              openEditorProject = proj;
            }}
          />
        );
      }

      let testSetup!: TestSetup;
      await act(async () => {
        testSetup = await testRender(<Wrapper />, { onDestroy: () => {} });
      });

      // Press j -> select next project
      await act(async () => {
        testSetup.mockInput.pressKey("j");
      });
      expect(selectedIdx).toBe(1);

      // Press k -> select previous project
      await act(async () => {
        testSetup.mockInput.pressKey("k");
      });
      expect(selectedIdx).toBe(0);

      // Press n -> new project
      await act(async () => {
        testSetup.mockInput.pressKey("n");
      });
      expect(newProjectTriggered).toBe(true);

      // Press P -> edit project routine settings
      await act(async () => {
        testSetup.mockInput.pressKey("P");
      });
      expect((editSettingsProject as Project | null)?.name).toBe("Alpha");

      // Press o -> open editor
      await act(async () => {
        testSetup.mockInput.pressKey("o");
      });
      expect((openEditorProject as Project | null)?.name).toBe("Alpha");

      testSetup.renderer.destroy();
    });

    it("ignores all keys when isActive is false", async () => {
      let newProj = false;

      function Wrapper() {
        return (
          <ProjectsView
            projects={sampleProjects}
            selectedProjectIdx={0}
            entries={[]}
            width={80}
            icons={icons}
            theme={theme}
            isActive={false}
            onNewProject={() => {
              newProj = true;
            }}
          />
        );
      }

      let testSetup!: TestSetup;
      await act(async () => {
        testSetup = await testRender(<Wrapper />, { onDestroy: () => {} });
      });

      await act(async () => {
        testSetup.mockInput.pressKey("n");
        testSetup.mockInput.pressKey("j");
      });

      expect(newProj).toBe(false);
      testSetup.renderer.destroy();
    });
  });

  describe("DashboardView", () => {
    it("handles focus navigation (h/l), routine toggle (Space), and date jump (Enter)", async () => {
      let focusedIdx = 1;
      let completedRoutine = false;
      let navigatedDate = "";

      function Wrapper() {
        const [idx, setIdx] = useState(1);
        return (
          <DashboardView
            dashboard={sampleDashboard}
            projects={sampleProjects}
            focusedDayIdx={idx}
            onFocusDayIdx={(newIdx) => {
              focusedIdx = newIdx;
              setIdx(newIdx);
            }}
            onNavigateDate={(d) => {
              navigatedDate = d;
            }}
            onQuickCapture={async () => {
              completedRoutine = true;
            }}
            icons={icons}
            theme={theme}
            quickCaptureKey="c"
            isActive={true}
          />
        );
      }

      let testSetup!: TestSetup;
      await act(async () => {
        testSetup = await testRender(<Wrapper />, { onDestroy: () => {} });
      });

      // Press h -> move focus left
      await act(async () => {
        testSetup.mockInput.pressKey("h");
      });
      expect(focusedIdx).toBe(0);

      // Press l -> move focus right
      await act(async () => {
        testSetup.mockInput.pressKey("l");
      });
      expect(focusedIdx).toBe(1);

      // Press Space -> check off today routine
      await act(async () => {
        testSetup.mockInput.pressKey(" ");
      });
      expect(completedRoutine).toBe(true);

      // Press Enter -> jump to date of focused day
      await act(async () => {
        testSetup.mockInput.pressEnter();
      });
      expect(navigatedDate).toBe("2026-10-24");

      testSetup.renderer.destroy();
    });

    it("ignores all keys when isActive is false", async () => {
      let completed = false;

      function Wrapper() {
        return (
          <DashboardView
            dashboard={sampleDashboard}
            projects={sampleProjects}
            focusedDayIdx={0}
            onNavigateDate={() => {}}
            onQuickCapture={async () => {
              completed = true;
            }}
            icons={icons}
            theme={theme}
            quickCaptureKey="c"
            isActive={false}
          />
        );
      }

      let testSetup!: TestSetup;
      await act(async () => {
        testSetup = await testRender(<Wrapper />, { onDestroy: () => {} });
      });

      await act(async () => {
        testSetup.mockInput.pressKey(" ");
        testSetup.mockInput.pressEnter();
      });

      expect(completed).toBe(false);
      testSetup.renderer.destroy();
    });
  });

  describe("ReflectionsView", () => {
    it("handles cadence switching (w, m, q, y) and editor trigger (e, Enter)", async () => {
      const qc = createQueryClient();
      let currentPeriodType = "WEEK";
      let status = "";
      let editorTriggered = false;

      function Wrapper() {
        const [pt, setPt] = useState<ReflectionPeriodType>("WEEK");
        return (
          <QueryClientProvider client={qc}>
            <ReflectionsView
              periodType={pt}
              onChangePeriodType={(newPt) => {
                currentPeriodType = newPt;
                setPt(newPt);
              }}
              selectedPeriodIdx={0}
              onSelectPeriodIdx={() => {}}
              width={80}
              icons={icons}
              theme={theme}
              isActive={true}
              onStatusMessage={(m) => {
                status = m;
              }}
              onOpenEditor={() => {
                editorTriggered = true;
              }}
            />
          </QueryClientProvider>
        );
      }

      let testSetup!: TestSetup;
      await act(async () => {
        testSetup = await testRender(<Wrapper />, { onDestroy: () => {} });
      });

      // Press m -> Monthly
      await act(async () => {
        testSetup.mockInput.pressKey("m");
      });
      expect(currentPeriodType).toBe("MONTH");
      expect(status).toBe("Monthly Reflections");

      // Press q -> Quarterly
      await act(async () => {
        testSetup.mockInput.pressKey("q");
      });
      expect(currentPeriodType).toBe("QUARTER");
      expect(status).toBe("Quarterly Reflections");

      // Press y -> Yearly
      await act(async () => {
        testSetup.mockInput.pressKey("y");
      });
      expect(currentPeriodType).toBe("YEAR");
      expect(status).toBe("Yearly Reflections");

      // Press w -> Weekly
      await act(async () => {
        testSetup.mockInput.pressKey("w");
      });
      expect(currentPeriodType).toBe("WEEK");
      expect(status).toBe("Weekly Reflections");

      // Press e -> Open editor
      await act(async () => {
        testSetup.mockInput.pressKey("e");
      });
      expect(editorTriggered).toBe(true);

      editorTriggered = false;
      // Press Enter -> Open editor
      await act(async () => {
        testSetup.mockInput.pressEnter();
      });
      expect(editorTriggered).toBe(true);

      testSetup.renderer.destroy();
    });
  });
});
