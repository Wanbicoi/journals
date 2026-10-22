#!/usr/bin/env node
/**
 * PROTOTYPE: Updated Journal TUI Prototype
 * Testing user specifications:
 * - Config-driven keymaps, options, and Nerd Font icons
 * - 1-line quick capture with inline @project and #tags syntax
 * - Daily grouped continuous stream (full content, no truncation)
 * - 'p' to edit/reassign project, 't' to edit tags
 * - 'P' to open Projects View with Markdown preview and inline content edit
 * - Full ANSI rendering with Nerd Font fallback
 *
 * Run directly with:
 *   node prototype-journal-v2.mjs
 */

import readline from "node:readline";

// ======================== CONFIG & KEYMAPS ========================
const config = {
  appearance: {
    use_nerd_font: true,
    theme: "nord",
  },
  icons: {
    nerd: {
      journal: "",
      project: "",
      tag: "",
      calendar: "",
      quick: "",
      checked: "",
      unchecked: "",
      bullet: "",
    },
    plain: {
      journal: "◆",
      project: "◫",
      tag: "#",
      calendar: "📅",
      quick: "⚡",
      checked: "[x]",
      unchecked: "[ ]",
      bullet: "•",
    },
  },
  keymaps: {
    up: "k",
    down: "j",
    quick_capture: "n",
    edit_project: "p",
    edit_tags: "t",
    view_timeline: "1",
    view_projects: "2",
    edit_project_content: "e",
    quit: "q",
    cancel: "escape",
  },
  defaults: {
    project: "Inbox",
    tags: ["quick"],
  },
};

const icons = config.appearance.use_nerd_font ? config.icons.nerd : config.icons.plain;

// ======================== MOCK STATE ========================
let projects = [
  {
    id: "p1",
    name: "Inbox",
    content: "# Inbox\nDefault repository for ad-hoc thoughts and quick captures.\nTriage weekly.",
    createdAt: "2026-10-15",
  },
  {
    id: "p2",
    name: "Journals CLI",
    content:
      "# Journals CLI\nClient-server journal with OpenTUI and SQLite.\n- [x] Stream view prototype\n- [ ] Fastify/Hono backend\n- [ ] Biome pre-commit hooks",
    createdAt: "2026-10-20",
  },
  {
    id: "p3",
    name: "Work",
    content: "# Work\nOperations and daily work logs.",
    createdAt: "2026-10-18",
  },
];

let entries = [
  {
    id: "e1",
    projectName: "Journals CLI",
    date: "2026-10-22 07:15",
    day: "2026-10-22",
    tags: ["architecture", "tui"],
    content: `Finalized view specs:
- Stream view grouped by date
- Full content displayed without truncation
- 1-line capture with @project and #tag tokens`,
  },
  {
    id: "e2",
    projectName: "Journals CLI",
    date: "2026-10-22 06:40",
    day: "2026-10-22",
    tags: ["sqlite", "drizzle"],
    content: `Validated Drizzle ORM schema for SQLite.
Cascade updates on tags allow instant global renaming.`,
  },
  {
    id: "e3",
    projectName: "Inbox",
    date: "2026-10-21 18:30",
    day: "2026-10-21",
    tags: ["idea"],
    content: `Remember to benchmark Hono RPC client vs standard fetch.
RPC gives end-to-end type safety directly with zero codegen!`,
  },
  {
    id: "e4",
    projectName: "Work",
    date: "2026-10-20 14:10",
    day: "2026-10-20",
    tags: ["ops"],
    content: `Set up local NixOS dev environment with pnpm workspaces.`,
  },
];

let currentMode = "STREAM"; // "STREAM" | "CAPTURE" | "EDIT_PROJECT" | "EDIT_TAGS" | "PROJECTS_VIEW" | "EDIT_PROJECT_CONTENT"
let selectedEntryIndex = 0;
let selectedProjectIndex = 0;
let inputBuffer = "";
let statusMessage = `[${config.keymaps.view_timeline}] Timeline | [${config.keymaps.view_projects}] Projects | [${config.keymaps.quick_capture}] Quick Capture | [${config.keymaps.quit}] Quit`;

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  inverse: "\x1b[7m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgBlue: "\x1b[44m\x1b[37m",
  clearScreen: "\x1b[2J\x1b[H",
};

// ======================== PARSER FOR 1-LINE CAPTURE ========================
// Extracts text, @project, and #tags from a single line
function parseQuickCaptureLine(input) {
  const tokens = input.trim().split(/\s+/);
  let projectName = config.defaults.project;
  const tags = [];
  const textWords = [];

  for (const token of tokens) {
    if (token.startsWith("@") && token.length > 1) {
      projectName = token.slice(1);
    } else if (token.startsWith("#") && token.length > 1) {
      tags.push(token.slice(1));
    } else {
      textWords.push(token);
    }
  }

  return {
    content: textWords.join(" "),
    projectName,
    tags: tags.length > 0 ? tags : config.defaults.tags,
  };
}

// ======================== RENDERING ========================
function render() {
  const width = process.stdout.columns || 100;
  const height = process.stdout.rows || 30;

  process.stdout.write(ANSI.clearScreen);

  // Top Bar
  const title = `${ANSI.bold}${ANSI.cyan}${icons.journal} JOURNALS${ANSI.reset}`;
  const tabs = [
    currentMode !== "PROJECTS_VIEW" && currentMode !== "EDIT_PROJECT_CONTENT"
      ? `${ANSI.bgBlue} [1] Timeline Stream ${ANSI.reset}`
      : ` ${ANSI.dim}[1] Timeline${ANSI.reset} `,
    currentMode === "PROJECTS_VIEW" || currentMode === "EDIT_PROJECT_CONTENT"
      ? `${ANSI.bgCyan} [2] Projects & Preview ${ANSI.reset}`
      : ` ${ANSI.dim}[2] Projects${ANSI.reset} `,
  ].join(" ");
  console.log(`${title}  ${tabs}\n${ANSI.gray}${"─".repeat(width)}${ANSI.reset}`);

  if (currentMode === "PROJECTS_VIEW" || currentMode === "EDIT_PROJECT_CONTENT") {
    renderProjectsView(width, height);
  } else {
    renderStreamView(width, height);
  }

  // Modals / Input overlays
  if (currentMode === "CAPTURE") {
    renderCaptureModal(width);
  } else if (currentMode === "EDIT_PROJECT") {
    renderEditProjectPrompt(width);
  } else if (currentMode === "EDIT_TAGS") {
    renderEditTagsPrompt(width);
  } else if (currentMode === "EDIT_PROJECT_CONTENT") {
    renderEditProjectContentPrompt(width);
  }

  // Bottom Status Bar
  console.log(`${ANSI.gray}${"─".repeat(width)}${ANSI.reset}`);
  console.log(`${ANSI.dim}${statusMessage}${ANSI.reset}`);
}

function renderStreamView(width) {
  // Group entries by day
  const grouped = new Map();
  entries.forEach((e) => {
    if (!grouped.has(e.day)) grouped.set(e.day, []);
    grouped.get(e.day).push(e);
  });

  let globalIndex = 0;

  for (const [day, dayEntries] of grouped.entries()) {
    console.log(`${ANSI.bold}${ANSI.yellow}${icons.calendar} ${day}${ANSI.reset}`);

    for (const item of dayEntries) {
      const isSel = globalIndex === selectedEntryIndex;
      const border = isSel ? ANSI.cyan : ANSI.gray;
      const selector = isSel ? `${ANSI.bgCyan} SELECTED ${ANSI.reset}` : ``;

      console.log(
        `${border}┌──${ANSI.reset} ${selector} ${ANSI.dim}${item.date.slice(11)}${ANSI.reset} ` +
          `${ANSI.blue}${icons.project} @${item.projectName}${ANSI.reset} ` +
          item.tags.map((t) => `${ANSI.magenta}${icons.tag} #${t}${ANSI.reset}`).join(" "),
      );

      // Render full content without truncation
      const lines = item.content.split("\n");
      for (const line of lines) {
        let formatted = line;
        if (line.startsWith("- [x]"))
          formatted = `${ANSI.green}${icons.checked}${ANSI.reset} ${line.slice(5)}`;
        else if (line.startsWith("- [ ]"))
          formatted = `${ANSI.gray}${icons.unchecked}${ANSI.reset} ${line.slice(5)}`;
        else if (line.startsWith("-"))
          formatted = `${ANSI.cyan}${icons.bullet}${ANSI.reset} ${line.slice(1)}`;
        console.log(`${border}│${ANSI.reset}  ${formatted}`);
      }

      console.log(`${border}└───${ANSI.reset}`);
      globalIndex++;
    }
    console.log("");
  }
}

function renderProjectsView(width, height) {
  const leftW = 28;
  const rightW = width - leftW - 3;
  const selProj = projects[selectedProjectIndex] || projects[0];

  const leftLines = [
    `${ANSI.bold}${ANSI.cyan}${icons.project} PROJECTS${ANSI.reset}`,
    `${ANSI.gray}${"─".repeat(leftW - 2)}${ANSI.reset}`,
  ];

  projects.forEach((p, idx) => {
    const isSel = idx === selectedProjectIndex;
    const noteCount = entries.filter(
      (e) => e.projectName.toLowerCase() === p.name.toLowerCase(),
    ).length;
    const text = `${p.name} (${noteCount})`;
    if (isSel) {
      leftLines.push(`${ANSI.inverse}${ANSI.cyan}❯ ${text.padEnd(leftW - 4)}${ANSI.reset}`);
    } else {
      leftLines.push(`  ${text}`);
    }
  });

  const rightLines = [
    `${ANSI.bold}${ANSI.yellow}Preview & Content: ${selProj.name}${ANSI.reset}`,
    `${ANSI.gray}${"─".repeat(rightW)}${ANSI.reset}`,
    ...selProj.content.split("\n").map((l) => {
      if (l.startsWith("#")) return `${ANSI.bold}${ANSI.cyan}${l}${ANSI.reset}`;
      if (l.startsWith("- [x]")) return `${ANSI.green}${icons.checked}${ANSI.reset} ${l.slice(5)}`;
      if (l.startsWith("- [ ]")) return `${ANSI.gray}${icons.unchecked}${ANSI.reset} ${l.slice(5)}`;
      if (l.startsWith("-")) return `${ANSI.cyan}${icons.bullet}${ANSI.reset} ${l.slice(1)}`;
      return l;
    }),
    "",
    `${ANSI.gray}${"─".repeat(rightW)}${ANSI.reset}`,
    `${ANSI.dim}Associated Notes in @${selProj.name}:${ANSI.reset}`,
    ...entries
      .filter((e) => e.projectName.toLowerCase() === selProj.name.toLowerCase())
      .map(
        (e) =>
          `• ${ANSI.gray}${e.date}${ANSI.reset} ${e.content.split("\n")[0].slice(0, rightW - 25)}`,
      ),
  ];

  const maxRows = Math.max(leftLines.length, rightLines.length, 12);
  for (let i = 0; i < maxRows; i++) {
    const left = (leftLines[i] || "").padEnd(leftW);
    const right = rightLines[i] || "";
    console.log(`${left} ${ANSI.gray}│${ANSI.reset} ${right}`);
  }
}

function renderCaptureModal(width) {
  console.log(
    `${ANSI.cyan}┌─ ${icons.quick} 1-LINE QUICK CAPTURE ──────────────────────────────────────────┐${ANSI.reset}`,
  );
  console.log(
    `${ANSI.cyan}│${ANSI.reset} Syntax: Note text ${ANSI.blue}@project${ANSI.reset} ${ANSI.magenta}#tag1 #tag2${ANSI.reset}`,
  );
  console.log(`${ANSI.cyan}│${ANSI.reset} > ${ANSI.bold}${inputBuffer}█${ANSI.reset}`);
  const parsed = parseQuickCaptureLine(inputBuffer);
  console.log(
    `${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}Preview -> Text: "${parsed.content}" | Project: @${parsed.projectName} | Tags: ${parsed.tags.map((t) => "#" + t).join(" ")}${ANSI.reset}`,
  );
  console.log(
    `${ANSI.cyan}└─────────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  );
}

function renderEditProjectPrompt(width) {
  const current = entries[selectedEntryIndex]?.projectName || "";
  console.log(
    `${ANSI.blue}┌─ Reassign Project [Currently: @${current}] ──────────────────────┐${ANSI.reset}`,
  );
  console.log(
    `${ANSI.blue}│${ANSI.reset} Enter new project name: @${ANSI.bold}${inputBuffer}█${ANSI.reset}`,
  );
  console.log(
    `${ANSI.blue}└─────────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  );
}

function renderEditTagsPrompt(width) {
  const current = entries[selectedEntryIndex]?.tags.join(", ") || "";
  console.log(
    `${ANSI.magenta}┌─ Edit Tags [Currently: ${current}] ──────────────────────────────┐${ANSI.reset}`,
  );
  console.log(
    `${ANSI.magenta}│${ANSI.reset} Enter comma-separated tags: ${ANSI.bold}${inputBuffer}█${ANSI.reset}`,
  );
  console.log(
    `${ANSI.magenta}└─────────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  );
}

function renderEditProjectContentPrompt(width) {
  const sel = projects[selectedProjectIndex];
  console.log(
    `${ANSI.yellow}┌─ Append / Edit Markdown Content for @${sel.name} ───────────────────┐${ANSI.reset}`,
  );
  console.log(
    `${ANSI.yellow}│${ANSI.reset} Type text to append to markdown body: ${ANSI.bold}${inputBuffer}█${ANSI.reset}`,
  );
  console.log(
    `${ANSI.yellow}└─────────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  );
}

// ======================== INPUT HANDLING ========================
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on("keypress", (str, key) => {
  if (key.ctrl && key.name === "c") {
    cleanupAndExit();
  }

  // --- MODAL INPUT MODES (Typing text into inputBuffer) ---
  if (["CAPTURE", "EDIT_PROJECT", "EDIT_TAGS", "EDIT_PROJECT_CONTENT"].includes(currentMode)) {
    if (key.name === "return") {
      commitInput();
    } else if (key.name === "escape") {
      currentMode = currentMode === "EDIT_PROJECT_CONTENT" ? "PROJECTS_VIEW" : "STREAM";
      inputBuffer = "";
      statusMessage = "Cancelled";
      render();
    } else if (key.name === "backspace") {
      inputBuffer = inputBuffer.slice(0, -1);
      render();
    } else if (str && str.length === 1 && !key.ctrl && !key.meta) {
      inputBuffer += str;
      render();
    }
    return;
  }

  // --- STREAM NAVIGATION MODE ---
  if (currentMode === "STREAM") {
    if (key.name === config.keymaps.view_timeline || str === config.keymaps.view_timeline) {
      currentMode = "STREAM";
      statusMessage = "Timeline Stream View";
      render();
    } else if (key.name === config.keymaps.view_projects || str === config.keymaps.view_projects) {
      currentMode = "PROJECTS_VIEW";
      statusMessage = `Projects View: j/k to select, '${config.keymaps.edit_project_content}' to edit content, '[1]' for timeline`;
      render();
    } else if (key.name === config.keymaps.down) {
      if (selectedEntryIndex < entries.length - 1) selectedEntryIndex++;
      render();
    } else if (key.name === config.keymaps.up) {
      if (selectedEntryIndex > 0) selectedEntryIndex--;
      render();
    } else if (key.name === config.keymaps.quick_capture || str === config.keymaps.quick_capture) {
      currentMode = "CAPTURE";
      inputBuffer = "";
      statusMessage = "Type note with @project and #tags, then hit Enter";
      render();
    } else if (key.name === config.keymaps.edit_project || str === config.keymaps.edit_project) {
      currentMode = "EDIT_PROJECT";
      inputBuffer = entries[selectedEntryIndex]?.projectName || "";
      statusMessage = "Edit project name and hit Enter";
      render();
    } else if (key.name === config.keymaps.edit_tags || str === config.keymaps.edit_tags) {
      currentMode = "EDIT_TAGS";
      inputBuffer = entries[selectedEntryIndex]?.tags.join(", ") || "";
      statusMessage = "Edit tags (comma separated) and hit Enter";
      render();
    } else if (key.name === config.keymaps.quit || str === config.keymaps.quit) {
      cleanupAndExit();
    }
    return;
  }

  // --- PROJECTS VIEW MODE ---
  if (currentMode === "PROJECTS_VIEW") {
    if (key.name === config.keymaps.view_timeline || str === config.keymaps.view_timeline) {
      currentMode = "STREAM";
      statusMessage = "Timeline Stream View";
      render();
    } else if (key.name === config.keymaps.view_projects || str === config.keymaps.view_projects) {
      currentMode = "PROJECTS_VIEW";
      render();
    } else if (key.name === config.keymaps.down) {
      if (selectedProjectIndex < projects.length - 1) selectedProjectIndex++;
      render();
    } else if (key.name === config.keymaps.up) {
      if (selectedProjectIndex > 0) selectedProjectIndex--;
      render();
    } else if (
      key.name === config.keymaps.edit_project_content ||
      str === config.keymaps.edit_project_content
    ) {
      currentMode = "EDIT_PROJECT_CONTENT";
      inputBuffer = "";
      statusMessage = "Type markdown line to append and press Enter";
      render();
    } else if (key.name === "escape") {
      currentMode = "STREAM";
      statusMessage = "Returned to Timeline Stream";
      render();
    } else if (key.name === config.keymaps.quit || str === config.keymaps.quit) {
      cleanupAndExit();
    }
  }
});

function commitInput() {
  if (currentMode === "CAPTURE") {
    if (inputBuffer.trim()) {
      const parsed = parseQuickCaptureLine(inputBuffer);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const dayStr = "2026-10-22";

      // Ensure project exists in project list
      if (!projects.find((p) => p.name.toLowerCase() === parsed.projectName.toLowerCase())) {
        projects.push({
          id: `p_${Date.now()}`,
          name: parsed.projectName,
          content: `# ${parsed.projectName}\nAuto-created project.`,
          createdAt: dayStr,
        });
      }

      entries.unshift({
        id: `e_${Date.now()}`,
        projectName: parsed.projectName,
        date: `${dayStr} ${timeStr}`,
        day: dayStr,
        tags: parsed.tags,
        content: parsed.content || "Empty note",
      });
      selectedEntryIndex = 0;
      statusMessage = `Saved note to @${parsed.projectName} with tags: ${parsed.tags.map((t) => "#" + t).join(" ")}`;
    }
    currentMode = "STREAM";
  } else if (currentMode === "EDIT_PROJECT") {
    if (inputBuffer.trim() && entries[selectedEntryIndex]) {
      const newProj = inputBuffer.trim().replace(/^@/, "");
      entries[selectedEntryIndex].projectName = newProj;
      if (!projects.find((p) => p.name.toLowerCase() === newProj.toLowerCase())) {
        projects.push({
          id: `p_${Date.now()}`,
          name: newProj,
          content: `# ${newProj}`,
          createdAt: "2026-10-22",
        });
      }
      statusMessage = `Updated project to @${newProj}`;
    }
    currentMode = "STREAM";
  } else if (currentMode === "EDIT_TAGS") {
    if (entries[selectedEntryIndex]) {
      const newTags = inputBuffer
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      entries[selectedEntryIndex].tags = newTags;
      statusMessage = `Updated tags to: ${newTags.map((t) => "#" + t).join(" ")}`;
    }
    currentMode = "STREAM";
  } else if (currentMode === "EDIT_PROJECT_CONTENT") {
    if (inputBuffer.trim() && projects[selectedProjectIndex]) {
      projects[selectedProjectIndex].content += `\n${inputBuffer.trim()}`;
      statusMessage = `Updated @${projects[selectedProjectIndex].name} content`;
    }
    currentMode = "PROJECTS_VIEW";
  }

  inputBuffer = "";
  render();
}

function cleanupAndExit() {
  process.stdout.write("\x1b[?25h\n"); // restore cursor
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.exit(0);
}

// Initial render
render();

process.stdout.on("resize", () => {
  render();
});
