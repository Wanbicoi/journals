#!/usr/bin/env node
/**
 * PROTOTYPE: Journal View & Navigation in Terminal TUI
 * Run directly with: node prototype-journal-view.js
 *
 * Keys:
 *   [1] Variant A: OpenCode Split (List left, Full Markdown Right)
 *   [2] Variant B: Stream / Timeline (Continuous Feed with Highlights)
 *   [3] Variant C: 3-Column Pane (Projects -> Entries -> Detail)
 *   [j / Down] Next entry
 *   [k / Up]   Previous entry
 *   [n]        Simulate Quick Capture (Adds entry)
 *   [t]        Tag filter toggle
 *   [q / Ctrl+C] Quit
 */

import readline from "node:readline";

// Mock Data
const projects = [
  { id: "p1", name: "Inbox" },
  { id: "p2", name: "Journals CLI" },
  { id: "p3", name: "Work / Ops" },
];

let entries = [
  {
    id: "e1",
    projectId: "p2",
    projectName: "Journals CLI",
    date: "2026-10-22 07:15",
    tags: ["architecture", "tui", "prototype"],
    title: "Prototype journal view in terminal",
    content: `# Prototype Journal View
Testing TUI ergonomics:
- Split vs Stream vs 3-Column layout
- Keyboard navigation (j/k, 1/2/3)
- Quick capture integration

> Simple is better than complex.
- [x] Initial design doc
- [ ] TUI prototype testing
- [ ] SQLite integration`,
  },
  {
    id: "e2",
    projectId: "p2",
    projectName: "Journals CLI",
    date: "2026-10-22 07:10",
    tags: ["sqlite", "drizzle"],
    title: "Decide on Drizzle ORM schema",
    content: `Checked Drizzle ORM with better-sqlite3 / node:sqlite.
Tags schema design:
\`\`\`typescript
export const tags = sqliteTable("tags", {
  name: text("name").primaryKey(),
});
\`\`\`
Enables single-line CASCADE updates.`,
  },
  {
    id: "e3",
    projectId: "p1",
    projectName: "Inbox",
    date: "2026-10-22 06:45",
    tags: ["quick-note", "ideas"],
    title: "Offline-first sync विचार",
    content: `Quick capture idea:
Keep WAL mode enabled for instant write transactions without table lock collisions during rapid capture.`,
  },
  {
    id: "e4",
    projectId: "p3",
    projectName: "Work / Ops",
    date: "2026-10-21 16:30",
    tags: ["devops", "hooks"],
    title: "Biome & Git hook setup",
    content: `Using simple-git-hooks directly in package.json dev dependencies.
Zero extra config directories.`,
  },
];

let currentVariant = "A"; // A: Split, B: Timeline Stream, C: 3-Column
let selectedIndex = 0;
let activeTagFilter = null;
let statusMessage = "Press 1, 2, 3 to switch layouts | j/k: navigate | n: capture | q: quit";

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
  bgBlue: "\x1b[44m\x1b[37m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgMagenta: "\x1b[45m\x1b[37m",
  clearScreen: "\x1b[2J\x1b[H",
};

function getFilteredEntries() {
  if (!activeTagFilter) return entries;
  return entries.filter((e) => e.tags.includes(activeTagFilter));
}

function renderHeader(width) {
  const brand = `${ANSI.bold}${ANSI.cyan}◆ JOURNALS${ANSI.reset} ${ANSI.gray}| TUI View Prototype${ANSI.reset}`;
  const variants = [
    currentVariant === "A"
      ? `${ANSI.bgBlue} [1] Split View ${ANSI.reset}`
      : ` ${ANSI.dim}[1] Split${ANSI.reset} `,
    currentVariant === "B"
      ? `${ANSI.bgMagenta} [2] Timeline Stream ${ANSI.reset}`
      : ` ${ANSI.dim}[2] Stream${ANSI.reset} `,
    currentVariant === "C"
      ? `${ANSI.bgCyan} [3] 3-Column Miller ${ANSI.reset}`
      : ` ${ANSI.dim}[3] 3-Column${ANSI.reset} `,
  ].join(" ");
  return `${brand}  ${variants}\n${ANSI.gray}${"─".repeat(width)}${ANSI.reset}`;
}

function renderFooter(width) {
  const line = ANSI.gray + "─".repeat(width) + ANSI.reset;
  const filterInfo = activeTagFilter
    ? `${ANSI.yellow}[Filter: #${activeTagFilter}]${ANSI.reset} `
    : "";
  const help = `${filterInfo}${ANSI.dim}${statusMessage}${ANSI.reset}`;
  return `${line}\n${help}`;
}

// ---------------- VARIANT A: Split View (List Left, Full Markdown Preview Right) ----------------
function renderVariantA(list, selected, width, height) {
  const leftWidth = Math.floor(width * 0.38);
  const rightWidth = width - leftWidth - 3;
  const innerHeight = Math.max(10, height - 5);

  const leftLines = [];
  list.forEach((item, idx) => {
    const isSel = idx === selected;
    const prefix = isSel ? `${ANSI.cyan}❯ ` : "  ";
    const title = (item.title || "Untitled").slice(0, leftWidth - 6);
    const date = `${ANSI.gray}${item.date.slice(5)}${ANSI.reset}`;
    const project = `${ANSI.dim}[${item.projectName}]${ANSI.reset}`;
    const tags = item.tags.map((t) => `${ANSI.magenta}#${t}${ANSI.reset}`).join(" ");

    if (isSel) {
      leftLines.push(
        `${prefix}${ANSI.bold}${ANSI.inverse}${title.padEnd(leftWidth - 4)}${ANSI.reset}`,
      );
    } else {
      leftLines.push(`${prefix}${ANSI.bold}${title}${ANSI.reset}`);
    }
    leftLines.push(`    ${project} ${date}`);
    leftLines.push(`    ${tags.slice(0, leftWidth - 6)}`);
    leftLines.push("");
  });

  const selectedItem = list[selected] || {
    title: "",
    content: "No entries",
    tags: [],
    projectName: "",
    date: "",
  };
  const rightLines = [
    `${ANSI.bold}${ANSI.cyan}# ${selectedItem.title}${ANSI.reset}`,
    `${ANSI.gray}Project: ${ANSI.reset}${selectedItem.projectName}  ${ANSI.gray}Date: ${ANSI.reset}${selectedItem.date}`,
    `${ANSI.gray}Tags: ${selectedItem.tags.map((t) => `${ANSI.magenta}#${t}${ANSI.reset}`).join(" ")}`,
    `${ANSI.gray}${"─".repeat(rightWidth)}${ANSI.reset}`,
    "",
    ...selectedItem.content.split("\n").map((l) => {
      if (l.startsWith("#")) return `${ANSI.bold}${ANSI.yellow}${l}${ANSI.reset}`;
      if (l.startsWith(">")) return `${ANSI.dim}${ANSI.cyan}│ ${l.slice(1)}${ANSI.reset}`;
      if (l.startsWith("- [x]")) return `  ${ANSI.green}✔${ANSI.reset} ${l.slice(5)}`;
      if (l.startsWith("- [ ]")) return `  ${ANSI.gray}☐${ANSI.reset} ${l.slice(5)}`;
      if (l.startsWith("-")) return `  ${ANSI.cyan}•${ANSI.reset} ${l.slice(1)}`;
      return l;
    }),
  ];

  const output = [];
  for (let i = 0; i < innerHeight; i++) {
    const lText = (leftLines[i] || "").padEnd(leftWidth);
    const rText = rightLines[i] || "";
    output.push(`${lText} ${ANSI.gray}│${ANSI.reset} ${rText}`);
  }
  return output.join("\n");
}

// ---------------- VARIANT B: Timeline Stream (Single continuous feed) ----------------
function renderVariantB(list, selected, width, height) {
  const innerHeight = Math.max(10, height - 5);
  const outLines = [];

  list.forEach((item, idx) => {
    const isSel = idx === selected;
    const border = isSel ? ANSI.cyan : ANSI.gray;
    const bullet = isSel ? `${ANSI.bgMagenta} CURRENT ${ANSI.reset}` : `${ANSI.dim}──${ANSI.reset}`;
    outLines.push(
      `${border}┌─${bullet} ${ANSI.bold}${item.title}${ANSI.reset} ${ANSI.gray}(${item.date}) [${item.projectName}]${ANSI.reset}`,
    );
    outLines.push(
      `${border}│${ANSI.reset}  ${item.tags.map((t) => `${ANSI.magenta}#${t}${ANSI.reset}`).join(" ")}`,
    );
    const preview = item.content.split("\n").slice(0, 3).join("\n   ");
    outLines.push(
      `${border}│${ANSI.reset}   ${ANSI.dim}${preview.replace(/\n/g, `\n${border}│${ANSI.reset}   `)}${ANSI.reset}`,
    );
    outLines.push(`${border}└${"─".repeat(Math.min(width - 5, 60))}${ANSI.reset}`);
  });

  return outLines.slice(0, innerHeight).join("\n");
}

// ---------------- VARIANT C: 3-Column Miller Columns (Projects -> Notes -> Detail) ----------------
function renderVariantC(list, selected, width, height) {
  const col1W = 20;
  const col2W = 32;
  const col3W = width - col1W - col2W - 6;
  const innerHeight = Math.max(10, height - 5);

  const col1 = [
    `${ANSI.bold}${ANSI.cyan}PROJECTS${ANSI.reset}`,
    `${ANSI.gray}${"─".repeat(col1W - 2)}${ANSI.reset}`,
    ...projects.map((p) => {
      const count = entries.filter((e) => e.projectId === p.id).length;
      return `${p.name.padEnd(col1W - 7)} ${ANSI.gray}(${count})${ANSI.reset}`;
    }),
  ];

  const col2 = [
    `${ANSI.bold}${ANSI.cyan}ENTRIES${ANSI.reset}`,
    `${ANSI.gray}${"─".repeat(col2W - 2)}${ANSI.reset}`,
    ...list.map((item, idx) => {
      const isSel = idx === selected;
      const t = item.title.slice(0, col2W - 6);
      return isSel ? `${ANSI.inverse}${ANSI.cyan}❯ ${t.padEnd(col2W - 4)}${ANSI.reset}` : `  ${t}`;
    }),
  ];

  const selItem = list[selected] || { title: "", content: "", tags: [] };
  const col3 = [
    `${ANSI.bold}${ANSI.yellow}${selItem.title}${ANSI.reset}`,
    `${ANSI.gray}${"─".repeat(col3W - 2)}${ANSI.reset}`,
    ...selItem.content.split("\n"),
  ];

  const output = [];
  for (let i = 0; i < innerHeight; i++) {
    const c1 = (col1[i] || "").padEnd(col1W);
    const c2 = (col2[i] || "").padEnd(col2W);
    const c3 = col3[i] || "";
    output.push(`${c1} ${ANSI.gray}│${ANSI.reset} ${c2} ${ANSI.gray}│${ANSI.reset} ${c3}`);
  }
  return output.join("\n");
}

function render() {
  const width = process.stdout.columns || 100;
  const height = process.stdout.rows || 30;
  const filtered = getFilteredEntries();

  if (selectedIndex >= filtered.length) {
    selectedIndex = Math.max(0, filtered.length - 1);
  }

  process.stdout.write(ANSI.clearScreen);
  console.log(renderHeader(width));

  if (currentVariant === "A") {
    console.log(renderVariantA(filtered, selectedIndex, width, height));
  } else if (currentVariant === "B") {
    console.log(renderVariantB(filtered, selectedIndex, width, height));
  } else if (currentVariant === "C") {
    console.log(renderVariantC(filtered, selectedIndex, width, height));
  }

  console.log(renderFooter(width));
}

// Interactive Setup
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on("keypress", (str, key) => {
  if (key.ctrl && key.name === "c") {
    cleanupAndExit();
  }

  const filtered = getFilteredEntries();

  switch (key.name) {
    case "q":
      cleanupAndExit();
      break;
    case "1":
      currentVariant = "A";
      statusMessage = "Switched to [1] Split View (OpenCode style)";
      render();
      break;
    case "2":
      currentVariant = "B";
      statusMessage = "Switched to [2] Timeline Stream View";
      render();
      break;
    case "3":
      currentVariant = "C";
      statusMessage = "Switched to [3] 3-Column Miller View";
      render();
      break;
    case "j":
    case "down":
      if (selectedIndex < filtered.length - 1) {
        selectedIndex++;
        render();
      }
      break;
    case "k":
    case "up":
      if (selectedIndex > 0) {
        selectedIndex--;
        render();
      }
      break;
    case "n":
      // Simulate Quick Capture
      const newEntry = {
        id: `e${Date.now()}`,
        projectId: "p1",
        projectName: "Inbox",
        date: "Just now",
        tags: ["quick-captured"],
        title: `Quick capture note #${entries.length + 1}`,
        content: `Captured via quick capture test!\n\nThis note is filed under #Inbox.`,
      };
      entries.unshift(newEntry);
      selectedIndex = 0;
      statusMessage = `Created quick note: "${newEntry.title}"`;
      render();
      break;
    case "t":
      // Toggle tag filter
      if (!activeTagFilter) {
        activeTagFilter = "prototype";
        statusMessage = "Filtered by tag: #prototype (press 't' to clear)";
      } else {
        activeTagFilter = null;
        statusMessage = "Cleared tag filter";
      }
      selectedIndex = 0;
      render();
      break;
  }
});

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
