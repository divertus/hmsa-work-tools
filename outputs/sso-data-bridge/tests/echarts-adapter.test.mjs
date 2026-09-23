import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { buildEChartsOption } from "../lib/echarts-adapter.js";
import { getChartTheme } from "../lib/chart-themes.js";

const theme = getChartTheme("modern-minimalist");
const require = createRequire(import.meta.url);
const pivot = {
  labels: ["华东", "华南", "华北"],
  seriesNames: ["销售额"],
  matrix: [[10, 20, 30]],
  totals: [10, 20, 30]
};

test("条形图默认使用统一主题主色并启用文本避让", () => {
  const option = buildEChartsOption({
    widget: {
      type: "bar",
      colors: [],
      showValues: true,
      smallValueMode: "leader"
    },
    pivot,
    theme,
    metricLabel: "销售额"
  });

  assert.equal(option.series[0].itemStyle.color, theme.colors[0]);
  assert.equal(option.xAxis.axisLabel.hideOverlap, true);
  assert.equal(option.grid.containLabel, true);
});

test("饼图标签默认不重复图例名，开启后可显示图例文本", () => {
  const baseWidget = {
    type: "pie",
    colors: [],
    showValues: true,
    smallValueMode: "leader",
    pieLegendThreshold: 6
  };
  const withoutName = buildEChartsOption({
    widget: baseWidget,
    pivot,
    theme
  });
  const withName = buildEChartsOption({
    widget: {
      ...baseWidget,
      showLegendText: true
    },
    pivot,
    theme
  });

  assert.equal(withoutName.series[0].label.formatter({
    name: "华东",
    value: 10,
    percent: 16.7
  }), "10; 16.7%");
  assert.equal(withName.series[0].label.formatter({
    name: "华东",
    value: 10,
    percent: 16.7
  }), "华东; 10; 16.7%");
});

test("饼图鼠标悬停模式默认隐藏静态标签", () => {
  const option = buildEChartsOption({
    widget: {
      type: "pie",
      colors: [],
      showValues: true,
      smallValueMode: "hover",
      pieLegendThreshold: 6
    },
    pivot,
    theme
  });

  assert.equal(option.series[0].label.show, false);
  assert.equal(option.series[0].emphasis.label.show, true);
});

test("数据较多时条形图和折线图启用本地 dataZoom", () => {
  const manyLabels = Array.from({ length: 30 }, (_, index) => `分类 ${index + 1}`);
  const largePivot = {
    labels: manyLabels,
    seriesNames: ["指标"],
    matrix: [manyLabels.map((_, index) => index + 1)],
    totals: manyLabels.map((_, index) => index + 1)
  };

  for (const type of ["bar", "line"]) {
    const option = buildEChartsOption({
      widget: {
        type,
        colors: [],
        showValues: true,
        smallValueMode: "leader"
      },
      pivot: largePivot,
      theme
    });
    assert.equal(option.dataZoom[0].type, "slider");
    assert.equal(option.xAxis.axisLabel.hideOverlap, true);
  }
});

test("条形图小值悬停模式只隐藏小值静态标签", () => {
  const option = buildEChartsOption({
    widget: {
      type: "bar",
      colors: [],
      showValues: true,
      smallValueMode: "hover"
    },
    pivot: {
      labels: ["小", "大"],
      seriesNames: ["指标"],
      matrix: [[1, 100]],
      totals: [1, 100]
    },
    theme
  });

  assert.equal(option.series[0].data[0].label.show, false);
  assert.equal(option.series[0].data[1].label.show, true);
});

test("条形图导引线模式产出小值引导点", () => {
  const option = buildEChartsOption({
    widget: {
      type: "bar",
      colors: [],
      showValues: true,
      smallValueMode: "leader"
    },
    pivot: {
      labels: ["小", "大"],
      seriesNames: ["指标"],
      matrix: [[1, 100]],
      totals: [1, 100]
    },
    theme
  });

  assert.equal(option.__ssoMeta.smallPoints.length, 1);
  assert.equal(option.__ssoMeta.smallPoints[0].labelIndex, 0);
  assert.equal(option.series[0].data[0].label.show, false);
});

test("饼图缩小字体模式允许所有标签参与布局", () => {
  const option = buildEChartsOption({
    widget: {
      type: "pie",
      colors: [],
      showValues: true,
      smallValueMode: "shrink",
      pieLegendThreshold: 6
    },
    pivot,
    theme
  });

  assert.equal(option.series[0].labelLayout.hideOverlap, false);
  assert.ok(option.media?.length);
});

test("横轴滚动与自动换行生成不同的标签策略", () => {
  const labels = ["这是一个很长的中文分类名称", "第二个很长的分类名称"];
  const axisPivot = {
    labels,
    seriesNames: ["指标"],
    matrix: [[1, 2]],
    totals: [1, 2]
  };
  const scroll = buildEChartsOption({
    widget: {
      type: "bar",
      colors: [],
      showValues: true,
      axisLabelMode: "scroll"
    },
    pivot: axisPivot,
    theme
  });
  const wrap = buildEChartsOption({
    widget: {
      type: "bar",
      colors: [],
      showValues: true,
      axisLabelMode: "wrap"
    },
    pivot: axisPivot,
    theme
  });

  assert.equal(scroll.xAxis.axisLabel.rotate, 28);
  assert.equal(wrap.xAxis.axisLabel.rotate, 0);
  assert.equal(wrap.xAxis.axisLabel.overflow, "break");
  assert.notEqual(
    scroll.xAxis.axisLabel.formatter(labels[0]),
    wrap.xAxis.axisLabel.formatter(labels[0])
  );
});

test("内置 ECharts 依赖可加载且版本固定", () => {
  const echarts = require("../vendor/echarts.min.js");

  assert.equal(echarts.version, "6.1.0");
  assert.equal(typeof echarts.init, "function");
});
