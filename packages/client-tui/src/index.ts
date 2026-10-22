#!/usr/bin/env node
import readline from "node:readline";
import { type Config, loadConfig } from "@journals/core";
import { type AppType, startServer } from "@journals/server";
import { hc } from "hono/client";
import { openExternalEditor } from "./editor.js";
import { detectSuggestionQuery } from "./suggest.js";

const config: Config = loadConfig();
const icons = config.appearance.use_nerd_font ? config.icons.nerd : config.icons.plain;

// Ensure server is running or start embedded instance
let serverUrl = `http://${config.server.host}:${config.server.port}`;

try {
  const testRes = await fetch(`${serverUrl}/health`);
  if (!testRes.ok) throw new Error("not running");
} catch {
  if (config.server.auto_start) {
    startServer();
    await new Promise((r) => setTimeout(r, 200));
  }
}

// Type-safe Hono RPC client
const client = hc<AppType>(serverUrl);

// State
let currentTab: "TIMELINE" | "PROJECTS" = "TIMELINE";
let inputMode: "NONE" | "CAPTURE" | "EDIT_PROJECT" | "EDIT_TAGS" = "NONE";

let entries: Array<{
  id: string;
  projectId: string;
  projectName: string;
  content: string;
  tags: string[];
  createdAt: number;
}> = [];

let projects: Array<{
  id: string;
  name: string;
  content: string;
  createdAt: number;
  entryCount: number;
}> = [];

let availableTags: Array<{ name: string; count: number }> = [];

let selectedEntryIdx = 0;
let selectedProjectIdx = 0;
let inputBuffer = "";
let activeSuggestionIdx = 0;
let statusMessage = `[${config.keymaps.view_timeline}] Timeline | [${config.keymaps.view_projects}] Projects | [${config.keymaps.quick_capture}] Capture | [${config.keymaps.quit}] Quit`;

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

async function reloadData() {
  const [entriesRes, projectsRes, tagsRes] = await Promise.all([
    client.entries.$get(),
    client.projects.$get(),
    client.tags.$get(),
  ]);

  const entriesData = await entriesRes.json();
  const projectsData = await projectsRes.json();
  const tagsData = await tagsRes.json();

  entries = entriesData.entries;
  projects = projectsData.projects;
  availableTags = tagsData.tags;
}

await reloadData();

function render() {
  const width = process.stdout.columns || 100;
  const height = process.stdout.rows || 30;

  process.stdout.write(ANSI.clearScreen);

  // Top Navigation Tabs
  const brand = `${ANSI.bold}${ANSI.cyan}${icons.journal} JOURNALS${ANSI.reset}`;
  const tabs = [
    currentTab === "TIMELINE"
      ? `${ANSI.bgBlue} [1] Timeline Stream ${ANSI.reset}`
      : ` ${ANSI.dim}[1] Timeline${ANSI.reset} `,
    currentTab === "PROJECTS"
      ? `${ANSI.bgCyan} [2] Projects & Preview ${ANSI.reset}`
      : ` ${ANSI.dim}[2] Projects${ANSI.reset} `,
  ].join(" ");
  console.log(`${brand}   ${tabs}\n${ANSI.gray}${"─".repeat(width)}${ANSI.reset}`);

  if (currentTab === "TIMELINE") {
    renderTimelineView(width);
  } else {
    renderProjectsView(width, height);
  }

  // Active Modals & Suggestions
  if (inputMode === "CAPTURE") {
    renderCaptureModal(width);
  } else if (inputMode === "EDIT_PROJECT") {
    renderEditProjectPrompt(width);
  } else if (inputMode === "EDIT_TAGS") {
    renderEditTagsPrompt(width);
  }

  // Footer / Status line
  console.log(`${ANSI.gray}${"─".repeat(width)}${ANSI.reset}`);
  console.log(`${ANSI.dim}${statusMessage}${ANSI.reset}`);
}

function renderTimelineView(width: number) {
  if (entries.length === 0) {
    console.log(
      `\n  ${ANSI.dim}No journal notes yet. Press '${config.keymaps.quick_capture}' to create one!${ANSI.reset}\n`,
    );
    return;
  }

  // Group by day
  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    const day = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(entry);
  }

  let globalIdx = 0;
  for (const [day, dayEntries] of grouped.entries()) {
    console.log(`${ANSI.bold}${ANSI.yellow}${icons.calendar} ${day}${ANSI.reset}`);

    for (const item of dayEntries) {
      const isSel = globalIdx === selectedEntryIdx;
      const border = isSel ? ANSI.cyan : ANSI.gray;
      const badge = isSel ? `${ANSI.bgCyan} SELECTED ${ANSI.reset}` : "";
      const time = new Date(item.createdAt).toTimeString().slice(0, 5);

      console.log(
        `${border}┌──${ANSI.reset} ${badge} ${ANSI.dim}${time}${ANSI.reset} ` +
          `${ANSI.blue}${icons.project} @${item.projectName}${ANSI.reset} ` +
          item.tags.map((t) => `${ANSI.magenta}${icons.tag} #${t}${ANSI.reset}`).join(" "),
      );

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
      globalIdx++;
    }
    console.log("");
  }
}

function renderProjectsView(width: number, height: number) {
  const leftW = 28;
  const rightW = width - leftW - 3;
  const selProj = projects[selectedProjectIdx] || { name: "None", content: "", entryCount: 0 };

  const leftLines = [
    `${ANSI.bold}${ANSI.cyan}${icons.project} PROJECTS${ANSI.reset}`,
    `${ANSI.gray}${"─".repeat(leftW - 2)}${ANSI.reset}`,
  ];

  projects.forEach((p, idx) => {
    const isSel = idx === selectedProjectIdx;
    const text = `${p.name} (${p.entryCount})`;
    if (isSel) {
      leftLines.push(`${ANSI.inverse}${ANSI.cyan}❯ ${text.padEnd(leftW - 4)}${ANSI.reset}`);
    } else {
      leftLines.push(`  ${text}`);
    }
  });

  const rightLines = [
    `${ANSI.bold}${ANSI.yellow}Preview: ${selProj.name}${ANSI.reset} ${ANSI.dim}[Press '${config.keymaps.edit_project_content}' to edit in $EDITOR]${ANSI.reset}`,
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
          `• ${ANSI.gray}${new Date(e.createdAt).toISOString().slice(0, 10)}${ANSI.reset} ${e.content.split("\n")[0].slice(0, rightW - 25)}`,
      ),
  ];

  const maxRows = Math.max(leftLines.length, rightLines.length, 12);
  for (let i = 0; i < maxRows; i++) {
    const left = (leftLines[i] || "").padEnd(leftW);
    const right = rightLines[i] || "";
    console.log(`${left} ${ANSI.gray}│${ANSI.reset} ${right}`);
  }
}

function getSuggestions() {
  const queryInfo = detectSuggestionQuery(inputBuffer);
  if (!queryInfo) return null;

  if (queryInfo.type === "project") {
    const matches = projects
      .filter((p) => p.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()))
      .map((p) => p.name);
    return { ...queryInfo, matches };
  } else {
    const matches = availableTags
      .filter((t) => t.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()))
      .map((t) => t.name);
    return { ...queryInfo, matches };
  }
}

function renderCaptureModal(width: number) {
  console.log(
    `${ANSI.cyan}┌─ ${icons.quick} QUICK CAPTURE ──────────────────────────────────────────────┐${ANSI.reset}`,
  );
  console.log(
    `${ANSI.cyan}│${ANSI.reset} Syntax: Note text ${ANSI.blue}@project${ANSI.reset} ${ANSI.magenta}#tag1 #tag2${ANSI.reset}   [Tab to accept suggestions]`,
  );
  console.log(`${ANSI.cyan}│${ANSI.reset} > ${ANSI.bold}${inputBuffer}█${ANSI.reset}`);

  const suggestions = getSuggestions();
  if (suggestions && suggestions.matches.length > 0) {
    const pills = suggestions.matches
      .slice(0, 5)
      .map((m, idx) => {
        const isSel = idx === activeSuggestionIdx;
        const prefix = suggestions.type === "project" ? "@" : "#";
        return isSel
          ? `${ANSI.inverse}[${prefix}${m}]${ANSI.reset}`
          : `${ANSI.dim}${prefix}${m}${ANSI.reset}`;
      })
      .join(" ");
    console.log(`${ANSI.cyan}│${ANSI.reset} Suggestions: ${pills}`);
  }

  console.log(
    `${ANSI.cyan}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  );
}

function renderEditProjectPrompt(width: number) {
  const current = entries[selectedEntryIdx]?.projectName || "";
  console.log(
    `${ANSI.blue}┌─ Reassign Project [Current: @${current}] ────────────────────────┐${ANSI.reset}`,
  );
  console.log(
    `${ANSI.blue}│${ANSI.reset} Project: @${ANSI.bold}${inputBuffer}█${ANSI.reset}   [Tab for suggestion]`,
  );
  const suggestions = projects
    .filter((p) => p.name.toLowerCase().startsWith(inputBuffer.toLowerCase()))
    .map((p) => p.name);
  if (suggestions.length > 0) {
    console.log(`${ANSI.blue}│${ANSI.reset} Suggestions: ${suggestions.slice(0, 5).join(", ")}`);
  }
  console.log(
    `${ANSI.blue}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  );
}

function renderEditTagsPrompt(width: number) {
  const current = entries[selectedEntryIdx]?.tags.join(", ") || "";
  console.log(
    `${ANSI.magenta}┌─ Edit Tags [Current: ${current}] ───────────────────────────────┐${ANSI.reset}`,
  );
  console.log(
    `${ANSI.magenta}│${ANSI.reset} Tags: ${ANSI.bold}${inputBuffer}█${ANSI.reset}   [Comma-separated, Tab for suggestion]`,
  );
  console.log(
    `${ANSI.magenta}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  );
}

// Keyboard input
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on("keypress", async (str, key) => {
  if (key.ctrl && key.name === "c") {
    cleanupAndExit();
  }

  // --- MODAL / INPUT EDITING MODES ---
  if (inputMode !== "NONE") {
    if (key.name === "return") {
      await commitModalInput();
    } else if (key.name === "escape") {
      inputMode = "NONE";
      inputBuffer = "";
      statusMessage = "Cancelled";
      render();
    } else if (key.name === "tab") {
      applySuggestion();
    } else if (key.name === "backspace") {
      inputBuffer = inputBuffer.slice(0, -1);
      activeSuggestionIdx = 0;
      render();
    } else if (str && str.length === 1 && !key.ctrl && !key.meta) {
      inputBuffer += str;
      activeSuggestionIdx = 0;
      render();
    }
    return;
  }

  // --- NORMAL NAVIGATION ---
  if (key.name === config.keymaps.view_timeline || str === config.keymaps.view_timeline) {
    currentTab = "TIMELINE";
    statusMessage = "Timeline Stream View";
    render();
  } else if (key.name === config.keymaps.view_projects || str === config.keymaps.view_projects) {
    currentTab = "PROJECTS";
    statusMessage = `Projects View: j/k select, '${config.keymaps.edit_project_content}' edit in $EDITOR`;
    render();
  } else if (key.name === config.keymaps.down) {
    if (currentTab === "TIMELINE" && selectedEntryIdx < entries.length - 1) {
      selectedEntryIdx++;
      render();
    } else if (currentTab === "PROJECTS" && selectedProjectIdx < projects.length - 1) {
      selectedProjectIdx++;
      render();
    }
  } else if (key.name === config.keymaps.up) {
    if (currentTab === "TIMELINE" && selectedEntryIdx > 0) {
      selectedEntryIdx--;
      render();
    } else if (currentTab === "PROJECTS" && selectedProjectIdx > 0) {
      selectedProjectIdx--;
      render();
    }
  } else if (key.name === config.keymaps.quick_capture || str === config.keymaps.quick_capture) {
    inputMode = "CAPTURE";
    inputBuffer = "";
    statusMessage = "Type note (@project #tags) and press Enter";
    render();
  } else if (key.name === config.keymaps.edit_project || str === config.keymaps.edit_project) {
    if (currentTab === "TIMELINE" && entries[selectedEntryIdx]) {
      inputMode = "EDIT_PROJECT";
      inputBuffer = entries[selectedEntryIdx].projectName;
      statusMessage = "Edit project and hit Enter";
      render();
    }
  } else if (key.name === config.keymaps.edit_tags || str === config.keymaps.edit_tags) {
    if (currentTab === "TIMELINE" && entries[selectedEntryIdx]) {
      inputMode = "EDIT_TAGS";
      inputBuffer = entries[selectedEntryIdx].tags.join(", ");
      statusMessage = "Edit tags and hit Enter";
      render();
    }
  } else if (
    key.name === config.keymaps.edit_project_content ||
    str === config.keymaps.edit_project_content
  ) {
    if (currentTab === "PROJECTS" && projects[selectedProjectIdx]) {
      const targetProj = projects[selectedProjectIdx];
      const updated = openExternalEditor(targetProj.content);
      if (updated !== targetProj.content) {
        await client.projects[":id"].content.$put({
          param: { id: targetProj.id },
          json: { content: updated },
        });
        await reloadData();
        statusMessage = `Updated content for @${targetProj.name}`;
      }
      render();
    }
  } else if (key.name === config.keymaps.quit || str === config.keymaps.quit) {
    cleanupAndExit();
  }
});

function applySuggestion() {
  if (inputMode === "CAPTURE") {
    const suggestions = getSuggestions();
    if (suggestions && suggestions.matches.length > 0) {
      const choice = suggestions.matches[activeSuggestionIdx] || suggestions.matches[0];
      const prefix = suggestions.type === "project" ? "@" : "#";
      const before = inputBuffer.slice(0, suggestions.triggerIndex);
      inputBuffer = `${before}${prefix}${choice} `;
      render();
    }
  } else if (inputMode === "EDIT_PROJECT") {
    const match = projects.find((p) => p.name.toLowerCase().startsWith(inputBuffer.toLowerCase()));
    if (match) {
      inputBuffer = match.name;
      render();
    }
  }
}

async function commitModalInput() {
  if (inputMode === "CAPTURE" && inputBuffer.trim()) {
    await client.capture.$post({
      json: {
        raw: inputBuffer.trim(),
        defaultProject: config.defaults.project,
        defaultTags: config.defaults.tags,
      },
    });
    await reloadData();
    selectedEntryIdx = 0;
    statusMessage = "Captured note successfully!";
  } else if (inputMode === "EDIT_PROJECT" && inputBuffer.trim()) {
    const entry = entries[selectedEntryIdx];
    if (entry) {
      await client.entries[":id"].project.$patch({
        param: { id: entry.id },
        json: { projectName: inputBuffer.trim() },
      });
      await reloadData();
      statusMessage = "Updated note project!";
    }
  } else if (inputMode === "EDIT_TAGS") {
    const entry = entries[selectedEntryIdx];
    if (entry) {
      const newTags = inputBuffer
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      await client.entries[":id"].tags.$patch({
        param: { id: entry.id },
        json: { tags: newTags },
      });
      await reloadData();
      statusMessage = "Updated note tags!";
    }
  }

  inputMode = "NONE";
  inputBuffer = "";
  render();
}

function cleanupAndExit() {
  process.stdout.write("\x1b[?25h\n");
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.exit(0);
}

render();
