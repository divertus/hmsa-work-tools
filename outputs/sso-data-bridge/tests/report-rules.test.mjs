import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCommonFiltersForStorage } from "../lib/report-rules.js";

const nestedCommonFilter = {
  id: "common-template",
  name: "风险条件",
  group: {
    id: "group-root",
    type: "group",
    logic: "any",
    children: [
      {
        id: "condition-status",
        type: "condition",
        field: "status",
        operator: "equals",
        value: "1",
        enabled: true
      },
      {
        id: "group-region",
        type: "group",
        logic: "all",
        children: [
          {
            id: "condition-region",
            type: "condition",
            field: "region",
            operator: "equals",
            value: "华东",
            enabled: true
          },
          {
            id: "condition-price",
            type: "condition",
            field: "price",
            operator: "gt",
            value: "10",
            enabled: true
          }
        ]
      }
    ]
  }
};

test("恢复旧规则中只有名称的常用条件关系", () => {
  const [restored] = normalizeCommonFiltersForStorage(
    [{ id: "common-name-only", name: "风险条件" }],
    [{ commonFilters: [nestedCommonFilter] }]
  );

  assert.equal(restored.id, "common-template");
  assert.equal(restored.name, "风险条件");
  assert.equal(restored.group.logic, "any");
  assert.equal(restored.group.children[1].logic, "all");
  assert.equal(restored.group.children[1].children[0].value, "华东");
  assert.equal(restored.group.children[1].children[1].value, "10");
});

test("完整顶层条件优先于模板内的同名旧条件", () => {
  const topLevel = {
    ...nestedCommonFilter,
    id: "common-top-level",
    group: {
      ...nestedCommonFilter.group,
      id: "group-top-level",
      logic: "all"
    }
  };
  const [restored] = normalizeCommonFiltersForStorage(
    [topLevel],
    [{ commonFilters: [nestedCommonFilter] }]
  );

  assert.equal(restored.id, "common-top-level");
  assert.equal(restored.group.id, "group-top-level");
  assert.equal(restored.group.logic, "all");
});

test("保留常用条件引用、条件别名和旧版 conditions 结构", () => {
  const [restored] = normalizeCommonFiltersForStorage([
    {
      name: "组合条件",
      group: {
        logic: "any",
        conditions: [
          {
            field: "status",
            operator: "equals",
            conditionValue: "2"
          },
          {
            type: "reference",
            name: "已验证"
          }
        ]
      }
    }
  ]);

  assert.equal(restored.group.children[0].value, "2");
  assert.equal(restored.group.children[1].type, "reference");
  assert.equal(restored.group.children[1].name, "已验证");
});

test("兼容单个常用条件对象格式", () => {
  const [restored] = normalizeCommonFiltersForStorage(nestedCommonFilter);

  assert.equal(restored.name, "风险条件");
  assert.equal(restored.group.children.length, 2);
});
