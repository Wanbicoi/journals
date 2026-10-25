import type { IconSet, ReflectionPeriodType } from "@journals/core";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef } from "react";
import { config } from "../../api/client.js";
import { openExternalEditor } from "../../editor.js";
import { useReflectionDetail, useReflectionPeriods } from "../../hooks/queries.js";
import { useMarkdownSyntaxStyle } from "../../hooks/useMarkdownSyntaxStyle.js";
import { useSaveReflection } from "../../hooks/useSaveReflection.js";
import type { ThemePalette } from "../../theme.js";

interface ReflectionsViewProps {
  periodType: ReflectionPeriodType;
  onChangePeriodType: (type: ReflectionPeriodType) => void;
  selectedPeriodIdx: number;
  onSelectPeriodIdx: (idx: number) => void;
  width: number;
  icons: IconSet;
  theme: ThemePalette;
  isActive?: boolean;
  onStatusMessage?: (msg: string) => void;
  onOpenEditor?: () => void;
}

export function ReflectionsView({
  periodType,
  onChangePeriodType,
  selectedPeriodIdx,
  onSelectPeriodIdx,
  width: _width,
  icons,
  theme,
  isActive = true,
  onStatusMessage,
  onOpenEditor,
}: ReflectionsViewProps) {
  const scrollBoxRef = useRef<ScrollBoxRenderable | null>(null);
  const syntaxStyle = useMarkdownSyntaxStyle(theme);
  const saveReflection = useSaveReflection();

  const { data: periods = [] } = useReflectionPeriods(periodType);
  const selectedPeriod = periods[selectedPeriodIdx];
  const {
    data: currentDetail = null,
    isLoading: loadingDetail,
    refetch: refetchDetail,
  } = useReflectionDetail(selectedPeriod?.periodType, selectedPeriod?.periodKey);

  useKeyboard(async (key) => {
    if (!isActive) return;
    const keyName = key.name;
    const str = key.sequence || key.name;

    // Cadence switching: w, m, q, y
    if (str === "w" || str === "W" || keyName === "w") {
      onChangePeriodType("WEEK");
      onSelectPeriodIdx(0);
      onStatusMessage?.("Weekly Reflections");
    } else if (str === "m" || str === "M" || keyName === "m") {
      onChangePeriodType("MONTH");
      onSelectPeriodIdx(0);
      onStatusMessage?.("Monthly Reflections");
    } else if (str === "q" || str === "Q" || keyName === "q") {
      onChangePeriodType("QUARTER");
      onSelectPeriodIdx(0);
      onStatusMessage?.("Quarterly Reflections");
    } else if (str === "y" || str === "Y" || keyName === "y") {
      onChangePeriodType("YEAR");
      onSelectPeriodIdx(0);
      onStatusMessage?.("Yearly Reflections");
    } else if (
      keyName === "j" ||
      str === "j" ||
      keyName === "down" ||
      keyName === config.keymaps.down ||
      str === config.keymaps.down
    ) {
      onSelectPeriodIdx(Math.min(selectedPeriodIdx + 1, Math.max(0, periods.length - 1)));
    } else if (
      keyName === "k" ||
      str === "k" ||
      keyName === "up" ||
      keyName === config.keymaps.up ||
      str === config.keymaps.up
    ) {
      onSelectPeriodIdx(Math.max(0, selectedPeriodIdx - 1));
    } else if (
      keyName === "e" ||
      str === "e" ||
      keyName === "return" ||
      keyName === config.keymaps.edit_project_content ||
      str === config.keymaps.edit_project_content
    ) {
      // External editor spawn: e, Enter
      if (onOpenEditor) {
        onOpenEditor();
      } else {
        try {
          const currentP = periods[selectedPeriodIdx];
          if (currentP) {
            const { data: freshDetail } = await refetchDetail();
            const detail = freshDetail ?? currentDetail;
            const initialContent =
              detail?.reflection?.content || `# Reflection: ${currentP.label}\n\n`;
            const updated = openExternalEditor(initialContent);
            if (updated !== initialContent) {
              await saveReflection.mutateAsync({
                periodType,
                periodKey: currentP.periodKey,
                content: updated,
              });
              onStatusMessage?.(`Saved reflection for ${currentP.periodKey}`);
            }
          }
        } catch (_e) {
          onStatusMessage?.("Failed to edit reflection");
        }
      }
    }
  });

  // If index out of bounds after changing periodType or filter, reset to 0
  useEffect(() => {
    if (periods.length > 0 && selectedPeriodIdx >= periods.length) {
      onSelectPeriodIdx(0);
    }
  }, [periods.length, selectedPeriodIdx, onSelectPeriodIdx]);

  // Scroll into view
  useEffect(() => {
    if (scrollBoxRef.current && selectedPeriod) {
      scrollBoxRef.current.scrollChildIntoView(`period-${selectedPeriod.periodKey}`);
    }
  }, [selectedPeriod]);

  const loading = loadingDetail;

  const subTabs: { type: ReflectionPeriodType; key: string; label: string }[] = [
    { type: "WEEK", key: "W", label: "Weekly" },
    { type: "MONTH", key: "M", label: "Monthly" },
    { type: "QUARTER", key: "Q", label: "Quarterly" },
    { type: "YEAR", key: "Y", label: "Yearly" },
  ];

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Sub-tabs header */}
      <box flexDirection="row" paddingLeft={2} marginBottom={1}>
        <text fg={theme.muted}>{"Time Scale: "}</text>
        {subTabs.map((st) => {
          const isActive = periodType === st.type;
          return (
            <box
              key={st.type}
              flexDirection="row"
              marginRight={2}
              onMouseDown={() => onChangePeriodType(st.type)}
            >
              {isActive ? (
                <text bg={theme.selectedBg} fg={theme.selectedFg}>
                  {` [${st.key}] ${st.label} `}
                </text>
              ) : (
                <text fg={theme.muted}>{` [${st.key}] ${st.label} `}</text>
              )}
            </box>
          );
        })}
      </box>

      {/* Main Split Body */}
      <box flexDirection="row" flexGrow={1} paddingLeft={1} paddingRight={1}>
        {/* Left Column: Chronological Periods List */}
        <box
          width={40}
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.border}
          paddingLeft={1}
          paddingRight={1}
          marginRight={1}
        >
          <box flexDirection="row" marginBottom={1}>
            <text fg={theme.primary}>{`${icons.calendar} PERIODS (${periods.length})`}</text>
          </box>

          <scrollbox ref={scrollBoxRef} flexGrow={1}>
            {periods.map((p, idx) => {
              const isSel = idx === selectedPeriodIdx;
              return (
                <box
                  key={p.periodKey}
                  id={`period-${p.periodKey}`}
                  flexDirection="row"
                  justifyContent="space-between"
                  backgroundColor={isSel ? theme.border : undefined}
                  paddingLeft={1}
                  paddingRight={1}
                  onMouseDown={() => onSelectPeriodIdx(idx)}
                >
                  <box flexDirection="row">
                    <text fg={isSel ? theme.primary : theme.fg}>
                      {isSel ? `${icons.pointer} ` : "  "}
                    </text>
                    <text fg={p.hasReflection ? theme.fg : theme.accent}>{p.periodKey}</text>
                  </box>

                  {p.hasReflection ? (
                    <text fg={theme.success || theme.secondary}>{`${icons.done} done`}</text>
                  ) : (
                    <text fg={theme.muted}>{`${icons.todo} todo`}</text>
                  )}
                </box>
              );
            })}
          </scrollbox>
        </box>

        {/* Right Column: Split Top (Reflection note) & Bottom (Aggregated lower-level entries) */}
        <box flexDirection="column" flexGrow={1}>
          {/* Top Half: Reflection Preview */}
          <box
            height="50%"
            flexDirection="column"
            borderStyle="single"
            borderColor={theme.border}
            paddingLeft={1}
            paddingRight={1}
            marginBottom={1}
          >
            <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
              <text fg={theme.secondary}>
                {selectedPeriod ? `REFLECTION: ${selectedPeriod.label}` : "SELECT A PERIOD"}
              </text>
              {selectedPeriod && <text fg={theme.muted}>{"[Press 'e' or Enter to edit]"}</text>}
            </box>

            <scrollbox flexGrow={1}>
              {currentDetail?.reflection?.content.trim() ? (
                <markdown content={currentDetail.reflection.content} syntaxStyle={syntaxStyle} />
              ) : (
                <box flexDirection="column">
                  <text fg={theme.accent}>
                    {`No reflection note written for this ${periodType.toLowerCase()} yet.`}
                  </text>
                  <text fg={theme.muted}>
                    {"Press 'e' or 'Enter' to open $EDITOR and write your reflection."}
                  </text>
                </box>
              )}
            </scrollbox>
          </box>

          {/* Bottom Half: Aggregated Lower-Level Entries & Sub-reflections */}
          <box
            flexGrow={1}
            flexDirection="column"
            borderStyle="single"
            borderColor={theme.border}
            paddingLeft={1}
            paddingRight={1}
          >
            <box flexDirection="row" marginBottom={1}>
              <text fg={theme.primary}>
                {`AGGREGATED NOTES & SUB-REFLECTIONS (${(currentDetail?.entries.length || 0) + (currentDetail?.subReflections?.length || 0)})`}
              </text>
            </box>

            <scrollbox flexGrow={1}>
              {loading && <text fg={theme.muted}>Loading entries...</text>}

              {/* Display sub-reflections if any (e.g. weekly reflections inside a monthly view) */}
              {currentDetail?.subReflections && currentDetail.subReflections.length > 0 && (
                <box flexDirection="column" marginBottom={1}>
                  <text fg={theme.secondary}>{"─── Sub-Reflections ───"}</text>
                  {currentDetail.subReflections.map((sub) => (
                    <box key={sub.periodKey} flexDirection="column" marginBottom={1}>
                      <text fg={theme.accent}>{`[${sub.periodKey}] ${sub.label}`}</text>
                      <markdown content={sub.content} syntaxStyle={syntaxStyle} />
                    </box>
                  ))}
                  <text fg={theme.secondary}>{"─── Journal Entries ───"}</text>
                </box>
              )}

              {/* Display daily entries */}
              {currentDetail?.entries && currentDetail.entries.length > 0
                ? currentDetail.entries.map((entry) => {
                    const dateStr = new Date(entry.createdAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <box key={entry.id} flexDirection="column" marginBottom={1}>
                        <box flexDirection="row">
                          <text fg={theme.muted}>{`[${dateStr}] `}</text>
                          <text fg={theme.primary}>{`@${entry.projectName} `}</text>
                          {entry.tags.map((t) => (
                            <text key={t} fg={theme.secondary}>{`${icons.tag} #${t} `}</text>
                          ))}
                        </box>
                        <text fg={theme.fg}>{`  ${entry.content}`}</text>
                      </box>
                    );
                  })
                : !loading && (
                    <text fg={theme.muted}>
                      {"No lower-level journal entries found during this time period."}
                    </text>
                  )}
            </scrollbox>
          </box>
        </box>
      </box>
    </box>
  );
}
