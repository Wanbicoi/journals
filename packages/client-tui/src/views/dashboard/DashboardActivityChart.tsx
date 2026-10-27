import { BiDirectionalBarChart } from "../../components/BiDirectionalBarChart.js";
import { useIcons } from "../../contexts/icons.js";
import { useTheme } from "../../contexts/theme.js";
import type { DashboardData } from "../../hooks/useJournalData.js";

interface DashboardActivityChartProps {
  dashboard: DashboardData;
  focusedDayIdx: number;
  onFocusIdx?: (idx: number) => void;
  onNavigateDate: (dateStr: string) => void;
}

// @unit journals.views.dashboard-chart
// @summary Render the activity chart and focus a day
export function DashboardActivityChart({
  dashboard,
  focusedDayIdx,
  onFocusIdx,
  onNavigateDate,
}: DashboardActivityChartProps) {
  const icons = useIcons();
  const theme = useTheme();

  // Map 60-day metrics to bar data points
  // Missed (+Y) = routines with no journal that day
  // Breaks (-Y) = break days
  const chartData = (dashboard.days || []).map((day) => ({
    label: day.date.slice(5), // "MM-DD"
    date: day.date,
    missedSpikes: day.missedProjectsCount ?? 0,
    breakDays: day.breakDaysCount ?? 0,
    missedProjectNames: day.missedProjectNames || [],
  }));

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.border}
      title="Last 60 days"
      titleColor={theme.primary}
      paddingLeft={1}
      paddingRight={1}
      marginTop={1}
    >
      <BiDirectionalBarChart
        data={chartData}
        height={5}
        focusedIdx={focusedDayIdx}
        onFocusIdx={onFocusIdx}
        onNavigateDate={onNavigateDate}
        icons={icons}
        theme={theme}
      />
    </box>
  );
}
