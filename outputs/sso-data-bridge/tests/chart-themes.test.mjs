import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILT_IN_CHART_THEMES,
  DEFAULT_CHART_THEME_ID,
  getChartTheme,
  listChartThemes,
  normalizeChartTheme,
  saveCustomChartThemes,
  validateChartTheme
} from "../lib/chart-themes.js";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

function createCustomTheme(id, overrides = {}) {
  return {
    id,
    name: `Custom ${id}`,
    description: `Description for ${id}`,
    colors: [
      "#112233",
      "#223344",
      "#334455",
      "#445566",
      "#556677",
      "#667788",
      "#778899",
      "#8899aa"
    ],
    textColor: "#17211d",
    mutedTextColor: "#637068",
    backgroundColor: "#ffffff",
    gridColor: "#e5e8ea",
    axisColor: "#7b858c",
    tooltipBackground: "#36454f",
    legendTextColor: "#36454f",
    ...overrides
  };
}

test("内置主题 id 和名称唯一且都能通过严格校验", () => {
  assert.equal(BUILT_IN_CHART_THEMES.length, 10);
  assert.equal(
    new Set(BUILT_IN_CHART_THEMES.map((theme) => theme.id)).size,
    BUILT_IN_CHART_THEMES.length
  );
  assert.equal(
    new Set(BUILT_IN_CHART_THEMES.map((theme) => theme.name)).size,
    BUILT_IN_CHART_THEMES.length
  );

  for (const theme of BUILT_IN_CHART_THEMES) {
    const result = validateChartTheme(theme);
    assert.equal(result.valid, true, `${theme.id}: ${result.errors.join(", ")}`);
  }
});

test("内置主题包含至少 8 个不重复且合法的分类色和完整界面色", () => {
  const colorFields = [
    "textColor",
    "mutedTextColor",
    "backgroundColor",
    "gridColor",
    "axisColor",
    "tooltipBackground",
    "legendTextColor"
  ];

  for (const theme of BUILT_IN_CHART_THEMES) {
    assert.ok(theme.colors.length >= 8, theme.id);
    assert.equal(new Set(theme.colors).size, theme.colors.length, theme.id);
    for (const color of theme.colors) {
      assert.match(color, HEX_COLOR_PATTERN, `${theme.id}: ${color}`);
    }
    for (const field of colorFields) {
      assert.match(theme[field], HEX_COLOR_PATTERN, `${theme.id}.${field}`);
    }
  }
});

test("normalizeChartTheme 会规范化颜色并补齐缺失字段", () => {
  const normalized = normalizeChartTheme({
    id: "Custom Theme",
    name: "  自定义主题  ",
    description: "  可复用主题  ",
    colors: ["#ABC", "#aabbcc", "#123456", "#234567", "#345678"],
    textColor: "#FFF"
  });

  assert.equal(normalized.id, "custom-theme");
  assert.equal(normalized.name, "自定义主题");
  assert.equal(normalized.description, "可复用主题");
  assert.equal(normalized.colors[0], "#aabbcc");
  assert.equal(normalized.colors.length, 8);
  assert.equal(normalized.textColor, "#ffffff");
  assert.match(normalized.backgroundColor, HEX_COLOR_PATTERN);
});

test("saveCustomChartThemes 会合并、去重并按 id 更新已有主题", () => {
  const first = createCustomTheme("custom-a");
  const second = createCustomTheme("custom-b");
  const updatedFirst = createCustomTheme("custom-a", {
    name: "Custom A Updated"
  });

  const saved = saveCustomChartThemes([first], [second, updatedFirst, second]);

  assert.deepEqual(saved.map((theme) => theme.id), ["custom-a", "custom-b"]);
  assert.equal(saved[0].name, "Custom A Updated");
  assert.equal(saved.length, 2);

  const allThemes = listChartThemes(saved);
  assert.equal(allThemes.length, BUILT_IN_CHART_THEMES.length + 2);
  assert.equal(getChartTheme("custom-b", saved).name, "Custom custom-b");
});

test("未知或无效主题会回退到默认内置主题", () => {
  const fallbackById = getChartTheme("missing-theme");
  const fallbackFromNull = normalizeChartTheme(null);
  const fallbackFromArray = normalizeChartTheme([]);

  assert.equal(fallbackById.id, DEFAULT_CHART_THEME_ID);
  assert.equal(fallbackFromNull.id, DEFAULT_CHART_THEME_ID);
  assert.equal(fallbackFromArray.id, DEFAULT_CHART_THEME_ID);
  assert.equal(validateChartTheme(null).valid, false);
  assert.equal(validateChartTheme({ id: "broken", colors: ["red"] }).valid, false);
});

test("自定义主题不能覆盖内置主题，列表返回独立副本", () => {
  const collision = createCustomTheme(DEFAULT_CHART_THEME_ID, {
    name: "Collision"
  });
  const saved = saveCustomChartThemes([], [collision]);
  const listed = listChartThemes([createCustomTheme("custom-c")]);

  assert.deepEqual(saved, []);
  assert.equal(getChartTheme(DEFAULT_CHART_THEME_ID).name, "Modern Minimalist");

  listed[0].colors[0] = "#000000";
  assert.notEqual(BUILT_IN_CHART_THEMES[0].colors[0], "#000000");
});

test("内置主题文本和坐标轴颜色满足数据图可读性对比度", () => {
  for (const theme of BUILT_IN_CHART_THEMES) {
    assert.ok(
      contrastRatio(theme.textColor, theme.backgroundColor) >= 4.5,
      `${theme.id} text contrast`
    );
    assert.ok(
      contrastRatio(theme.mutedTextColor, theme.backgroundColor) >= 4.5,
      `${theme.id} muted text contrast`
    );
    assert.ok(
      contrastRatio(theme.axisColor, theme.backgroundColor) >= 3,
      `${theme.id} axis contrast`
    );
  }
});

test("自定义主题拒绝低对比度文字和坐标轴", () => {
  const lowContrast = createCustomTheme("custom-low-contrast", {
    textColor: "#cccccc",
    mutedTextColor: "#d0d0d0",
    backgroundColor: "#ffffff",
    axisColor: "#eeeeee"
  });
  const result = validateChartTheme(lowContrast);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("对比度")));
});

function contrastRatio(first, second) {
  const left = relativeLuminance(first);
  const right = relativeLuminance(second);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

function relativeLuminance(color) {
  const source = color.replace("#", "");
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
