import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const reportSource = fs.readFileSync(new URL("../report.js", import.meta.url), "utf8");
const helpers = createHelpers();

test("表单字段派生规则支持条件派生和直接复制", () => {
  const [conditional, copy] = helpers.normalizeFieldMappings([
    {
      id: "rule-1",
      sourceField: "product",
      operator: "equals",
      conditionValue: "可乐",
      targetField: "price",
      targetValue: 2,
      overwrite: true
    },
    {
      id: "rule-2",
      sourceField: "price",
      operator: "copy",
      targetField: "displayPrice",
      targetValue: "",
      overwrite: false
    }
  ]);

  assert.equal(conditional.sourceField, "product");
  assert.equal(conditional.conditionValue, "可乐");
  assert.equal(conditional.targetValue, "2");
  assert.equal(copy.operator, "copy");
  assert.equal(copy.overwrite, false);
});

test("派生规则摘要使用字段别名并显示覆盖状态", () => {
  const summary = helpers.describeFieldMappingRule({
    sourceField: "product",
    operator: "equals",
    conditionValue: "可乐",
    targetField: "price",
    targetValue: "2",
    overwrite: true
  });

  assert.equal(summary, "等于 可乐，商品价格 = 2，允许覆盖");
});

function createHelpers() {
  const source = [
    extractFunction("normalizeFieldMappings"),
    extractFunction("describeFieldMappingRule")
  ].join("\n");
  return new Function(
    "createId",
    "FILTER_OPERATORS",
    "fieldLabel",
    `${source}
    return { normalizeFieldMappings, describeFieldMappingRule };`
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
    },
    (path) => ({ product: "商品名", price: "商品价格" }[path] || path)
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
