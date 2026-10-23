export interface ThemePalette {
  name: string;
  isDark: boolean;
  bg: string;
  fg: string;
  muted: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  selectedBg: string;
  selectedFg: string;
  highlight: string;
  tag: string;
  project: string;
}

export const themes: Record<string, ThemePalette> = {
  "rose-pine-dawn": {
    name: "Rosé Pine Dawn",
    isDark: false,
    bg: "#faf4ed", // Base
    fg: "#575279", // Text
    muted: "#9893a5", // Muted
    primary: "#d7827e", // Rose
    secondary: "#286983", // Pine
    accent: "#ea9d34", // Gold
    border: "#cecacd", // Highlight High
    selectedBg: "#286983", // Pine
    selectedFg: "#faf4ed", // Base
    highlight: "#b4637a", // Love
    tag: "#907aa9", // Iris
    project: "#d7827e", // Rose
  },
  "rose-pine": {
    name: "Rosé Pine",
    isDark: true,
    bg: "#191724", // Base
    fg: "#e0def4", // Text
    muted: "#6e6a86", // Muted
    primary: "#ebbcba", // Rose
    secondary: "#31748f", // Pine
    accent: "#f6c177", // Gold
    border: "#403d52", // Highlight Med
    selectedBg: "#31748f", // Pine
    selectedFg: "#191724", // Base
    highlight: "#eb6f92", // Love
    tag: "#c4a7e7", // Iris
    project: "#ebbcba", // Rose
  },
  "rose-pine-moon": {
    name: "Rosé Pine Moon",
    isDark: true,
    bg: "#232136", // Base
    fg: "#e0def4", // Text
    muted: "#6e6a86", // Muted
    primary: "#ea9a97", // Rose
    secondary: "#3e8fb0", // Pine
    accent: "#f6c177", // Gold
    border: "#44415a", // Highlight Med
    selectedBg: "#3e8fb0", // Pine
    selectedFg: "#232136", // Base
    highlight: "#eb6f92", // Love
    tag: "#c4a7e7", // Iris
    project: "#ea9a97", // Rose
  },
  nord: {
    name: "Nord",
    isDark: true,
    bg: "#2e3440",
    fg: "#eceff4",
    muted: "#4c566a",
    primary: "#88c0d0",
    secondary: "#81a1c1",
    accent: "#ebcb8b",
    border: "#434c5e",
    selectedBg: "#88c0d0",
    selectedFg: "#2e3440",
    highlight: "#bf616a",
    tag: "#b48ead",
    project: "#88c0d0",
  },
  catppuccin: {
    name: "Catppuccin Mocha",
    isDark: true,
    bg: "#1e1e2e",
    fg: "#cdd6f4",
    muted: "#6c7086",
    primary: "#89b4fa",
    secondary: "#94e2d5",
    accent: "#f9e2af",
    border: "#313244",
    selectedBg: "#89b4fa",
    selectedFg: "#1e1e2e",
    highlight: "#f38ba8",
    tag: "#cba6f7",
    project: "#89b4fa",
  },
  dracula: {
    name: "Dracula",
    isDark: true,
    bg: "#282a36",
    fg: "#f8f8f2",
    muted: "#6272a4",
    primary: "#bd93f9",
    secondary: "#8be9fd",
    accent: "#ffb86c",
    border: "#44475a",
    selectedBg: "#bd93f9",
    selectedFg: "#282a36",
    highlight: "#ff5555",
    tag: "#ff79c6",
    project: "#bd93f9",
  },
  gruvbox: {
    name: "Gruvbox Dark",
    isDark: true,
    bg: "#282828",
    fg: "#ebdbb2",
    muted: "#928374",
    primary: "#fe8019",
    secondary: "#8ec07c",
    accent: "#fabd2f",
    border: "#3c3836",
    selectedBg: "#fe8019",
    selectedFg: "#282828",
    highlight: "#fb4934",
    tag: "#d3869b",
    project: "#fe8019",
  },
};

export function getTheme(themeName?: string): ThemePalette {
  const normalized = (themeName || "rose-pine-dawn").toLowerCase().replace(/[-_ ]/g, "");
  if (normalized === "rosepinedawn") return themes["rose-pine-dawn"];
  if (normalized === "rosepinemoon") return themes["rose-pine-moon"];
  if (normalized === "rosepine") return themes["rose-pine"];
  if (normalized === "catppuccin" || normalized === "mocha") return themes.catppuccin;
  if (normalized === "dracula") return themes.dracula;
  if (normalized === "gruvbox") return themes.gruvbox;
  if (normalized === "nord") return themes.nord;
  return themes["rose-pine-dawn"];
}
