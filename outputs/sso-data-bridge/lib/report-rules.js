import { createId } from "./config.js";

const FILTER_OPERATORS = new Set([
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "gt",
  "gte",
  "lt",
  "lte",
  "empty",
  "notEmpty",
  "in",
  "notIn"
]);

export function normalizeCommonFiltersForStorage(commonFilters, templates = []) {
  const candidates = [];

  for (const template of Array.isArray(templates) ? templates : []) {
    appendCandidates(candidates, template?.commonFilters, 1);
  }
  appendCandidates(candidates, commonFilters, 2);

  const selected = new Map();
  for (const { item, priority } of candidates) {
    const name = String(item?.name || "").trim();
    if (!name) {
      continue;
    }

    const group = bestFilterGroup(item);
    const score = countFilterNodes(group);
    const current = selected.get(name);
    if (
      !current
      || score > current.score
      || (score === current.score && priority >= current.priority)
    ) {
      selected.set(name, {
        id: item.id || createId("common-filter"),
        name,
        group,
        score,
        priority
      });
    }
  }

  return [...selected.values()].map(({ score, priority, ...item }) => item);
}

function appendCandidates(target, value, priority) {
  const items = Array.isArray(value)
    ? value
    : value?.name
      ? [value]
      : value && typeof value === "object"
        ? Object.values(value)
        : [];
  for (const item of items) {
    if (item && typeof item === "object") {
      target.push({ item, priority });
    }
  }
}

function bestFilterGroup(item) {
  const sources = [item?.group, item?.filters, item]
    .filter((source) => source && typeof source === "object")
    .map(normalizeFilterGroup);
  return sources.sort((left, right) => countFilterNodes(right) - countFilterNodes(left))[0]
    || createEmptyFilterGroup();
}

function normalizeFilterNode(node) {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (node.type === "reference" && node.name) {
    return {
      id: node.id || createId("filter-reference"),
      type: "reference",
      name: String(node.name),
      enabled: node.enabled !== false
    };
  }
  if (
    node.type === "group"
    || Array.isArray(node.children)
    || Array.isArray(node.conditions)
  ) {
    return normalizeFilterGroup(node);
  }
  return normalizeFilterCondition(node);
}

function normalizeFilterGroup(node) {
  const group = createEmptyFilterGroup(node);
  const children = Array.isArray(node?.children)
    ? node.children
    : Array.isArray(node?.conditions)
      ? node.conditions
      : [];
  group.children = children.map(normalizeFilterNode).filter(Boolean);
  return group;
}

function createEmptyFilterGroup(node = null) {
  return {
    id: node?.id || createId("filter-group"),
    type: "group",
    logic: node?.logic === "any" ? "any" : "all",
    enabled: node?.enabled !== false,
    children: []
  };
}

function normalizeFilterCondition(node) {
  if (!node?.field) {
    return null;
  }
  const operator = FILTER_OPERATORS.has(node.operator) ? node.operator : "contains";
  return {
    id: node.id || createId("filter"),
    type: "condition",
    field: String(node.field),
    operator,
    value: String(node.value ?? node.conditionValue ?? ""),
    enabled: node.enabled !== false
  };
}

function countFilterNodes(group) {
  if (!group) {
    return 0;
  }
  return (group.children || []).reduce(
    (total, child) => total + 1 + (child.type === "group" ? countFilterNodes(child) : 0),
    0
  );
}
