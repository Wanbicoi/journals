import { describe, expect, it } from "bun:test";
import type { InputRenderable } from "@opentui/core";
import { testRender } from "@opentui/react/test-utils";
import { act, useState } from "react";
import { getTheme } from "../../../theme.js";
import { EditProjectModal } from "../EditProjectModal.js";
import { EditProjectSettingsModal } from "../EditProjectSettingsModal.js";
import { EditTagsModal } from "../EditTagsModal.js";
import { FilterModal } from "../FilterModal.js";
import { NewProjectModal } from "../NewProjectModal.js";
import { QuickCaptureModal } from "../QuickCaptureModal.js";

type TestSetup = Awaited<ReturnType<typeof testRender>>;

const theme = getTheme("default");

describe("Native OpenTUI Input Modals", () => {
  it("QuickCaptureModal renders native input and captures keystrokes", async () => {
    let captured = "";
    let submitted = "";

    function TestWrapper() {
      const [val, setVal] = useState("");
      return (
        <QuickCaptureModal
          width={80}
          height={20}
          inputBuffer={val}
          suggestions={null}
          activeSuggestionIdx={0}
          quickIcon=""
          theme={theme}
          onChange={(newVal) => {
            captured = newVal;
            setVal(newVal);
          }}
          onSubmit={(v) => {
            submitted = v;
          }}
        />
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(<TestWrapper />, { onDestroy: () => {} });
    });

    const input = testSetup.renderer.currentFocusedRenderable as unknown as InputRenderable;
    expect(input).toBeDefined();
    expect(input?.constructor.name).toBe("InputRenderable");

    await act(async () => {
      testSetup.mockInput.typeText("Testing quick capture @Project #tag");
    });

    expect(captured).toBe("Testing quick capture @Project #tag");

    await act(async () => {
      testSetup.mockInput.pressEnter();
    });

    expect(submitted).toBe("Testing quick capture @Project #tag");

    testSetup.renderer.destroy();
  });

  it("QuickCaptureModal supports arrow navigation and backspace natively", async () => {
    function TestWrapper() {
      const [val, setVal] = useState("hello world");
      return (
        <QuickCaptureModal
          width={80}
          height={20}
          inputBuffer={val}
          suggestions={null}
          activeSuggestionIdx={0}
          quickIcon=""
          theme={theme}
          onChange={(newVal) => {
            setVal(newVal);
          }}
        />
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(<TestWrapper />, { onDestroy: () => {} });
    });

    const input = testSetup.renderer.currentFocusedRenderable as unknown as InputRenderable;
    expect(input.plainText).toBe("hello world");

    // Move left 5 characters to position before 'world'
    await act(async () => {
      testSetup.mockInput.pressArrow("left");
      testSetup.mockInput.pressArrow("left");
      testSetup.mockInput.pressArrow("left");
      testSetup.mockInput.pressArrow("left");
      testSetup.mockInput.pressArrow("left");
    });

    expect(input.cursorOffset).toBe(6);

    // Type a word in the middle
    await act(async () => {
      testSetup.mockInput.typeText("brave ");
    });

    expect(input.plainText).toBe("hello brave world");

    // Backspace removes characters natively
    await act(async () => {
      testSetup.mockInput.pressBackspace();
    });

    expect(input.plainText).toBe("hello braveworld");

    testSetup.renderer.destroy();
  });

  it("NewProjectModal renders native input and normalizes recurrence preview", async () => {
    let captured = "";

    function TestWrapper() {
      const [val, setVal] = useState("");
      return (
        <NewProjectModal
          width={80}
          height={20}
          inputBuffer={val}
          projectIcon="📁"
          theme={theme}
          onChange={(v) => {
            captured = v;
            setVal(v);
          }}
        />
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(<TestWrapper />, { onDestroy: () => {} });
    });

    const input = testSetup.renderer.currentFocusedRenderable as unknown as InputRenderable;
    expect(input?.constructor.name).toBe("InputRenderable");

    await act(async () => {
      testSetup.mockInput.typeText("Health /every 2 days");
    });

    expect(captured).toBe("Health /every 2 days");

    testSetup.renderer.destroy();
  });

  it("EditProjectModal renders native input and suggestions", async () => {
    let submitted = "";

    function TestWrapper() {
      const [val, setVal] = useState("@Old");
      return (
        <EditProjectModal
          width={80}
          height={20}
          inputBuffer={val}
          suggestions={{ type: "project", matches: ["Inbox", "Work"] }}
          activeSuggestionIdx={0}
          projectIcon="📁"
          theme={theme}
          onChange={(v) => setVal(v)}
          onSubmit={(v) => {
            submitted = v;
          }}
        />
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(<TestWrapper />, { onDestroy: () => {} });
    });

    const input = testSetup.renderer.currentFocusedRenderable as unknown as InputRenderable;
    expect(input?.constructor.name).toBe("InputRenderable");
    expect(input.plainText).toBe("@Old");

    await act(async () => {
      testSetup.mockInput.pressEnter();
    });

    expect(submitted).toBe("@Old");

    testSetup.renderer.destroy();
  });

  it("EditProjectSettingsModal renders native input", async () => {
    let captured = "";

    function TestWrapper() {
      const [val, setVal] = useState("fitness /every weekday");
      return (
        <EditProjectSettingsModal
          width={80}
          height={20}
          projectName="fitness"
          inputBuffer={val}
          projectIcon="📁"
          theme={theme}
          onChange={(v) => {
            captured = v;
            setVal(v);
          }}
        />
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(<TestWrapper />, { onDestroy: () => {} });
    });

    const input = testSetup.renderer.currentFocusedRenderable as unknown as InputRenderable;
    expect(input?.constructor.name).toBe("InputRenderable");
    expect(input.plainText).toBe("fitness /every weekday");

    await act(async () => {
      testSetup.mockInput.typeText(" /policy:spike");
    });

    expect(captured).toBe("fitness /every weekday /policy:spike");

    testSetup.renderer.destroy();
  });

  it("EditTagsModal renders native input", async () => {
    let captured = "";

    function TestWrapper() {
      const [val, setVal] = useState("alpha, beta");
      return (
        <EditTagsModal
          width={80}
          height={20}
          inputBuffer={val}
          suggestions={null}
          activeSuggestionIdx={0}
          tagIcon="🏷"
          theme={theme}
          onChange={(v) => {
            captured = v;
            setVal(v);
          }}
        />
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(<TestWrapper />, { onDestroy: () => {} });
    });

    const input = testSetup.renderer.currentFocusedRenderable as unknown as InputRenderable;
    expect(input?.constructor.name).toBe("InputRenderable");
    expect(input.plainText).toBe("alpha, beta");

    await act(async () => {
      testSetup.mockInput.typeText(", gamma");
    });

    expect(captured).toBe("alpha, beta, gamma");

    testSetup.renderer.destroy();
  });

  it("FilterModal renders native input and submits filter query", async () => {
    let submitted = "";

    function TestWrapper() {
      const [val, setVal] = useState("");
      return (
        <FilterModal
          width={80}
          height={20}
          inputBuffer={val}
          tabTitle="Timeline"
          theme={theme}
          onChange={(v) => setVal(v)}
          onSubmit={(v) => {
            submitted = v;
          }}
        />
      );
    }

    let testSetup!: TestSetup;
    await act(async () => {
      testSetup = await testRender(<TestWrapper />, { onDestroy: () => {} });
    });

    const input = testSetup.renderer.currentFocusedRenderable as unknown as InputRenderable;
    expect(input?.constructor.name).toBe("InputRenderable");

    await act(async () => {
      testSetup.mockInput.typeText("tag:important");
      testSetup.mockInput.pressEnter();
    });

    expect(submitted).toBe("tag:important");

    testSetup.renderer.destroy();
  });
});
