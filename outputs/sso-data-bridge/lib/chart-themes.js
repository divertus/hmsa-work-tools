/*
 * Chart palettes adapted from the theme-factory skill:
 * theme-factory/themes/*.md
 *
 * The upstream skill and theme specifications are licensed under the
 * Apache License, Version 2.0. See the upstream LICENSE.txt for the complete
 * terms. The source palettes contain four colors; this registry expands them
 * into categorical palettes and maps the source tones to ECharts surface,
 * axis, grid, and tooltip roles.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_CHART_THEME_ID = "modern-minimalist";

const MIN_CATEGORICAL_COLORS = 8;
const MAX_CATEGORICAL_COLORS = 40;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const COLOR_FIELDS = [
  "textColor",
  "mutedTextColor",
  "backgroundColor",
  "gridColor",
  "axisColor",
  "tooltipBackground",
  "legendTextColor"
];

const BUILT_IN_THEMES = [
  {
    id: "ocean-depths",
    name: "Ocean Depths",
    description: "专业、平静的海洋主题，适合运营分析和财务看板。",
    colors: [
      "#2d8b8b",
      "#4a7fa5",
      "#68b7b5",
      "#8ecae6",
      "#2f6f7e",
      "#7fa8c9",
      "#b6d9d5",
      "#e0a96d",
      "#6c8e9f",
      "#3c5f79"
    ],
    textColor: "#f1faee",
    mutedTextColor: "#b9d2d5",
    backgroundColor: "#1a2332",
    gridColor: "#35566a",
    axisColor: "#a8dadc",
    tooltipBackground: "#1a2332",
    legendTextColor: "#f1faee",
    source: "theme-factory/themes/ocean-depths.md"
  },
  {
    id: "sunset-boulevard",
    name: "Sunset Boulevard",
    description: "温暖而有活力的日落配色，适合营销和趋势类图表。",
    colors: [
      "#e76f51",
      "#f4a261",
      "#e9c46a",
      "#2a9d8f",
      "#d65a84",
      "#8d6cab",
      "#4f8fc0",
      "#b06c49",
      "#f09a8c",
      "#7d5a50"
    ],
    textColor: "#264653",
    mutedTextColor: "#5f6e69",
    backgroundColor: "#fff8f2",
    gridColor: "#f0d9c8",
    axisColor: "#b55b41",
    tooltipBackground: "#264653",
    legendTextColor: "#264653",
    source: "theme-factory/themes/sunset-boulevard.md"
  },
  {
    id: "forest-canopy",
    name: "Forest Canopy",
    description: "自然、沉稳的森林色调，适合可持续发展和健康主题。",
    colors: [
      "#2d4a2b",
      "#4f6f52",
      "#708a58",
      "#a4ac86",
      "#c2b280",
      "#6b8e6b",
      "#8d6e4a",
      "#3d6b5d",
      "#9aab6d",
      "#5e7f57"
    ],
    textColor: "#243524",
    mutedTextColor: "#66705e",
    backgroundColor: "#faf9f6",
    gridColor: "#dde2d5",
    axisColor: "#66705e",
    tooltipBackground: "#2d4a2b",
    legendTextColor: "#334631",
    source: "theme-factory/themes/forest-canopy.md"
  },
  {
    id: "modern-minimalist",
    name: "Modern Minimalist",
    description: "克制的现代灰度主题，适合强调结构和可读性的数据看板。",
    colors: [
      "#36454f",
      "#455a64",
      "#607d8b",
      "#78909c",
      "#90a4ae",
      "#b0bec5",
      "#cfd8dc",
      "#d9e2e6",
      "#546e7a",
      "#8fa2ad"
    ],
    textColor: "#26343b",
    mutedTextColor: "#66727a",
    backgroundColor: "#ffffff",
    gridColor: "#e5e8ea",
    axisColor: "#7b858c",
    tooltipBackground: "#36454f",
    legendTextColor: "#36454f",
    source: "theme-factory/themes/modern-minimalist.md"
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    description: "温暖的秋日金色主题，适合餐饮、零售和生活方式数据。",
    colors: [
      "#f4a900",
      "#c1666b",
      "#d88c51",
      "#b07d3f",
      "#8f5f3f",
      "#6f4e37",
      "#d4b896",
      "#e2c98c",
      "#9e6b42",
      "#be8b4d"
    ],
    textColor: "#4a403a",
    mutedTextColor: "#79665b",
    backgroundColor: "#fffaf0",
    gridColor: "#ead9c3",
    axisColor: "#9b7046",
    tooltipBackground: "#4a403a",
    legendTextColor: "#4a403a",
    source: "theme-factory/themes/golden-hour.md"
  },
  {
    id: "arctic-frost",
    name: "Arctic Frost",
    description: "清爽、精确的冰蓝配色，适合医疗、科技和效率类报表。",
    colors: [
      "#4a6fa5",
      "#6d94c8",
      "#89b4d9",
      "#a8c9e8",
      "#c0c0c0",
      "#7f9fb8",
      "#5f86a8",
      "#8cb7b7",
      "#7695a8",
      "#b7d5e8"
    ],
    textColor: "#1e344d",
    mutedTextColor: "#60758a",
    backgroundColor: "#f7fbff",
    gridColor: "#dfe9f3",
    axisColor: "#7890a8",
    tooltipBackground: "#294867",
    legendTextColor: "#2b4562",
    source: "theme-factory/themes/arctic-frost.md"
  },
  {
    id: "desert-rose",
    name: "Desert Rose",
    description: "柔和、优雅的沙丘玫瑰色，适合品牌、零售和客户分析。",
    colors: [
      "#d4a5a5",
      "#b87d6d",
      "#5d2e46",
      "#8e556d",
      "#c98c8c",
      "#d9b8a4",
      "#aa6f73",
      "#7f5263",
      "#b88b78",
      "#caa7b4"
    ],
    textColor: "#5d2e46",
    mutedTextColor: "#7f5f68",
    backgroundColor: "#fffaf8",
    gridColor: "#ead7d2",
    axisColor: "#a66d76",
    tooltipBackground: "#5d2e46",
    legendTextColor: "#5d2e46",
    source: "theme-factory/themes/desert-rose.md"
  },
  {
    id: "tech-innovation",
    name: "Tech Innovation",
    description: "高对比度的现代科技配色，适合产品和实时监控看板。",
    colors: [
      "#0066ff",
      "#00a3ff",
      "#00d1ff",
      "#00ffff",
      "#7a5cff",
      "#ff4fd8",
      "#37d67a",
      "#ffb020",
      "#9ca3af",
      "#22c55e"
    ],
    textColor: "#f8fafc",
    mutedTextColor: "#9fb0c0",
    backgroundColor: "#101820",
    gridColor: "#2a3744",
    axisColor: "#57728a",
    tooltipBackground: "#1e1e1e",
    legendTextColor: "#f8fafc",
    source: "theme-factory/themes/tech-innovation.md"
  },
  {
    id: "botanical-garden",
    name: "Botanical Garden",
    description: "新鲜、有机的植物园配色，适合农业、食品和环保主题。",
    colors: [
      "#4a7c59",
      "#7aaa6a",
      "#f9a620",
      "#b7472a",
      "#2d6a4f",
      "#95d5b2",
      "#d4a373",
      "#6a994e",
      "#bc6c25",
      "#52796f"
    ],
    textColor: "#25412f",
    mutedTextColor: "#647465",
    backgroundColor: "#fbfcf7",
    gridColor: "#dce5d7",
    axisColor: "#70826b",
    tooltipBackground: "#294a31",
    legendTextColor: "#31523a",
    source: "theme-factory/themes/botanical-garden.md"
  },
  {
    id: "midnight-galaxy",
    name: "Midnight Galaxy",
    description: "深邃、神秘的星河配色，适合娱乐、游戏和创新业务。",
    colors: [
      "#4a4e8f",
      "#6f65a8",
      "#a490c2",
      "#d7bde2",
      "#6c5ce7",
      "#8e7cc3",
      "#b39ddb",
      "#e1bee7",
      "#4f6da8",
      "#c4a7e7"
    ],
    textColor: "#f1efff",
    mutedTextColor: "#b8aacb",
    backgroundColor: "#2b1e3e",
    gridColor: "#493a5d",
    axisColor: "#8d78a8",
    tooltipBackground: "#20162f",
    legendTextColor: "#f1efff",
    source: "theme-factory/themes/midnight-galaxy.md"
  }
];

const DEFAULT_BUILT_IN_THEME_SOURCE = BUILT_IN_THEMES.find(
  (theme) => theme.id === DEFAULT_CHART_THEME_ID
);

export const BUILT_IN_CHART_THEMES = deepFreeze(
  BUILT_IN_THEMES.map((theme) => normalizeChartTheme(theme, DEFAULT_BUILT_IN_THEME_SOURCE))
);

const DEFAULT_BUILT_IN_THEME = BUILT_IN_CHART_THEMES.find(
  (theme) => theme.id === DEFAULT_CHART_THEME_ID
);

export function normalizeChartTheme(theme, fallbackTheme = DEFAULT_BUILT_IN_THEME) {
  const fallback = isPlainObject(fallbackTheme)
    ? cloneTheme(fallbackTheme)
    : cloneTheme(DEFAULT_BUILT_IN_THEME);
  if (!isPlainObject(theme)) {
    return fallback;
  }

  const id = normalizeThemeId(theme.id) || fallback.id;
  const colors = normalizeCategoricalColors(theme.colors, fallback.colors);

  return {
    id,
    name: nonEmptyString(theme.name) || fallback.name,
    description: nonEmptyString(theme.description) || fallback.description,
    colors,
    textColor: normalizeHexColor(theme.textColor) || fallback.textColor,
    mutedTextColor: normalizeHexColor(theme.mutedTextColor) || fallback.mutedTextColor,
    backgroundColor: normalizeHexColor(theme.backgroundColor) || fallback.backgroundColor,
    gridColor: normalizeHexColor(theme.gridColor) || fallback.gridColor,
    axisColor: normalizeHexColor(theme.axisColor) || fallback.axisColor,
    tooltipBackground: normalizeHexColor(theme.tooltipBackground) || fallback.tooltipBackground,
    legendTextColor: normalizeHexColor(theme.legendTextColor) || fallback.legendTextColor
  };
}

export function validateChartTheme(theme) {
  const errors = [];
  if (!isPlainObject(theme)) {
    return { valid: false, errors: ["主题必须是对象。"] };
  }

  if (!THEME_ID_PATTERN.test(String(theme.id || ""))) {
    errors.push("主题 id 必须是小写字母、数字或连字符组成的字符串。");
  }
  if (!nonEmptyString(theme.name)) {
    errors.push("主题名称不能为空。");
  }
  if (!nonEmptyString(theme.description)) {
    errors.push("主题描述不能为空。");
  }

  if (!Array.isArray(theme.colors) || theme.colors.length < MIN_CATEGORICAL_COLORS) {
    errors.push(`分类颜色至少需要 ${MIN_CATEGORICAL_COLORS} 个。`);
  } else {
    const normalizedColors = theme.colors.map(normalizeHexColor);
    if (normalizedColors.some((color) => !color)) {
      errors.push("分类颜色必须是合法的 hex 色值。");
    } else if (new Set(normalizedColors).size !== normalizedColors.length) {
      errors.push("分类颜色不能重复。");
    }
  }

  for (const field of COLOR_FIELDS) {
    if (!normalizeHexColor(theme[field])) {
      errors.push(`${field} 必须是合法的 hex 色值。`);
    }
  }

  if (normalizeHexColor(theme.textColor) && normalizeHexColor(theme.backgroundColor)) {
    if (contrastRatio(theme.textColor, theme.backgroundColor) < 4.5) {
      errors.push("文字颜色与背景颜色的对比度不能低于 4.5:1。");
    }
  }
  if (normalizeHexColor(theme.mutedTextColor) && normalizeHexColor(theme.backgroundColor)) {
    if (contrastRatio(theme.mutedTextColor, theme.backgroundColor) < 4.5) {
      errors.push("说明文字与背景颜色的对比度不能低于 4.5:1。");
    }
  }
  if (normalizeHexColor(theme.axisColor) && normalizeHexColor(theme.backgroundColor)) {
    if (contrastRatio(theme.axisColor, theme.backgroundColor) < 3) {
      errors.push("坐标轴颜色与背景颜色的对比度不能低于 3:1。");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function listChartThemes(customThemes = []) {
  const themes = BUILT_IN_CHART_THEMES.map(cloneTheme);
  const builtInIds = new Set(themes.map((theme) => theme.id));

  for (const customTheme of toThemeList(customThemes)) {
    const normalized = normalizeChartTheme(customTheme);
    if (builtInIds.has(normalized.id)) {
      continue;
    }
    const existingIndex = themes.findIndex((theme) => theme.id === normalized.id);
    if (existingIndex >= 0) {
      themes[existingIndex] = normalized;
    } else {
      themes.push(normalized);
    }
  }

  return themes;
}

export function getChartTheme(themeId, customThemes = []) {
  const id = normalizeThemeId(themeId);
  const themes = listChartThemes(customThemes);
  return themes.find((theme) => theme.id === id)
    || themes.find((theme) => theme.id === DEFAULT_CHART_THEME_ID)
    || cloneTheme(DEFAULT_BUILT_IN_THEME);
}

export function saveCustomChartThemes(existingThemes = [], additions = []) {
  const saved = [];
  const builtInIds = new Set(BUILT_IN_CHART_THEMES.map((theme) => theme.id));

  for (const candidate of [
    ...toThemeList(existingThemes),
    ...toThemeList(additions)
  ]) {
    if (!isPlainObject(candidate)) {
      continue;
    }
    const normalized = normalizeChartTheme(candidate);
    if (builtInIds.has(normalized.id)) {
      continue;
    }
    const existingIndex = saved.findIndex((theme) => theme.id === normalized.id);
    if (existingIndex >= 0) {
      saved[existingIndex] = normalized;
    } else {
      saved.push(normalized);
    }
  }

  return saved;
}

function normalizeCategoricalColors(value, fallbackColors) {
  const colors = [];
  for (const candidate of Array.isArray(value) ? value : []) {
    const color = normalizeHexColor(candidate);
    if (color && !colors.includes(color)) {
      colors.push(color);
    }
  }

  for (const fallbackColor of fallbackColors) {
    if (colors.length >= MIN_CATEGORICAL_COLORS) {
      break;
    }
    if (!colors.includes(fallbackColor)) {
      colors.push(fallbackColor);
    }
  }

  return colors.slice(0, MAX_CATEGORICAL_COLORS);
}

function normalizeHexColor(value) {
  const source = String(value || "").trim();
  if (!HEX_COLOR_PATTERN.test(source)) {
    return "";
  }
  if (source.length === 4) {
    return `#${source
      .slice(1)
      .split("")
      .map((character) => character + character)
      .join("")}`.toLowerCase();
  }
  return source.toLowerCase();
}

function normalizeThemeId(value) {
  const id = String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
  return THEME_ID_PATTERN.test(id) ? id : "";
}

function contrastRatio(first, second) {
  const left = relativeLuminance(first);
  const right = relativeLuminance(second);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

function relativeLuminance(color) {
  const source = normalizeHexColor(color).replace("#", "");
  const number = Number.parseInt(source, 16);
  const channels = [
    (number >> 16) & 255,
    (number >> 8) & 255,
    number & 255
  ].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function toThemeList(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return isPlainObject(value) ? [value] : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneTheme(theme) {
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    colors: [...theme.colors],
    textColor: theme.textColor,
    mutedTextColor: theme.mutedTextColor,
    backgroundColor: theme.backgroundColor,
    gridColor: theme.gridColor,
    axisColor: theme.axisColor,
    tooltipBackground: theme.tooltipBackground,
    legendTextColor: theme.legendTextColor
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return value;
}
