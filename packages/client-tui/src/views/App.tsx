import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import React, { useEffect, useState } from "react";
import { client, config, fetchEntries, fetchProjects, fetchTags } from "../api/client.js";
import { openExternalEditor } from "../editor.js";
import { detectSuggestionQuery } from "../suggest.js";
import { getTheme } from "../theme.js";

interface Entry {
  id: string;
  projectId: string;
  projectName: string;
  content: string;
  tags: string[];
  createdAt: number;
}

interface Project {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  entryCount: number;
}

export function App() {
  const { width = 100, height = 30 } = useTerminalDimensions();
  const icons = config.appearance.use_nerd_font ? config.icons.nerd : config.icons.plain;
  const theme = getTheme(config.appearance.theme);

  const [currentTab, setCurrentTab] = useState<"TIMELINE" | "PROJECTS">("TIMELINE");
  const [inputMode, setInputMode] = useState<
    "NONE" | "CAPTURE" | "NEW_PROJECT" | "EDIT_PROJECT" | "EDIT_TAGS" | "FILTER" | "HELP"
  >("NONE");
  const [filterQuery, setFilterQuery] = useState("");
  const [inputBuffer, setInputBuffer] = useState("");
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableTags, setAvailableTags] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedEntryIdx, setSelectedEntryIdx] = useState(0);
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    `[${config.keymaps.view_timeline}] Timeline | [${config.keymaps.view_projects}] Projects | [${config.keymaps.quick_capture}] Note | [${config.keymaps.new_project}] Project | [${config.keymaps.quit}] Quit`,
  );

  async function reloadData() {
    const [entriesData, projectsData, tagsData] = await Promise.all([
      fetchEntries(),
      fetchProjects(),
      fetchTags(),
    ]);
    setEntries(entriesData || []);
    setProjects(projectsData || []);
    setAvailableTags(tagsData || []);
  }

  useEffect(() => {
    reloadData();
  }, []);

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      e.content.toLowerCase().includes(q) ||
      e.projectName.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

  function getSuggestions() {
    if (inputMode !== "CAPTURE" && inputMode !== "EDIT_TAGS") return null;
    const queryInfo = detectSuggestionQuery(inputBuffer);
    if (!queryInfo) return null;

    if (queryInfo.type === "project") {
      const matches = projects
        .filter((p) => p.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()))
        .map((p) => p.name);
      return { ...queryInfo, matches };
    }
    const matches = availableTags
      .filter((t) => t.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()))
      .map((t) => t.name);
    return { ...queryInfo, matches };
  }

  // Keyboard navigation and modal shortcuts
  useKeyboard(async (key) => {
    const keyName = key.name;
    const str = key.sequence || key.name;

    if (key.ctrl && keyName === "c") {
      process.exit(0);
    }

    if (inputMode === "HELP") {
      setInputMode("NONE");
      return;
    }

    if (inputMode !== "NONE") {
      if (key.ctrl && keyName === "w") {
        setInputBuffer((prev) => prev.replace(/(?:[^\s]+|\s+)\s*$/, ""));
        return;
      }
      if (key.ctrl && keyName === "u") {
        setInputBuffer("");
        return;
      }
      if (keyName === "return") {
        await commitModalInput();
        return;
      }
      if (keyName === "escape") {
        if (inputMode === "FILTER") {
          setFilterQuery("");
        }
        setInputMode("NONE");
        setInputBuffer("");
        setStatusMessage("Cancelled");
        return;
      }
      if (keyName === "tab") {
        applySuggestion();
        return;
      }
      if (keyName === "backspace") {
        setInputBuffer((prev) => prev.slice(0, -1));
        return;
      }
      if (str && str.length === 1 && !key.ctrl && !key.meta) {
        setInputBuffer((prev) => prev + str);
        return;
      }
      return;
    }

    // Normal Mode Keybindings
    if (keyName === config.keymaps.view_timeline || str === config.keymaps.view_timeline) {
      setCurrentTab("TIMELINE");
      setStatusMessage("Timeline View");
    } else if (keyName === config.keymaps.view_projects || str === config.keymaps.view_projects) {
      setCurrentTab("PROJECTS");
      setStatusMessage("Projects View");
    } else if (keyName === config.keymaps.down || str === config.keymaps.down) {
      if (currentTab === "TIMELINE") {
        setSelectedEntryIdx((prev) => Math.min(prev + 1, Math.max(0, filteredEntries.length - 1)));
      } else {
        setSelectedProjectIdx((prev) =>
          Math.min(prev + 1, Math.max(0, filteredProjects.length - 1)),
        );
      }
    } else if (keyName === config.keymaps.up || str === config.keymaps.up) {
      if (currentTab === "TIMELINE") {
        setSelectedEntryIdx((prev) => Math.max(0, prev - 1));
      } else {
        setSelectedProjectIdx((prev) => Math.max(0, prev - 1));
      }
    } else if (keyName === config.keymaps.quick_capture || str === config.keymaps.quick_capture) {
      setInputMode("CAPTURE");
      setInputBuffer("");
      setStatusMessage("Quick Capture: @project #tags note content");
    } else if (keyName === config.keymaps.new_project || str === config.keymaps.new_project) {
      setInputMode("NEW_PROJECT");
      setInputBuffer("");
      setStatusMessage("Enter new project name");
    } else if (keyName === config.keymaps.edit_project || str === config.keymaps.edit_project) {
      if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
        setInputMode("EDIT_PROJECT");
        setInputBuffer(filteredEntries[selectedEntryIdx].projectName);
        setStatusMessage("Reassign note project (@name)");
      }
    } else if (keyName === config.keymaps.edit_tags || str === config.keymaps.edit_tags) {
      if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
        setInputMode("EDIT_TAGS");
        setInputBuffer(filteredEntries[selectedEntryIdx].tags.join(", "));
        setStatusMessage("Edit note tags (comma-separated)");
      }
    } else if (keyName === config.keymaps.search_filter || str === config.keymaps.search_filter) {
      setInputMode("FILTER");
      setInputBuffer(filterQuery);
      setStatusMessage("Filter stream (type text, @project, #tag)");
    } else if (keyName === config.keymaps.help || str === config.keymaps.help) {
      setInputMode("HELP");
    } else if (keyName === config.keymaps.cancel || str === config.keymaps.cancel) {
      if (filterQuery) {
        setFilterQuery("");
        setStatusMessage("Filter cleared");
      }
    } else if (
      keyName === config.keymaps.edit_project_content ||
      str === config.keymaps.edit_project_content
    ) {
      if (currentTab === "PROJECTS" && filteredProjects[selectedProjectIdx]) {
        const targetProj = filteredProjects[selectedProjectIdx];
        const updated = openExternalEditor(targetProj.content);
        if (updated !== targetProj.content) {
          await client.projects[":id"].content.$patch({
            param: { id: targetProj.id },
            json: { content: updated },
          });
          await reloadData();
          setStatusMessage(`Updated content for @${targetProj.name}`);
        }
      }
    } else if (keyName === config.keymaps.quit || str === config.keymaps.quit) {
      process.exit(0);
    }
  });

  function applySuggestion() {
    const sug = getSuggestions();
    if (!sug || sug.matches.length === 0) return;
    const match = sug.matches[activeSuggestionIdx % sug.matches.length];
    const prefix = sug.type === "project" ? "@" : "#";
    const before = inputBuffer.slice(0, sug.triggerIndex);
    setInputBuffer(`${before}${prefix}${match} `);
    setActiveSuggestionIdx(0);
  }

  async function commitModalInput() {
    if (inputMode === "CAPTURE") {
      if (inputBuffer.trim()) {
        await client.capture.$post({
          json: {
            raw: inputBuffer.trim(),
            defaultProject: config.defaults.project,
            defaultTags: config.defaults.tags,
          },
        });
        await reloadData();
        setStatusMessage("Captured new journal entry!");
      }
    } else if (inputMode === "NEW_PROJECT") {
      const name = inputBuffer.trim();
      if (name) {
        await client.projects.$post({
          json: { name, content: `# Project: ${name}\n\nCreated: ${new Date().toISOString()}` },
        });
        await reloadData();
        setStatusMessage(`Created project @${name}`);
      }
    } else if (inputMode === "FILTER") {
      setFilterQuery(inputBuffer.trim());
      setStatusMessage(inputBuffer.trim() ? `Filter: "${inputBuffer.trim()}"` : "Filter cleared");
    } else if (inputMode === "EDIT_PROJECT") {
      const entry = filteredEntries[selectedEntryIdx];
      const targetProj = inputBuffer.trim().replace(/^@/, "");
      if (entry && targetProj) {
        await client.entries[":id"].project.$patch({
          param: { id: entry.id },
          json: { projectName: targetProj },
        });
        await reloadData();
        setStatusMessage(`Note reassigned to @${targetProj}`);
      }
    } else if (inputMode === "EDIT_TAGS") {
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
        setStatusMessage("Updated note tags!");
      }
    }

    setInputMode("NONE");
    setInputBuffer("");
  }

  const selProj = filteredProjects[selectedProjectIdx] || {
    name: "None",
    content: "",
    entryCount: 0,
  };

  return (
    <box flexDirection="column" width={width} height={height}>
      {/* Top Header / Tabs */}
      <box height={2} flexDirection="column">
        <box flexDirection="row">
          <text fg={theme.primary}>{`${icons.journal} JOURNALS`}</text>
          <text> </text>
          {currentTab === "TIMELINE" ? (
            <text bg={theme.secondary} fg={theme.selectedFg}>
              {" [1] Timeline Stream "}
            </text>
          ) : (
            <text fg={theme.muted}>{" [1] Timeline "}</text>
          )}
          <text> </text>
          {currentTab === "PROJECTS" ? (
            <text bg={theme.primary} fg={theme.selectedFg}>
              {" [2] Projects & Preview "}
            </text>
          ) : (
            <text fg={theme.muted}>{" [2] Projects "}</text>
          )}
        </box>
        <text fg={theme.border}>{"─".repeat(width)}</text>
      </box>

      {/* Main Content Area */}
      <box flexGrow={1} flexDirection="column">
        {currentTab === "TIMELINE" ? (
          filteredEntries.length === 0 ? (
            <box padding={1}>
              <text fg={theme.muted}>
                {filterQuery
                  ? `No notes matching filter "${filterQuery}". Press '/' or Esc to clear.`
                  : `No journal notes yet. Press '${config.keymaps.quick_capture}' to create one!`}
              </text>
            </box>
          ) : (
            <scrollbox flexGrow={1}>
              {filteredEntries.map((item, idx) => {
                const isSel = idx === selectedEntryIdx;
                const time = new Date(item.createdAt).toTimeString().slice(0, 5);
                return (
                  <box key={item.id} flexDirection="column" marginBottom={1}>
                    <box flexDirection="row">
                      <text fg={isSel ? theme.primary : theme.border}>{"┌── "}</text>
                      {isSel && (
                        <text bg={theme.selectedBg} fg={theme.selectedFg}>
                          {" SELECTED "}
                        </text>
                      )}
                      <text fg={theme.muted}>{` ${time} `}</text>
                      <text fg={theme.secondary}>{`${icons.project} @${item.projectName}`}</text>
                      <text> </text>
                      {item.tags.map((t) => (
                        <text key={t} fg={theme.tag}>{`${icons.tag} #${t} `}</text>
                      ))}
                    </box>
                    {item.content.split("\n").map((line, lIdx) => (
                      <box key={lIdx} flexDirection="row">
                        <text fg={isSel ? theme.primary : theme.border}>{"│ "}</text>
                        <text fg={theme.fg}>{line}</text>
                      </box>
                    ))}
                    <text fg={isSel ? theme.primary : theme.border}>{"└───"}</text>
                  </box>
                );
              })}
            </scrollbox>
          )
        ) : (
          <box flexDirection="row" flexGrow={1}>
            {/* Projects List (Left Column) */}
            <box width={28} flexDirection="column">
              <text fg={theme.primary}>{`${icons.project} PROJECTS`}</text>
              <text fg={theme.border}>{"─".repeat(26)}</text>
              <scrollbox flexGrow={1}>
                {filteredProjects.map((p, idx) => {
                  const isSel = idx === selectedProjectIdx;
                  return (
                    <box key={p.id}>
                      {isSel ? (
                        <text
                          fg={theme.primary}
                          bg={theme.border}
                        >{`❯ ${p.name} (${p.entryCount})`}</text>
                      ) : (
                        <text fg={theme.fg}>{`  ${p.name} (${p.entryCount})`}</text>
                      )}
                    </box>
                  );
                })}
              </scrollbox>
            </box>

            <text fg={theme.border}>{"│ "}</text>

            {/* Project Details & Preview (Right Column) */}
            <box flexGrow={1} flexDirection="column">
              <text fg={theme.accent}>{`Preview: ${selProj.name} `}</text>
              <text
                fg={theme.muted}
              >{`[Press '${config.keymaps.edit_project_content}' to edit in $EDITOR]`}</text>
              <text fg={theme.border}>{"─".repeat(Math.max(10, width - 32))}</text>
              <scrollbox flexGrow={1}>
                {selProj.content.split("\n").map((line, lIdx) => (
                  <text key={lIdx} fg={line.startsWith("#") ? theme.primary : theme.fg}>
                    {line}
                  </text>
                ))}
                <text fg={theme.border}>{"─".repeat(Math.max(10, width - 32))}</text>
                <text fg={theme.muted}>{`Associated Notes in @${selProj.name}:`}</text>
                {entries
                  .filter((e) => e.projectName.toLowerCase() === selProj.name.toLowerCase())
                  .map((e) => (
                    <text key={e.id} fg={theme.fg}>
                      {`• ${new Date(e.createdAt).toISOString().slice(0, 10)} ${e.content.split("\n")[0]}`}
                    </text>
                  ))}
              </scrollbox>
            </box>
          </box>
        )}
      </box>

      {/* Floating / Input Modals */}
      {inputMode === "CAPTURE" && (
        <box
          position="absolute"
          top={Math.max(2, Math.floor(height / 4))}
          left={Math.max(4, Math.floor(width / 6))}
          width={Math.min(70, width - 8)}
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.primary}
          backgroundColor={theme.bg}
          padding={1}
        >
          <text bg={theme.primary} fg={theme.selectedFg}>{` ${icons.quick} QUICK CAPTURE `}</text>
          <text fg={theme.muted}>{"Syntax: Note text @project #tags [Tab for suggestion]"}</text>
          <text fg={theme.fg}>{`> ${inputBuffer}█`}</text>
          {getSuggestions() && getSuggestions()!.matches.length > 0 && (
            <box flexDirection="row" marginTop={1}>
              <text fg={theme.accent}>{"Suggestions: "}</text>
              {getSuggestions()!
                .matches.slice(0, 4)
                .map((m, idx) => (
                  <text
                    key={m}
                    fg={idx === activeSuggestionIdx ? theme.selectedFg : theme.muted}
                    bg={idx === activeSuggestionIdx ? theme.primary : undefined}
                  >
                    {`[${getSuggestions()!.type === "project" ? "@" : "#"}${m}] `}
                  </text>
                ))}
            </box>
          )}
          <text fg={theme.muted} marginTop={1}>
            {"[Enter: Save] [Esc: Cancel]"}
          </text>
        </box>
      )}

      {inputMode === "NEW_PROJECT" && (
        <box
          position="absolute"
          top={Math.max(2, Math.floor(height / 4))}
          left={Math.max(4, Math.floor(width / 6))}
          width={Math.min(70, width - 8)}
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.primary}
          backgroundColor={theme.bg}
          padding={1}
        >
          <text fg={theme.primary}>{`${icons.project} CREATE NEW PROJECT`}</text>
          <text fg={theme.fg}>{`Project Name: ${inputBuffer}█`}</text>
          <text fg={theme.muted}>{"[Enter: Create] [Esc: Cancel]"}</text>
        </box>
      )}

      {inputMode === "FILTER" && (
        <box
          position="absolute"
          top={Math.max(2, Math.floor(height / 4))}
          left={Math.max(4, Math.floor(width / 6))}
          width={Math.min(70, width - 8)}
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.accent}
          backgroundColor={theme.bg}
          padding={1}
        >
          <text fg={theme.accent}>{"/ FILTER & SEARCH"}</text>
          <text fg={theme.fg}>{`Query: ${inputBuffer}█`}</text>
          <text fg={theme.muted}>{"[Enter: Apply] [Esc: Clear]"}</text>
        </box>
      )}

      {inputMode === "HELP" && (
        <box
          position="absolute"
          top={2}
          left={Math.max(2, Math.floor(width / 6))}
          width={Math.min(74, width - 4)}
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.primary}
          backgroundColor={theme.bg}
          padding={1}
        >
          <text fg={theme.primary}>{"? KEYBOARD SHORTCUTS & HELP"}</text>
          <text fg={theme.fg}>{"[1] Switch to Daily Timeline Stream View"}</text>
          <text fg={theme.fg}>{"[2] Switch to Projects & Markdown Preview View"}</text>
          <text fg={theme.fg}>{"[j / k] Navigate entries / projects"}</text>
          <text fg={theme.fg}>{"[n] 1-Line Quick Capture (Syntax: text @proj #tag)"}</text>
          <text fg={theme.fg}>{"[N] Create new project"}</text>
          <text fg={theme.fg}>{"[p] Reassign project for selected note"}</text>
          <text fg={theme.fg}>{"[t] Edit tags for selected note"}</text>
          <text fg={theme.fg}>{"[e] Edit project markdown content in $EDITOR"}</text>
          <text fg={theme.fg}>{"[/] Search / filter stream or projects"}</text>
          <text fg={theme.fg}>{"[Tab] Accept suggestions when typing"}</text>
          <text fg={theme.fg}>{"[Ctrl+W] Delete word | [Ctrl+U] Clear line"}</text>
          <text fg={theme.fg}>{"[Esc] Cancel prompt / Clear filter"}</text>
          <text fg={theme.fg}>{"[q] Quit application"}</text>
          <text fg={theme.muted} marginTop={1}>
            {"Press any key or Esc to dismiss"}
          </text>
        </box>
      )}

      {/* Anchored Bottom Status Line */}
      <box height={2} flexDirection="column">
        <text fg={theme.border}>{"─".repeat(width)}</text>
        <box flexDirection="row">
          {filterQuery && <text fg={theme.accent}>{`[Filter: "${filterQuery}"] `}</text>}
          <text fg={theme.primary}>{"[1]"}</text>
          <text fg={theme.fg}>{"Stream "}</text>
          <text fg={theme.primary}>{"[2]"}</text>
          <text fg={theme.fg}>{"Projects "}</text>
          <text fg={theme.primary}>{"[n]"}</text>
          <text fg={theme.fg}>{"Note "}</text>
          <text fg={theme.primary}>{"[N]"}</text>
          <text fg={theme.fg}>{"Project "}</text>
          <text fg={theme.primary}>{"[/]"}</text>
          <text fg={theme.fg}>{"Filter "}</text>
          <text fg={theme.primary}>{"[?]"}</text>
          <text fg={theme.fg}>{"Help "}</text>
          <text fg={theme.primary}>{"[q]"}</text>
          <text fg={theme.fg}>{"Quit "}</text>
          <text fg={theme.muted}>{statusMessage}</text>
        </box>
      </box>
    </box>
  );
}
