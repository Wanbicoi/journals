import React, { useEffect, useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { client, config, fetchEntries, fetchProjects, fetchTags } from "../api/client.js";
import { openExternalEditor } from "../editor.js";
import { detectSuggestionQuery } from "../suggest.js";

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
    setEntries(entriesData);
    setProjects(projectsData);
    setAvailableTags(tagsData);
  }

  useEffect(() => {
    reloadData();
  }, []);

  const filteredEntries = filterQuery.trim()
    ? entries.filter(
        (e) =>
          e.content.toLowerCase().includes(filterQuery.toLowerCase()) ||
          e.projectName.toLowerCase().includes(filterQuery.toLowerCase()) ||
          e.tags.some((t) => t.toLowerCase().includes(filterQuery.toLowerCase())),
      )
    : entries;

  const filteredProjects = filterQuery.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(filterQuery.toLowerCase()),
      )
    : projects;

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

    // Normal navigation
    if (str === config.keymaps.help || keyName === "help") {
      setInputMode("HELP");
      return;
    }

    if (str === config.keymaps.search_filter) {
      setInputMode("FILTER");
      setInputBuffer(filterQuery);
      setStatusMessage("Type search query and press Enter");
      return;
    }

    if (keyName === "escape") {
      if (filterQuery) {
        setFilterQuery("");
        setStatusMessage("Cleared filter");
        return;
      }
    }

    if (keyName === config.keymaps.view_timeline || str === config.keymaps.view_timeline) {
      setCurrentTab("TIMELINE");
      setStatusMessage("Timeline Stream View");
    } else if (keyName === config.keymaps.view_projects || str === config.keymaps.view_projects) {
      setCurrentTab("PROJECTS");
      setStatusMessage(
        `Projects View: j/k select, '${config.keymaps.edit_project_content}' edit in $EDITOR`,
      );
    } else if (keyName === config.keymaps.down) {
      if (currentTab === "TIMELINE" && selectedEntryIdx < filteredEntries.length - 1) {
        setSelectedEntryIdx((i) => i + 1);
      } else if (currentTab === "PROJECTS" && selectedProjectIdx < filteredProjects.length - 1) {
        setSelectedProjectIdx((i) => i + 1);
      }
    } else if (keyName === config.keymaps.up) {
      if (currentTab === "TIMELINE" && selectedEntryIdx > 0) {
        setSelectedEntryIdx((i) => i - 1);
      } else if (currentTab === "PROJECTS" && selectedProjectIdx > 0) {
        setSelectedProjectIdx((i) => i - 1);
      }
    } else if (keyName === config.keymaps.quick_capture || str === config.keymaps.quick_capture) {
      setInputMode("CAPTURE");
      setInputBuffer("");
      setStatusMessage("Type note (@project #tags) and press Enter");
    } else if (str === config.keymaps.new_project || keyName === config.keymaps.new_project) {
      setInputMode("NEW_PROJECT");
      setInputBuffer("");
      setStatusMessage("Type project name and press Enter");
    } else if (keyName === config.keymaps.edit_project || str === config.keymaps.edit_project) {
      if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
        setInputMode("EDIT_PROJECT");
        setInputBuffer(filteredEntries[selectedEntryIdx].projectName);
        setStatusMessage("Edit project and hit Enter");
      }
    } else if (keyName === config.keymaps.edit_tags || str === config.keymaps.edit_tags) {
      if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
        setInputMode("EDIT_TAGS");
        setInputBuffer(filteredEntries[selectedEntryIdx].tags.join(", "));
        setStatusMessage("Edit tags and hit Enter");
      }
    } else if (
      keyName === config.keymaps.edit_project_content ||
      str === config.keymaps.edit_project_content
    ) {
      if (currentTab === "PROJECTS" && filteredProjects[selectedProjectIdx]) {
        const targetProj = filteredProjects[selectedProjectIdx];
        const updated = openExternalEditor(targetProj.content);
        if (updated !== targetProj.content) {
          await client.projects[":id"].content.$put({
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
    if (inputMode === "CAPTURE") {
      const suggestions = getSuggestions();
      if (suggestions && suggestions.matches.length > 0) {
        const choice = suggestions.matches[activeSuggestionIdx] || suggestions.matches[0];
        const prefix = suggestions.type === "project" ? "@" : "#";
        const before = inputBuffer.slice(0, suggestions.triggerIndex);
        setInputBuffer(`${before}${prefix}${choice} `);
      }
    } else if (inputMode === "EDIT_PROJECT") {
      const match = projects.find((p) =>
        p.name.toLowerCase().startsWith(inputBuffer.toLowerCase()),
      );
      if (match) {
        setInputBuffer(match.name);
      }
    } else if (inputMode === "EDIT_TAGS") {
      const parts = inputBuffer.split(",");
      const currentTag = parts[parts.length - 1].trim().toLowerCase();
      const match = availableTags.find((t) => t.name.toLowerCase().startsWith(currentTag));
      if (match) {
        parts[parts.length - 1] = ` ${match.name}`;
        setInputBuffer(parts.join(","));
      }
    }
  }

  async function commitModalInput() {
    if (inputMode === "FILTER") {
      setFilterQuery(inputBuffer.trim());
      setSelectedEntryIdx(0);
      setSelectedProjectIdx(0);
      setStatusMessage(
        inputBuffer.trim()
          ? `Filtering by: "${inputBuffer.trim()}" (Esc to clear)`
          : "Filter cleared",
      );
    } else if (inputMode === "NEW_PROJECT" && inputBuffer.trim()) {
      await client.projects.$post({
        json: {
          name: inputBuffer.trim(),
          content: `# ${inputBuffer.trim()}\n`,
        },
      });
      await reloadData();
      setCurrentTab("PROJECTS");
      const foundIdx = projects.findIndex(
        (p) => p.name.toLowerCase() === inputBuffer.trim().toLowerCase(),
      );
      if (foundIdx !== -1) setSelectedProjectIdx(foundIdx);
      setStatusMessage(`Created project: @${inputBuffer.trim()}`);
    } else if (inputMode === "CAPTURE" && inputBuffer.trim()) {
      await client.capture.$post({
        json: {
          raw: inputBuffer.trim(),
          defaultProject: config.defaults.project,
          defaultTags: config.defaults.tags,
        },
      });
      await reloadData();
      setSelectedEntryIdx(0);
      setStatusMessage("Captured note successfully!");
    } else if (inputMode === "EDIT_PROJECT" && inputBuffer.trim()) {
      const entry = filteredEntries[selectedEntryIdx];
      if (entry) {
        await client.entries[":id"].project.$patch({
          param: { id: entry.id },
          json: { projectName: inputBuffer.trim() },
        });
        await reloadData();
        setStatusMessage("Updated note project!");
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
          <text fg="cyan">{`${icons.journal} JOURNALS`}</text>
          <text> </text>
          {currentTab === "TIMELINE" ? (
            <text bg="blue" fg="white">
              {" [1] Timeline Stream "}
            </text>
          ) : (
            <text fg="gray">{" [1] Timeline "}</text>
          )}
          <text> </text>
          {currentTab === "PROJECTS" ? (
            <text bg="cyan" fg="black">
              {" [2] Projects & Preview "}
            </text>
          ) : (
            <text fg="gray">{" [2] Projects "}</text>
          )}
        </box>
        <text fg="gray">{"─".repeat(width)}</text>
      </box>

      {/* Main Content Area */}
      <box flexGrow={1} flexDirection="column">
        {currentTab === "TIMELINE" ? (
          filteredEntries.length === 0 ? (
            <box padding={1}>
              <text fg="gray">
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
                      <text fg={isSel ? "cyan" : "gray"}>{"┌── "}</text>
                      {isSel && (
                        <text bg="cyan" fg="black">
                          {" SELECTED "}
                        </text>
                      )}
                      <text fg="gray">{` ${time} `}</text>
                      <text fg="blue">{`${icons.project} @${item.projectName}`}</text>
                      <text> </text>
                      {item.tags.map((t) => (
                        <text key={t} fg="magenta">{`${icons.tag} #${t} `}</text>
                      ))}
                    </box>
                    {item.content.split("\n").map((line, lIdx) => (
                      <box key={lIdx} flexDirection="row">
                        <text fg={isSel ? "cyan" : "gray"}>{"│ "}</text>
                        <text>{line}</text>
                      </box>
                    ))}
                    <text fg={isSel ? "cyan" : "gray"}>{"└───"}</text>
                  </box>
                );
              })}
            </scrollbox>
          )
        ) : (
          <box flexDirection="row" flexGrow={1}>
            {/* Projects List (Left Column) */}
            <box width={28} flexDirection="column">
              <text fg="cyan">{`${icons.project} PROJECTS`}</text>
              <text fg="gray">{"─".repeat(26)}</text>
              <scrollbox flexGrow={1}>
                {filteredProjects.map((p, idx) => {
                  const isSel = idx === selectedProjectIdx;
                  return (
                    <box key={p.id}>
                      {isSel ? (
                        <text fg="cyan" bg="gray">{`❯ ${p.name} (${p.entryCount})`}</text>
                      ) : (
                        <text>{`  ${p.name} (${p.entryCount})`}</text>
                      )}
                    </box>
                  );
                })}
              </scrollbox>
            </box>

            <text fg="gray">{"│ "}</text>

            {/* Project Details & Preview (Right Column) */}
            <box flexGrow={1} flexDirection="column">
              <text fg="yellow">{`Preview: ${selProj.name} `}</text>
              <text fg="gray">{`[Press '${config.keymaps.edit_project_content}' to edit in $EDITOR]`}</text>
              <text fg="gray">{"─".repeat(Math.max(10, width - 32))}</text>
              <scrollbox flexGrow={1}>
                {selProj.content.split("\n").map((line, lIdx) => (
                  <text key={lIdx} fg={line.startsWith("#") ? "cyan" : undefined}>
                    {line}
                  </text>
                ))}
                <text fg="gray">{"─".repeat(Math.max(10, width - 32))}</text>
                <text fg="gray">{`Associated Notes in @${selProj.name}:`}</text>
                {entries
                  .filter((e) => e.projectName.toLowerCase() === selProj.name.toLowerCase())
                  .map((e) => (
                    <text key={e.id}>
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
          borderColor="cyan"
          backgroundColor="black"
          padding={1}
        >
          <text bg="cyan" fg="black">{` ${icons.quick} QUICK CAPTURE `}</text>
          <text fg="gray">{"Syntax: Note text @project #tags [Tab for suggestion]"}</text>
          <text fg="white">{`> ${inputBuffer}█`}</text>
          {getSuggestions() && getSuggestions()!.matches.length > 0 && (
            <box flexDirection="row" marginTop={1}>
              <text fg="yellow">{"Suggestions: "}</text>
              {getSuggestions()!
                .matches.slice(0, 4)
                .map((m, idx) => (
                  <text
                    key={m}
                    fg={idx === activeSuggestionIdx ? "black" : "gray"}
                    bg={idx === activeSuggestionIdx ? "cyan" : undefined}
                  >
                    {`[${getSuggestions()!.type === "project" ? "@" : "#"}${m}] `}
                  </text>
                ))}
            </box>
          )}
          <text fg="gray" marginTop={1}>
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
          borderColor="cyan"
          backgroundColor="black"
          padding={1}
        >
          <text fg="cyan">{`${icons.project} CREATE NEW PROJECT`}</text>
          <text>{`Project Name: ${inputBuffer}█`}</text>
          <text fg="gray">{"[Enter: Create] [Esc: Cancel]"}</text>
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
          borderColor="yellow"
          backgroundColor="black"
          padding={1}
        >
          <text fg="yellow">{"/ FILTER & SEARCH"}</text>
          <text>{`Query: ${inputBuffer}█`}</text>
          <text fg="gray">{"[Enter: Apply] [Esc: Clear]"}</text>
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
          borderColor="cyan"
          backgroundColor="black"
          padding={1}
        >
          <text fg="cyan">{"? KEYBOARD SHORTCUTS & HELP"}</text>
          <text>{"[1] Switch to Daily Timeline Stream View"}</text>
          <text>{"[2] Switch to Projects & Markdown Preview View"}</text>
          <text>{"[j / k] Navigate entries / projects"}</text>
          <text>{"[n] 1-Line Quick Capture (Syntax: text @proj #tag)"}</text>
          <text>{"[N] Create new project"}</text>
          <text>{"[p] Reassign project for selected note"}</text>
          <text>{"[t] Edit tags for selected note"}</text>
          <text>{"[e] Edit project markdown content in $EDITOR"}</text>
          <text>{"[/] Search / filter stream or projects"}</text>
          <text>{"[Tab] Accept suggestions when typing"}</text>
          <text>{"[Ctrl+W] Delete word | [Ctrl+U] Clear line"}</text>
          <text>{"[Esc] Cancel prompt / Clear filter"}</text>
          <text>{"[q] Quit application"}</text>
          <text fg="gray" marginTop={1}>
            {"Press any key or Esc to dismiss"}
          </text>
        </box>
      )}

      {/* Anchored Bottom Status Line */}
      <box height={2} flexDirection="column">
        <text fg="gray">{"─".repeat(width)}</text>
        <box flexDirection="row">
          {filterQuery && <text fg="yellow">{`[Filter: "${filterQuery}"] `}</text>}
          <text fg="cyan">{"[1]"}</text>
          <text>{"Stream "}</text>
          <text fg="cyan">{"[2]"}</text>
          <text>{"Projects "}</text>
          <text fg="cyan">{"[n]"}</text>
          <text>{"Note "}</text>
          <text fg="cyan">{"[N]"}</text>
          <text>{"Project "}</text>
          <text fg="cyan">{"[/]"}</text>
          <text>{"Filter "}</text>
          <text fg="cyan">{"[?]"}</text>
          <text>{"Help "}</text>
          <text fg="cyan">{"[q]"}</text>
          <text>{"Quit "}</text>
          <text fg="gray">{statusMessage}</text>
        </box>
      </box>
    </box>
  );
}
