import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const reportSource = fs.readFileSync(
  new URL("../report.js", import.meta.url),
  "utf8"
);

const engine = createFilterEngine();
const reportHelpers = createReportHelpers();
const normalizer = createFilterNormalizer();

test("空子分组不参与 OR 组合", () => {
  const group = makeGroup("any", [
    makeCondition("status", "equals", "2"),
    makeGroup("all", [])
  ]);

  assert.equal(engine.evaluateFilterGroup(group, { status: "1" }, []), false);
});

test("指向空常用条件的引用在 OR 中不产生 true", () => {
  const group = makeGroup("any", [
    makeCondition("status", "equals", "2"),
    { type: "reference", name: "空条件" }
  ]);

  assert.equal(engine.evaluateFilterGroup(
    group,
    { status: "1" },
    [],
    [{ name: "空条件", group: makeGroup("all", []) }]
  ), false);
});

test("指向已禁用根分组的常用条件不参与 OR", () => {
  const group = makeGroup("any", [
    makeCondition("status", "equals", "2"),
    { type: "reference", name: "禁用条件" }
  ]);

  assert.equal(engine.evaluateFilterGroup(
    group,
    { status: "1", level: "高" },
    [],
    [{
      name: "禁用条件",
      group: {
        ...makeGroup("all", [makeCondition("level", "equals", "高")]),
        enabled: false
      }
    }]
  ), false);
});

test("嵌套 AND/OR 按分组括号求值", () => {
  const group = makeGroup("any", [
    makeCondition("status", "equals", "1"),
    makeGroup("all", [
      makeCondition("region", "equals", "华东"),
      makeCondition("price", "gt", "10")
    ])
  ]);

  assert.equal(engine.evaluateFilterGroup(group, {
    status: "2",
    region: "华东",
    price: "12"
  }, []), true);
  assert.equal(engine.evaluateFilterGroup(group, {
    status: "2",
    region: "华南",
    price: "12"
  }, []), false);
});

test("常用条件引用保留自身的嵌套逻辑", () => {
  const commonFilters = [{
    name: "高风险",
    group: makeGroup("any", [
      makeCondition("level", "equals", "高"),
      makeGroup("all", [
        makeCondition("region", "equals", "华东"),
        makeCondition("price", "gt", "100")
      ])
    ])
  }];

  assert.equal(engine.evaluateFilterGroup(
    makeGroup("all", [{ type: "reference", name: "高风险" }]),
    { level: "低", region: "华东", price: "120" },
    [],
    commonFilters
  ), true);
});

test("循环引用不会递归溢出并视为不匹配", () => {
  const commonFilters = [
    {
      name: "A",
      group: makeGroup("all", [{ type: "reference", name: "B" }])
    },
    {
      name: "B",
      group: makeGroup("all", [{ type: "reference", name: "A" }])
    }
  ];

  assert.equal(engine.evaluateFilterGroup(
    makeGroup("all", [{ type: "reference", name: "A" }]),
    {},
    [],
    commonFilters
  ), false);
});

test("常用条件改名会同步嵌套引用名称", () => {
  const root = makeGroup("all", [
    { type: "reference", name: "旧名称" },
    makeGroup("any", [{ type: "reference", name: "旧名称" }]),
    {
      logic: "any",
      conditions: [{ type: "reference", name: "旧名称" }]
    }
  ]);
  reportHelpers.renameCommonFilterReferences(root, "旧名称", "新名称");

  assert.equal(root.children[0].name, "新名称");
  assert.equal(root.children[1].children[0].name, "新名称");
  assert.equal(root.children[2].conditions[0].name, "新名称");
});

test("更新常用条件会同步模板内旧快照", () => {
  const state = { reportTemplates: [{
    commonFilters: [{
      id: "common-1",
      name: "旧名称",
      group: makeGroup("all", [makeCondition("status", "equals", "1")])
    }]
  }] };
  const helpers = createReportHelpers(state);
  const common = {
    id: "common-1",
    name: "新名称",
    group: makeGroup("any", [makeCondition("status", "equals", "2")])
  };
  helpers.syncCommonFilterToTemplates(common, "旧名称");

  const stored = state.reportTemplates[0].commonFilters[0];
  assert.equal(stored.name, "新名称");
  assert.equal(stored.group.logic, "any");
  assert.equal(stored.group.children[0].value, "2");
});

test("Excel XML 导出会转义表格文本", () => {
  assert.equal(
    reportHelpers.escapeXml('<A & "B">'),
    "&lt;A &amp; &quot;B&quot;&gt;"
  );
});

test("拖拽区域重叠率按目标组件面积计算", () => {
  const target = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };

  assert.equal(reportHelpers.rectangleOverlapRatio(
    { left: 0, top: 0, right: 20, bottom: 50, width: 20, height: 50 },
    target
  ), 0.1);
  assert.equal(reportHelpers.rectangleOverlapRatio(
    { left: 0, top: 0, right: 9, bottom: 100, width: 9, height: 100 },
    target
  ), 0.09);
});

test("导引线轨道分配会避开已占用高度", () => {
  const tracks = [40];
  const next = reportHelpers.allocateLeaderTrack(41, tracks, 0, 200, 12);

  assert.ok(Math.abs(next - 40) >= 11 || Math.abs(next - 53) < 0.001);
  assert.equal(tracks.length, 2);
});

test("旧版根 conditions 保留嵌套分组和引用", () => {
  const normalized = normalizer.normalizeFilters({
    logic: "any",
    conditions: [
      makeCondition("status", "equals", "1"),
      {
        logic: "all",
        conditions: [
          makeCondition("region", "equals", "华东"),
          makeCondition("price", "gt", "10")
        ]
      },
      { type: "reference", name: "已保存条件" }
    ]
  }, [
    { path: "status" },
    { path: "region" },
    { path: "price" }
  ]);

  assert.equal(normalized.children.length, 3);
  assert.equal(normalized.children[1].type, "group");
  assert.equal(normalized.children[1].children.length, 2);
  assert.equal(normalized.children[2].type, "reference");
  assert.equal(normalized.children[2].name, "已保存条件");
});

function createFilterEngine() {
  const names = [
    "isFilterConditionReady",
    "isCommonFilterActive",
    "isFilterNodeActive",
    "evaluateCommonFilterReference",
    "evaluateFilterGroup"
  ];
  const source = names.map(extractFunction).join("\n");
  const factory = new Function(
    "state",
    "matchesFilter",
    `${source}
    return {
      evaluateFilterGroup(group, row, referenceStack = [], commonFilters = []) {
        state.commonFilters = commonFilters;
        return evaluateFilterGroup(group, row, referenceStack);
      }
    };`
  );
  return factory(
    { commonFilters: [] },
    (row, condition) => {
      const left = row[condition.field];
      const right = condition.value;
      if (condition.operator === "equals") {
        return String(left) === String(right);
      }
      if (condition.operator === "gt") {
        return Number(left) > Number(right);
      }
      return false;
    }
  );
}

function createReportHelpers(state = { reportTemplates: [] }) {
  const source = [
    extractFunction("allocateLeaderTrack"),
    extractFunction("rectangleOverlapRatio"),
    extractFunction("renameCommonFilterReferences"),
    extractFunction("syncCommonFilterToTemplates"),
    extractFunction("escapeXml")
  ].join("\n");
  return new Function(
    "state",
    "cloneJson",
    `${source}
    return {
      state,
      allocateLeaderTrack,
      rectangleOverlapRatio,
      renameCommonFilterReferences,
      syncCommonFilterToTemplates,
      escapeXml
    };`
  )(
    state,
    (value) => JSON.parse(JSON.stringify(value))
  );
}

function createFilterNormalizer() {
  const source = [
    extractFunction("normalizeFilters"),
    extractFunction("normalizeFilterNode"),
    extractFunction("normalizeFilterCondition"),
    extractFunction("createFilterGroup")
  ].join("\n");
  return new Function(
    "createId",
    "FILTER_OPERATORS",
    `${source}
    return { normalizeFilters };`
  )(
    (prefix) => `${prefix}-test`,
    {
      equals: "等于",
      notEquals: "不等于",
      contains: "包含",
      notContains: "不包含",
      gt: "大于",
      gte: "大于等于",
      lt: "小于",
      lte: "小于等于",
      empty: "为空",
      notEmpty: "不为空",
      in: "属于列表",
      notIn: "不属于列表"
    }
  );
}

function extractFunction(name) {
  const start = reportSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing ${name}`);
  const open = reportSource.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < reportSource.length; index += 1) {
    if (reportSource[index] === "{") {
      depth += 1;
    } else if (reportSource[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return reportSource.slice(start, index + 1);
      }
    }
  }
  throw new Error(`unterminated ${name}`);
}

function makeGroup(logic, children) {
  return {
    id: `group-${logic}`,
    type: "group",
    logic,
    children
  };
}

function makeCondition(field, operator, value) {
  return {
    id: `condition-${field}`,
    type: "condition",
    field,
    operator,
    value,
    enabled: true
  };
}
