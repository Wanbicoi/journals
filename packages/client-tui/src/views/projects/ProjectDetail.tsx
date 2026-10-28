import { formatRecurrenceRule } from "@journals/core";
import { useIcons } from "../../contexts/icons.js";
import { useTheme } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/queries.js";
import { useMarkdownSyntaxStyle } from "../../hooks/useMarkdownSyntaxStyle.js";
import { ProjectNoteRow } from "./ProjectNoteRow.js";

interface ProjectDetailProps {
  projectName: string;
  content: string;
  recurrence?: string | null;
  missedPolicy?: string;
  notes: Entry[];
}

function capitalize(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function policyLabel(policy: string | undefined): string {
  return capitalize((policy ?? "spike").replace(/_/g, " "));
}

export function ProjectDetail({
  projectName,
  content,
  recurrence,
  missedPolicy,
  notes,
}: ProjectDetailProps) {
  const icons = useIcons();
  const theme = useTheme();
  const syntaxStyle = useMarkdownSyntaxStyle(theme);
  const routineLabel = recurrence
    ? capitalize(formatRecurrenceRule(recurrence) || recurrence)
    : "None";

  return (
    <box flexGrow={1} flexDirection="column">
      {/* Right Header: Project details banner */}
      <box flexDirection="column" marginBottom={1}>
        <box flexDirection="row">
          <text fg={theme.secondary}>{`${icons.project} @${projectName}`}</text>
          <text
            fg={theme.muted}
          >{` ${icons.bullet} ${notes.length} associated note${notes.length === 1 ? "" : "s"}`}</text>
        </box>
        <box flexDirection="row">
          <text fg={theme.muted}>{`${icons.calendar} Routine: ${routineLabel}`}</text>
          <text fg={theme.muted}>{` ${icons.bullet} Policy: ${policyLabel(missedPolicy)}`}</text>
        </box>
      </box>

      <scrollbox flexGrow={1}>
        {/* Project Markdown / Description */}
        <box
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.border}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={0}
          paddingBottom={0}
          marginBottom={1}
        >
          {content ? (
            <markdown content={content} syntaxStyle={syntaxStyle} />
          ) : (
            <text fg={theme.muted}>{"No project overview notes."}</text>
          )}
        </box>

        {/* Associated Notes Section */}
        <box flexDirection="row" marginTop={1}>
          <text fg={theme.accent}>{`${icons.journal} Associated Notes`}</text>
        </box>

        {notes.length === 0 ? (
          <text fg={theme.muted}>{"  No notes logged under this project yet."}</text>
        ) : (
          notes.map((entry) => <ProjectNoteRow key={entry.id} entry={entry} />)
        )}
      </scrollbox>
    </box>
  );
}
