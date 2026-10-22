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
let inputMode:
  | "NONE"
  | "CAPTURE"
  | "NEW_PROJECT"
  | "EDIT_PROJECT"
  | "EDIT_TAGS"
  | "FILTER"
  | "HELP" = "NONE";
let filterQuery = "";

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
let statusMessage = `[${config.keymaps.view_timeline}] Timeline | [${config.keymaps.view_projects}] Projects | [${config.keymaps.quick_capture}] Note | [${config.keymaps.new_project}] Project | [${config.keymaps.quit}] Quit`;

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
  enterAltScreen: "\x1b[?1049h\x1b[H",
  exitAltScreen: "\x1b[?1049l",
  cursorHome: "\x1b[H",
  clearScreen: "\x1b[2J\x1b[H",
};

function getFilteredEntries() {
  if (!filterQuery.trim()) return entries;
  const q = filterQuery.toLowerCase();
  return entries.filter(
    (e) =>
      e.content.toLowerCase().includes(q) ||
      e.projectName.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q)),
  );
}

function getFilteredProjects() {
  if (!filterQuery.trim()) return projects;
  const q = filterQuery.toLowerCase();
  return projects.filter(
    (p) => p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q),
  );
}

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

  const contentLines: string[] = [];

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
  contentLines.push(`${brand}   ${tabs}`);
  contentLines.push(`${ANSI.gray}${"─".repeat(width)}${ANSI.reset}`);

  if (currentTab === "TIMELINE") {
    contentLines.push(...renderTimelineViewLines(width));
  } else {
    contentLines.push(...renderProjectsViewLines(width, height));
  }

  // Active Modals & Suggestions
  if (inputMode === "CAPTURE") {
    contentLines.push(...renderCaptureModalLines(width));
  } else if (inputMode === "NEW_PROJECT") {
    contentLines.push(...renderNewProjectModalLines(width));
  } else if (inputMode === "EDIT_PROJECT") {
    contentLines.push(...renderEditProjectPromptLines(width));
  } else if (inputMode === "EDIT_TAGS") {
    contentLines.push(...renderEditTagsPromptLines(width));
  } else if (inputMode === "FILTER") {
    contentLines.push(...renderFilterModalLines(width));
  } else if (inputMode === "HELP") {
    contentLines.push(...renderHelpModalLines(width));
  }

  // Calculate padding so footer anchors to the very bottom row of the terminal
  const reservedBottomRows = 2; // separator + keymap status line
  const maxContentRows = Math.max(0, height - reservedBottomRows);
  const truncatedContent = contentLines.slice(0, maxContentRows);
  const fillerCount = Math.max(0, maxContentRows - truncatedContent.length);

  process.stdout.write(ANSI.clearScreen);
  for (const line of truncatedContent) {
    console.log(line);
  }
  for (let i = 0; i < fillerCount; i++) {
    console.log("");
  }

  // Footer / Status line anchored at the very bottom
  const filterIndicator = filterQuery
    ? `${ANSI.yellow}[Filter: "${filterQuery}"]${ANSI.reset} `
    : "";
  const keyHints = `${ANSI.cyan}[1]${ANSI.reset}Stream ${ANSI.cyan}[2]${ANSI.reset}Projects ${ANSI.cyan}[n]${ANSI.reset}Note ${ANSI.cyan}[N]${ANSI.reset}Project ${ANSI.cyan}[/]${ANSI.reset}Filter ${ANSI.cyan}[?]${ANSI.reset}Help ${ANSI.cyan}[q]${ANSI.reset}Quit`;
  process.stdout.write(
    `${ANSI.gray}${"─".repeat(width)}${ANSI.reset}\n${filterIndicator}${keyHints}  ${ANSI.dim}${statusMessage}${ANSI.reset}`,
  );
}

function renderTimelineViewLines(width: number): string[] {
  const lines: string[] = [];
  const filtered = getFilteredEntries();
  if (filtered.length === 0) {
    const msg = filterQuery
      ? `No notes matching filter "${filterQuery}". Press '/' or Esc to clear.`
      : `No journal notes yet. Press '${config.keymaps.quick_capture}' to create one!`;
    lines.push("", `  ${ANSI.dim}${msg}${ANSI.reset}`, "");
    return lines;
  }

  // Group by day
  const grouped = new Map<string, typeof entries>();
  for (const entry of filtered) {
    const day = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(entry);
  }

  let globalIdx = 0;
  for (const [day, dayEntries] of grouped.entries()) {
    lines.push(`${ANSI.bold}${ANSI.yellow}${icons.calendar} ${day}${ANSI.reset}`);

    for (const item of dayEntries) {
      const isSel = globalIdx === selectedEntryIdx;
      const border = isSel ? ANSI.cyan : ANSI.gray;
      const badge = isSel ? `${ANSI.bgCyan} SELECTED ${ANSI.reset}` : "";
      const time = new Date(item.createdAt).toTimeString().slice(0, 5);

      lines.push(
        `${border}┌──${ANSI.reset} ${badge} ${ANSI.dim}${time}${ANSI.reset} ` +
          `${ANSI.blue}${icons.project} @${item.projectName}${ANSI.reset} ` +
          item.tags.map((t) => `${ANSI.magenta}${icons.tag} #${t}${ANSI.reset}`).join(" "),
      );

      const contentLines = item.content.split("\n");
      for (const line of contentLines) {
        let formatted = line;
        if (line.startsWith("- [x]"))
          formatted = `${ANSI.green}${icons.checked}${ANSI.reset} ${line.slice(5)}`;
        else if (line.startsWith("- [ ]"))
          formatted = `${ANSI.gray}${icons.unchecked}${ANSI.reset} ${line.slice(5)}`;
        else if (line.startsWith("-"))
          formatted = `${ANSI.cyan}${icons.bullet}${ANSI.reset} ${line.slice(1)}`;
        lines.push(`${border}│${ANSI.reset}  ${formatted}`);
      }

      lines.push(`${border}└───${ANSI.reset}`);
      globalIdx++;
    }
    lines.push("");
  }
  return lines;
}

function renderProjectsViewLines(width: number, height: number): string[] {
  const lines: string[] = [];
  const leftW = 28;
  const rightW = width - leftW - 3;
  const filtered = getFilteredProjects();
  const selProj = filtered[selectedProjectIdx] || { name: "None", content: "", entryCount: 0 };

  const leftLines = [
    `${ANSI.bold}${ANSI.cyan}${icons.project} PROJECTS${ANSI.reset}`,
    `${ANSI.gray}${"─".repeat(leftW - 2)}${ANSI.reset}`,
  ];

  filtered.forEach((p, idx) => {
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
    lines.push(`${left} ${ANSI.gray}│${ANSI.reset} ${right}`);
  }
  return lines;
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

function renderNewProjectModalLines(width: number): string[] {
  return [
    `${ANSI.cyan}┌─ ${icons.project} CREATE NEW PROJECT ──────────────────────────────────────────┐${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset} Project Name: ${ANSI.bold}${inputBuffer}█${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}Press Enter to create, Esc to cancel${ANSI.reset}`,
    `${ANSI.cyan}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  ];
}

function renderFilterModalLines(width: number): string[] {
  return [
    `${ANSI.yellow}┌─ / FILTER & SEARCH ──────────────────────────────────────────┐${ANSI.reset}`,
    `${ANSI.yellow}│${ANSI.reset} Query: ${ANSI.bold}${inputBuffer}█${ANSI.reset}`,
    `${ANSI.yellow}│${ANSI.reset} ${ANSI.dim}Matches notes, project names, or tags. Enter to apply, Esc to clear${ANSI.reset}`,
    `${ANSI.yellow}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  ];
}

function renderHelpModalLines(width: number): string[] {
  return [
    `${ANSI.cyan}┌─ ? KEYBOARD SHORTCUTS & HELP ─────────────────────────────────┐${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[1]${ANSI.reset}           Switch to Daily Timeline Stream View         ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[2]${ANSI.reset}           Switch to Projects & Markdown Preview View   ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[j / k]${ANSI.reset}       Navigate entries / projects up and down      ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[n]${ANSI.reset}           1-Line Quick Capture (Syntax: @proj #tag)    ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[N]${ANSI.reset}           Create new project                           ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[p]${ANSI.reset}           Reassign project for selected note           ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[t]${ANSI.reset}           Edit tags for selected note                  ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[e]${ANSI.reset}           Edit project markdown content in $EDITOR     ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[/]${ANSI.reset}           Search / filter stream or projects           ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[Tab]${ANSI.reset}         Accept auto-suggestions when typing          ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[Ctrl+W]${ANSI.reset}      Delete previous word in input fields         ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[Ctrl+U]${ANSI.reset}      Clear entire input line                      ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[Esc]${ANSI.reset}         Cancel prompt / Clear active filter          ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[q]${ANSI.reset}           Quit application                             ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}Press any key or Esc to dismiss${ANSI.reset}`,
    `${ANSI.cyan}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  ];
}

function renderCaptureModalLines(width: number): string[] {
  const modalW = Math.min(Math.max(68, Math.floor(width * 0.7)), width - 4);
  const leftPad = " ".repeat(Math.max(2, Math.floor((width - modalW) / 2)));
  const innerW = modalW - 4;

  const topBorder = `${leftPad}${ANSI.bgCyan}\x1b[30m ${icons.quick} QUICK CAPTURE ${" ".repeat(modalW - 17)}${ANSI.reset}`;
  const syntaxLine =
    `${leftPad}${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}Syntax: Text ${ANSI.blue}@project${ANSI.reset} ${ANSI.magenta}#tags${ANSI.reset}${ANSI.dim}   [Tab: accept suggestions]${ANSI.reset}`.padEnd(
      modalW + 15,
    );

  const inputDisplay = `> ${inputBuffer}█`;
  const inputPad = Math.max(0, innerW - inputBuffer.length - 2);
  const inputLine = `${leftPad}${ANSI.cyan}│${ANSI.reset} ${ANSI.bold}${inputDisplay}${ANSI.reset}${" ".repeat(inputPad)} ${ANSI.cyan}│${ANSI.reset}`;

  const res = [
    `${leftPad}${ANSI.cyan}┌${"─".repeat(modalW - 2)}┐${ANSI.reset}`,
    topBorder,
    syntaxLine,
    inputLine,
  ];

  const suggestions = getSuggestions();
  if (suggestions && suggestions.matches.length > 0) {
    const pills = suggestions.matches
      .slice(0, 4)
      .map((m, idx) => {
        const isSel = idx === activeSuggestionIdx;
        const prefix = suggestions.type === "project" ? "@" : "#";
        return isSel
          ? `${ANSI.inverse}[${prefix}${m}]${ANSI.reset}`
          : `${ANSI.dim}${prefix}${m}${ANSI.reset}`;
      })
      .join(" ");
    res.push(`${leftPad}${ANSI.cyan}│${ANSI.reset} ${ANSI.yellow}Suggestions:${ANSI.reset} ${pills}`);
  }

  res.push(
    `${leftPad}${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}[Enter: Save note]  [Esc: Cancel]${ANSI.reset}`,
    `${leftPad}${ANSI.cyan}└${"─".repeat(modalW - 2)}┘${ANSI.reset}`,
  );
  return res;
}

function renderEditProjectPromptLines(width: number): string[] {
  const current = entries[selectedEntryIdx]?.projectName || "";
  const res = [
    `${ANSI.blue}┌─ Reassign Project [Current: @${current}] ────────────────────────┐${ANSI.reset}`,
    `${ANSI.blue}│${ANSI.reset} Project: @${ANSI.bold}${inputBuffer}█${ANSI.reset}   [Tab for suggestion]`,
  ];
  const suggestions = projects
    .filter((p) => p.name.toLowerCase().startsWith(inputBuffer.toLowerCase()))
    .map((p) => p.name);
  if (suggestions.length > 0) {
    res.push(`${ANSI.blue}│${ANSI.reset} Suggestions: ${suggestions.slice(0, 5).join(", ")}`);
  }
  res.push(`${ANSI.blue}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`);
  return res;
}

function renderEditTagsPromptLines(width: number): string[] {
  const current = entries[selectedEntryIdx]?.tags.join(", ") || "";
  return [
    `${ANSI.magenta}┌─ Edit Tags [Current: ${current}] ───────────────────────────────┐${ANSI.reset}`,
    `${ANSI.magenta}│${ANSI.reset} Tags: ${ANSI.bold}${inputBuffer}█${ANSI.reset}   [Comma-separated, Tab for suggestion]`,
    `${ANSI.magenta}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  ];
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
  if (inputMode === "HELP") {
    inputMode = "NONE";
    render();
    return;
  }

  if (inputMode !== "NONE") {
    if (key.ctrl && key.name === "w") {
      // Delete backward word (Ctrl+W)
      inputBuffer = inputBuffer.replace(/(?:[^\s]+|\s+)\s*$/, "");
      activeSuggestionIdx = 0;
      render();
      return;
    }
    if (key.ctrl && key.name === "u") {
      // Delete whole line (Ctrl+U)
      inputBuffer = "";
      activeSuggestionIdx = 0;
      render();
      return;
    }
    if (key.name === "return") {
      await commitModalInput();
    } else if (key.name === "escape") {
      if (inputMode === "FILTER") {
        filterQuery = "";
      }
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
  if (str === config.keymaps.help || key.name === "help") {
    inputMode = "HELP";
    render();
    return;
  }

  if (str === config.keymaps.search_filter) {
    inputMode = "FILTER";
    inputBuffer = filterQuery;
    statusMessage = "Type search query and press Enter";
    render();
    return;
  }

  if (key.name === "escape") {
    if (filterQuery) {
      filterQuery = "";
      statusMessage = "Cleared filter";
      render();
      return;
    }
  }
  if (key.name === config.keymaps.view_timeline || str === config.keymaps.view_timeline) {
    currentTab = "TIMELINE";
    statusMessage = "Timeline Stream View";
    render();
  } else if (key.name === config.keymaps.view_projects || str === config.keymaps.view_projects) {
    currentTab = "PROJECTS";
    statusMessage = `Projects View: j/k select, '${config.keymaps.edit_project_content}' edit in $EDITOR`;
    render();
  } else if (key.name === config.keymaps.down) {
    const filteredEntries = getFilteredEntries();
    const filteredProjects = getFilteredProjects();
    if (currentTab === "TIMELINE" && selectedEntryIdx < filteredEntries.length - 1) {
      selectedEntryIdx++;
      render();
    } else if (currentTab === "PROJECTS" && selectedProjectIdx < filteredProjects.length - 1) {
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
  } else if (str === config.keymaps.new_project || key.name === config.keymaps.new_project) {
    inputMode = "NEW_PROJECT";
    inputBuffer = "";
    statusMessage = "Type project name and press Enter";
    render();
  } else if (key.name === config.keymaps.edit_project || str === config.keymaps.edit_project) {
    const filteredEntries = getFilteredEntries();
    if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
      inputMode = "EDIT_PROJECT";
      inputBuffer = filteredEntries[selectedEntryIdx].projectName;
      statusMessage = "Edit project and hit Enter";
      render();
    }
  } else if (key.name === config.keymaps.edit_tags || str === config.keymaps.edit_tags) {
    const filteredEntries = getFilteredEntries();
    if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
      inputMode = "EDIT_TAGS";
      inputBuffer = filteredEntries[selectedEntryIdx].tags.join(", ");
      statusMessage = "Edit tags and hit Enter";
      render();
    }
  } else if (
    key.name === config.keymaps.edit_project_content ||
    str === config.keymaps.edit_project_content
  ) {
    const filteredProjects = getFilteredProjects();
    if (currentTab === "PROJECTS" && filteredProjects[selectedProjectIdx]) {
      const targetProj = filteredProjects[selectedProjectIdx];
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
  } else if (inputMode === "EDIT_TAGS") {
    // Complete current tag after comma
    const parts = inputBuffer.split(",");
    const currentTag = parts[parts.length - 1].trim().toLowerCase();
    const match = availableTags.find((t) => t.name.toLowerCase().startsWith(currentTag));
    if (match) {
      parts[parts.length - 1] = ` ${match.name}`;
      inputBuffer = parts.join(",");
      render();
    }
  }
}

async function commitModalInput() {
  if (inputMode === "FILTER") {
    filterQuery = inputBuffer.trim();
    selectedEntryIdx = 0;
    selectedProjectIdx = 0;
    statusMessage = filterQuery
      ? `Filtering by: "${filterQuery}" (Esc to clear)`
      : "Filter cleared";
  } else if (inputMode === "NEW_PROJECT" && inputBuffer.trim()) {
    const res = await client.projects.$post({
      json: {
        name: inputBuffer.trim(),
        content: `# ${inputBuffer.trim()}\n`,
      },
    });
    await reloadData();
    // Switch to projects view and highlight newly created project
    currentTab = "PROJECTS";
    const foundIdx = projects.findIndex(
      (p) => p.name.toLowerCase() === inputBuffer.trim().toLowerCase(),
    );
    if (foundIdx !== -1) selectedProjectIdx = foundIdx;
    statusMessage = `Created project: @${inputBuffer.trim()}`;
  } else if (inputMode === "CAPTURE" && inputBuffer.trim()) {
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
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter((t) => /^[a-z0-9-_]+$/.test(t));
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

// Initialize Full Screen Alternate Screen Buffer
if (process.stdout.isTTY) {
  process.stdout.write(ANSI.enterAltScreen);
}

function cleanupAndExit() {
  if (process.stdout.isTTY) {
    process.stdout.write(ANSI.exitAltScreen);
  }
  process.stdout.write("\x1b[?25h\n");
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.exit(0);
}

process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);

render();
