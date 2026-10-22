#!/usr/bin/env node
import readline from "node:readline";
import { client, config, fetchEntries, fetchProjects, fetchTags } from "./api/client.js";
import { openExternalEditor } from "./editor.js";
import { detectSuggestionQuery } from "./suggest.js";
import {
  ANSI,
  renderCaptureModalLines,
  renderEditProjectPromptLines,
  renderEditTagsPromptLines,
  renderFilterModalLines,
  renderHelpModalLines,
  renderNewProjectModalLines,
  renderProjectsViewLines,
  renderTimelineViewLines,
} from "./views/index.js";

const icons = config.appearance.use_nerd_font ? config.icons.nerd : config.icons.plain;

// State
let currentTab: "TIMELINE" | "PROJECTS" = "TIMELINE";
let inputMode: "NONE" | "CAPTURE" | "NEW_PROJECT" | "EDIT_PROJECT" | "EDIT_TAGS" | "FILTER" | "HELP" = "NONE";
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
  const [entriesData, projectsData, tagsData] = await Promise.all([
    fetchEntries(),
    fetchProjects(),
    fetchTags(),
  ]);
  entries = entriesData;
  projects = projectsData;
  availableTags = tagsData;
}

await reloadData();

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
    contentLines.push(
      ...renderTimelineViewLines(
        getFilteredEntries(),
        selectedEntryIdx,
        icons,
        config.keymaps.quick_capture,
        filterQuery,
      ),
    );
  } else {
    contentLines.push(
      ...renderProjectsViewLines(
        getFilteredProjects(),
        entries,
        selectedProjectIdx,
        icons,
        config.keymaps.edit_project_content,
        width,
      ),
    );
  }

  // Active Modals & Suggestions
  if (inputMode === "CAPTURE") {
    contentLines.push(
      ...renderCaptureModalLines(
        inputBuffer,
        getSuggestions(),
        activeSuggestionIdx,
        icons,
        width,
      ),
    );
  } else if (inputMode === "NEW_PROJECT") {
    contentLines.push(...renderNewProjectModalLines(inputBuffer, icons));
  } else if (inputMode === "EDIT_PROJECT") {
    const filteredEntries = getFilteredEntries();
    const currentProj = filteredEntries[selectedEntryIdx]?.projectName || "";
    contentLines.push(...renderEditProjectPromptLines(currentProj, inputBuffer, projects));
  } else if (inputMode === "EDIT_TAGS") {
    const filteredEntries = getFilteredEntries();
    const currentTags = filteredEntries[selectedEntryIdx]?.tags.join(", ") || "";
    contentLines.push(...renderEditTagsPromptLines(currentTags, inputBuffer));
  } else if (inputMode === "FILTER") {
    contentLines.push(...renderFilterModalLines(inputBuffer));
  } else if (inputMode === "HELP") {
    contentLines.push(...renderHelpModalLines());
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
  const filterIndicator = filterQuery ? `${ANSI.yellow}[Filter: "${filterQuery}"]${ANSI.reset} ` : "";
  const keyHints = `${ANSI.cyan}[1]${ANSI.reset}Stream ${ANSI.cyan}[2]${ANSI.reset}Projects ${ANSI.cyan}[n]${ANSI.reset}Note ${ANSI.cyan}[N]${ANSI.reset}Project ${ANSI.cyan}[/]${ANSI.reset}Filter ${ANSI.cyan}[?]${ANSI.reset}Help ${ANSI.cyan}[q]${ANSI.reset}Quit`;
  process.stdout.write(
    `${ANSI.gray}${"─".repeat(width)}${ANSI.reset}\n${filterIndicator}${keyHints}  ${ANSI.dim}${statusMessage}${ANSI.reset}`,
  );
}

// Input handling
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
      inputBuffer = inputBuffer.replace(/(?:[^\s]+|\s+)\s*$/, "");
      activeSuggestionIdx = 0;
      render();
      return;
    }
    if (key.ctrl && key.name === "u") {
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
    await client.projects.$post({
      json: {
        name: inputBuffer.trim(),
        content: `# ${inputBuffer.trim()}\n`,
      },
    });
    await reloadData();
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
    const filteredEntries = getFilteredEntries();
    const entry = filteredEntries[selectedEntryIdx];
    if (entry) {
      await client.entries[":id"].project.$patch({
        param: { id: entry.id },
        json: { projectName: inputBuffer.trim() },
      });
      await reloadData();
      statusMessage = "Updated note project!";
    }
  } else if (inputMode === "EDIT_TAGS") {
    const filteredEntries = getFilteredEntries();
    const entry = filteredEntries[selectedEntryIdx];
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
