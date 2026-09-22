import { createId, STORAGE_KEYS } from "./lib/config.js";
import { normalizeCommonFiltersForStorage } from "./lib/report-rules.js";
import { getRawDatasetBundle, listDatasets } from "./lib/storage.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const CHART_COLORS = [
  "#0f766e",
  "#d59b3a",
  "#3b6ea8",
  "#b4515a",
  "#6b7c3e",
  "#8a5c9e",
  "#2f8c8c",
  "#c66b2b",
  "#557a95",
  "#8b6f47"
];

const elements = {
  datasetStatus: document.querySelector("#dataset-status"),
  datasetCaption: document.querySelector("#dataset-caption"),
  templateSelect: document.querySelector("#template-select"),
  templateName: document.querySelector("#template-name"),
  newTemplateButton: document.querySelector("#new-template-button"),
  saveTemplateButton: document.querySelector("#save-template-button"),
  saveAsTemplateButton: document.querySelector("#save-as-template-button"),
  deleteTemplateButton: document.querySelector("#delete-template-button"),
  exportPngButton: document.querySelector("#export-png-button"),
  exportHtmlButton: document.querySelector("#export-html-button"),
  exportRulesButton: document.querySelector("#export-rules-button"),
  importRulesButton: document.querySelector("#import-rules-button"),
  exportImmersivePngButton: document.querySelector("#export-immersive-png-button"),
  reportRulesInput: document.querySelector("#report-rules-input"),
  reportSidebar: document.querySelector(".report-sidebar"),
  reloadDataButton: document.querySelector("#reload-data-button"),
  arrayPathSelect: document.querySelector("#array-path-select"),
  datasetSummary: document.querySelector("#dataset-summary"),
  fieldSearch: document.querySelector("#field-search"),
  fieldCount: document.querySelector("#field-count"),
  hideUnselectedFieldsButton: document.querySelector("#hide-unselected-fields-button"),
  moveUnselectedFieldsTopButton: document.querySelector("#move-unselected-fields-top-button"),
  fieldList: document.querySelector("#field-list"),
  mappingFieldSelect: document.querySelector("#mapping-field-select"),
  addMappingButton: document.querySelector("#add-mapping-button"),
  fieldMappingJson: document.querySelector("#field-mapping-json"),
  applyFieldMappingButton: document.querySelector("#apply-field-mapping-button"),
  downloadFieldMappingTemplateButton: document.querySelector("#download-field-mapping-template-button"),
  importFieldMappingButton: document.querySelector("#import-field-mapping-button"),
  fieldMappingFileInput: document.querySelector("#field-mapping-file-input"),
  fieldMappingState: document.querySelector("#field-mapping-state"),
  mappingList: document.querySelector("#mapping-list"),
  filterLogic: document.querySelector("#filter-logic"),
  addFilterButton: document.querySelector("#add-filter-button"),
  filterList: document.querySelector("#filter-list"),
  commonFilterName: document.querySelector("#common-filter-name"),
  saveCommonFilterButton: document.querySelector("#save-common-filter-button"),
  commonFilterList: document.querySelector("#common-filter-list"),
  addWidgetButton: document.querySelector("#add-widget-button"),
  toggleSidebarButton: document.querySelector("#toggle-sidebar-button"),
  immersiveButton: document.querySelector("#immersive-button"),
  immersiveExitButton: document.querySelector("#immersive-exit-button"),
  resetDashboardButton: document.querySelector("#reset-dashboard-button"),
  dashboardHeading: document.querySelector("#dashboard-heading"),
  analysisSummary: document.querySelector("#analysis-summary"),
  dashboardGrid: document.querySelector("#dashboard-grid"),
  dashboardEmpty: document.querySelector("#dashboard-empty"),
  widgetDialog: document.querySelector("#widget-dialog"),
  widgetForm: document.querySelector("#widget-form"),
  widgetDialogTitle: document.querySelector("#widget-dialog-title"),
  widgetDialogClose: document.querySelector("#widget-dialog-close"),
  widgetTitle: document.querySelector("#widget-title"),
  widgetType: document.querySelector("#widget-type"),
  widgetDimension: document.querySelector("#widget-dimension"),
  widgetSeries: document.querySelector("#widget-series"),
  widgetAggregation: document.querySelector("#widget-aggregation"),
  widgetMetricField: document.querySelector("#widget-metric-field"),
  widgetMetricAlias: document.querySelector("#widget-metric-alias"),
  widgetSort: document.querySelector("#widget-sort"),
  widgetAxisLabelMode: document.querySelector("#widget-axis-label-mode"),
  widgetShowValues: document.querySelector("#widget-show-values"),
  widgetLimit: document.querySelector("#widget-limit"),
  widgetPageSize: document.querySelector("#widget-page-size"),
  widgetPieLegendThreshold: document.querySelector("#widget-pie-legend-threshold"),
  pieLegendThresholdField: document.querySelector("#pie-legend-threshold-field"),
  widgetPieShowLegendText: document.querySelector("#widget-pie-show-legend-text"),
  pieShowLegendTextField: document.querySelector("#pie-show-legend-text-field"),
  widgetSmallValueMode: document.querySelector("#widget-small-value-mode"),
  widgetScale: document.querySelector("#widget-scale"),
  widgetSize: document.querySelector("#widget-size"),
  widgetColorList: document.querySelector("#widget-color-list"),
  resetWidgetColorsButton: document.querySelector("#reset-widget-colors-button"),
  widgetAddFilterButton: document.querySelector("#widget-add-filter-button"),
  widgetAddFilterGroupButton: document.querySelector("#widget-add-filter-group-button"),
  widgetAddFilterReferenceButton: document.querySelector("#widget-add-filter-reference-button"),
  widgetFilterList: document.querySelector("#widget-filter-list"),
  widgetCancelButton: document.querySelector("#widget-cancel-button"),
  toast: document.querySelector("#toast")
};

const state = {
  datasetId: null,
  dataset: null,
  chunks: [],
  sourceRows: [],
  arrayPaths: [],
  arrayPath: "",
  allColumns: [],
  fieldConfigs: [],
  valueMappings: {},
  fieldMappings: [],
  mappingField: "",
  filteredRows: [],
  filters: createFilterGroup("all"),
  commonFilters: [],
  flattenedRowCache: new WeakMap(),
  widgetRowsCache: new Map(),
  widgets: [],
  reportTemplates: [],
  currentTemplateId: null,
  editingWidgetId: null,
  dialogColors: [],
  editingWidgetFilters: createFilterGroup("all"),
  hiddenSections: {},
  sidebarHidden: false,
  hideUnselectedFields: false,
  tablePages: {},
  toastTimer: null
};

initialize().catch((error) => {
  elements.datasetStatus.className = "status-badge status-error";
  elements.datasetStatus.textContent = "读取失败";
  elements.datasetCaption.textContent = error.message;
  showToast(`初始化失败：${error.message}`);
});

async function initialize() {
  bindEvents();
  const params = new URLSearchParams(location.search);
  const requestedTemplateId = params.get("templateId");
  const requestedDatasetId = params.get("datasetId");

  const datasets = await listDatasets();
  if (!datasets.length) {
    throw new Error("尚无抓取结果，请先运行一个请求。");
  }

  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.reportTemplates,
    STORAGE_KEYS.reportUiState,
    STORAGE_KEYS.commonFilters
  ]);
  state.reportTemplates = Array.isArray(stored[STORAGE_KEYS.reportTemplates])
    ? stored[STORAGE_KEYS.reportTemplates]
    : [];
  state.hiddenSections = stored[STORAGE_KEYS.reportUiState]?.hiddenSections || {};
  state.sidebarHidden = Boolean(stored[STORAGE_KEYS.reportUiState]?.sidebarHidden);
  state.hideUnselectedFields = Boolean(stored[STORAGE_KEYS.reportUiState]?.hideUnselectedFields);
  state.commonFilters = Array.isArray(stored[STORAGE_KEYS.commonFilters])
    ? stored[STORAGE_KEYS.commonFilters]
    : [];
  applySidebarVisibility();

  const requestedTemplate = requestedTemplateId
    ? state.reportTemplates.find((template) => template.id === requestedTemplateId)
    : null;
  const datasetFromRequest = datasets.find((dataset) => dataset.id === requestedDatasetId);
  const datasetFromTemplate = requestedTemplate
    ? datasets.find((dataset) => dataset.id === requestedTemplate.datasetId)
      || datasets.find((dataset) => (
        requestedTemplate.sourceProfileId
        && dataset.sourceProfileId === requestedTemplate.sourceProfileId
      ))
    : null;
  state.datasetId = (
    datasetFromRequest
    || datasetFromTemplate
    || datasets[0]
  ).id;

  await loadDataset(state.datasetId);

  const matchingTemplate = findInitialTemplate(requestedTemplateId);
  if (matchingTemplate) {
    await applyTemplate(matchingTemplate);
  } else {
    createDefaultTemplateState();
    await rebuildSourceData(true);
  }

  renderAll();
}

function bindEvents() {
  elements.reloadDataButton.addEventListener("click", async () => {
    await loadDataset(state.datasetId);
    await rebuildSourceData(true);
    renderAll();
  });

  elements.arrayPathSelect.addEventListener("change", async () => {
    state.arrayPath = elements.arrayPathSelect.value;
    rebuildFieldConfigsForSource();
    await rebuildSourceData(false);
    ensureWidgetsUseValidFields();
    renderAll();
  });

  elements.fieldSearch.addEventListener("input", renderFieldList);
  elements.hideUnselectedFieldsButton.addEventListener("click", toggleHideUnselectedFields);
  elements.moveUnselectedFieldsTopButton.addEventListener("click", moveUnselectedFieldsTop);
  elements.fieldList.addEventListener("change", handleFieldListChange);
  elements.fieldList.addEventListener("input", handleFieldListChange);
  elements.fieldList.addEventListener("click", handleFieldListClick);
  elements.mappingFieldSelect.addEventListener("change", () => {
    state.mappingField = elements.mappingFieldSelect.value;
    renderMappingEditor();
  });
  elements.addMappingButton.addEventListener("click", addValueMapping);
  elements.applyFieldMappingButton.addEventListener("click", applyFieldMappingJson);
  elements.downloadFieldMappingTemplateButton.addEventListener("click", downloadFieldMappingTemplate);
  elements.importFieldMappingButton.addEventListener("click", () => elements.fieldMappingFileInput.click());
  elements.fieldMappingFileInput.addEventListener("change", importFieldMappingFile);
  elements.mappingList.addEventListener("change", handleMappingChange);
  elements.mappingList.addEventListener("input", handleMappingChange);
  elements.mappingList.addEventListener("click", handleMappingClick);

  elements.filterLogic.addEventListener("change", () => {
    state.filters.logic = elements.filterLogic.value;
    recomputeFilteredRows();
    renderDashboard();
  });
  elements.addFilterButton.addEventListener("click", addFilterCondition);
  elements.filterList.addEventListener("change", handleFilterChange);
  elements.filterList.addEventListener("input", handleFilterChange);
  elements.filterList.addEventListener("click", handleFilterClick);
  elements.saveCommonFilterButton.addEventListener("click", saveCommonFilter);
  elements.commonFilterList.addEventListener("click", handleCommonFilterClick);

  elements.addWidgetButton.addEventListener("click", () => openWidgetDialog());
  elements.toggleSidebarButton.addEventListener("click", toggleSidebar);
  elements.immersiveButton.addEventListener("click", () => setImmersive(true));
  elements.immersiveExitButton.addEventListener("click", () => setImmersive(false));
  elements.resetDashboardButton.addEventListener("click", () => {
    if (!confirm("确定恢复默认 Dashboard 编排吗？当前组件配置会被替换。")) {
      return;
    }
    state.widgets = createDefaultWidgets();
    renderDashboard();
  });
  elements.dashboardGrid.addEventListener("click", handleDashboardAction);

  elements.templateSelect.addEventListener("change", async () => {
    const template = state.reportTemplates.find(
      (item) => item.id === elements.templateSelect.value
    );
    if (template) {
      await applyTemplate(template);
      renderAll();
    }
  });

  elements.newTemplateButton.addEventListener("click", createNewTemplate);
  elements.saveTemplateButton.addEventListener("click", () => saveTemplate(false));
  elements.saveAsTemplateButton.addEventListener("click", () => saveTemplate(true));
  elements.deleteTemplateButton.addEventListener("click", deleteTemplate);
  elements.exportPngButton.addEventListener("click", () => exportDashboardPng(false));
  elements.exportImmersivePngButton.addEventListener("click", () => exportDashboardPng(true));
  elements.exportHtmlButton.addEventListener("click", exportDashboardHtml);
  elements.exportRulesButton.addEventListener("click", exportDashboardRules);

  elements.widgetDialogClose.addEventListener("click", closeWidgetDialog);
  elements.widgetCancelButton.addEventListener("click", closeWidgetDialog);
  elements.widgetAggregation.addEventListener("change", updateWidgetMetricState);
  elements.widgetType.addEventListener("change", () => {
    updateWidgetTypeFields();
    renderWidgetColorInputs();
  });
  elements.widgetDimension.addEventListener("change", renderWidgetColorInputs);
  elements.widgetSeries.addEventListener("change", renderWidgetColorInputs);
  elements.widgetLimit.addEventListener("change", renderWidgetColorInputs);
  elements.resetWidgetColorsButton.addEventListener("click", () => {
    if (!confirm("确定恢复自动配色吗？当前自定义颜色会被清除。")) {
      return;
    }
    state.dialogColors = [];
    renderWidgetColorInputs();
  });
  elements.widgetAddFilterButton.addEventListener("click", () => {
    addWidgetFilterCondition(state.editingWidgetFilters.id);
  });
  elements.widgetAddFilterGroupButton.addEventListener("click", () => {
    addWidgetFilterGroup(state.editingWidgetFilters.id);
  });
  elements.widgetAddFilterReferenceButton.addEventListener("click", () => {
    addWidgetFilterReference(state.editingWidgetFilters.id);
  });
  elements.widgetFilterList.addEventListener("change", handleWidgetFilterChange);
  elements.widgetFilterList.addEventListener("input", handleWidgetFilterChange);
  elements.widgetFilterList.addEventListener("click", handleWidgetFilterClick);
  elements.widgetForm.addEventListener("submit", saveWidgetFromDialog);
  elements.importRulesButton.addEventListener("click", () => elements.reportRulesInput.click());
  elements.reportRulesInput.addEventListener("change", importDashboardRules);
  elements.reportSidebar.addEventListener("click", handleSidebarAction);

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "OPEN_REPORT_CONTEXT") {
      if (message.datasetId && message.datasetId !== state.datasetId) {
        state.datasetId = message.datasetId;
        loadDataset(state.datasetId).then(() => {
          createDefaultTemplateState();
          return rebuildSourceData(true);
        }).then(renderAll);
      }
      if (message.templateId) {
        const template = state.reportTemplates.find((item) => item.id === message.templateId);
        if (template) {
          applyTemplate(template).then(renderAll);
        }
      }
    }
    if (message?.type === "REPORT_TEMPLATES_UPDATED") {
      refreshReportTemplates().then(async () => {
        renderTemplateSelect();
        renderCommonFilterList();
        const incoming = state.reportTemplates.find((item) => item.id === message.templateId);
        if (incoming) {
          await applyTemplate(incoming);
          renderAll();
        }
      });
    }
  });
}

function applySidebarVisibility() {
  const workspace = document.querySelector(".report-workspace");
  workspace?.classList.toggle("sidebar-hidden", state.sidebarHidden);
  elements.toggleSidebarButton.textContent = state.sidebarHidden ? "显示左侧" : "隐藏左侧";
  for (const section of document.querySelectorAll(".sidebar-section[data-section]")) {
    const hidden = Boolean(state.hiddenSections[section.dataset.section]);
    section.classList.toggle("is-collapsed", hidden);
    const button = section.querySelector(".section-toggle");
    if (button) {
      button.textContent = hidden ? "+" : "−";
      button.setAttribute("aria-expanded", String(!hidden));
    }
  }
}

function persistReportUiState() {
  chrome.storage.local.set({
    [STORAGE_KEYS.reportUiState]: {
      hiddenSections: state.hiddenSections,
      sidebarHidden: state.sidebarHidden,
      hideUnselectedFields: state.hideUnselectedFields
    }
  });
}

function toggleSidebar() {
  state.sidebarHidden = !state.sidebarHidden;
  applySidebarVisibility();
  persistReportUiState();
}

function setImmersive(enabled) {
  document.body.classList.toggle("report-immersive", enabled);
  elements.immersiveExitButton.hidden = !enabled;
}

function handleSidebarAction(event) {
  const button = event.target.closest("[data-toggle-section]");
  if (!button) {
    return;
  }
  const name = button.dataset.toggleSection;
  state.hiddenSections[name] = !state.hiddenSections[name];
  applySidebarVisibility();
  persistReportUiState();
}

async function loadDataset(datasetId) {
  const bundle = await getRawDatasetBundle(datasetId);
  if (!bundle) {
    throw new Error("找不到对应的数据集。");
  }

  state.datasetId = datasetId;
  state.dataset = bundle;
  state.chunks = bundle.chunks || [];
  state.arrayPaths = discoverArrayPaths(bundle);
  if (!state.arrayPath || !state.arrayPaths.some((item) => item.path === state.arrayPath)) {
    state.arrayPath = chooseDefaultArrayPath(bundle);
  }
  renderDatasetHeader();
}

function discoverArrayPaths(bundle) {
  const paths = new Map();
  const rawResponses = (bundle.chunks || [])
    .map((chunk) => chunk.rawResponse)
    .filter((value) => value !== undefined && value !== null);

  for (const response of rawResponses.slice(0, 20)) {
    collectArrayPaths(response, "", 0, paths);
  }

  if (Array.isArray(bundle.rows) && bundle.rows.length) {
    paths.set("__dataset_rows__", {
      path: "__dataset_rows__",
      label: "当前分页提取结果",
      count: bundle.rows.length,
      objectCount: bundle.rows.filter(isPlainObject).length,
      score: 80,
      depth: 0
    });
  }

  const preferredPath = bundle.pagination?.dataPath;
  if (preferredPath && !paths.has(preferredPath) && rawResponses.some((item) => Array.isArray(getByPath(item, preferredPath)))) {
    paths.set(preferredPath, {
      path: preferredPath,
      label: preferredPath,
      count: 0,
      objectCount: 0,
      score: 120,
      depth: preferredPath.split(".").length
    });
  }

  return [...paths.values()].sort((a, b) => {
    if (a.path === preferredPath) {
      return -1;
    }
    if (b.path === preferredPath) {
      return 1;
    }
    return b.score - a.score || a.depth - b.depth || b.count - a.count;
  });
}

function collectArrayPaths(value, path, depth, paths, parentKey = "") {
  if (depth > 7 || value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    const objectCount = value.filter(isPlainObject).length;
    if (!value.length || objectCount > 0) {
      const nameScore = /^(rows|list|records|items|results|content|dataList)$/i.test(parentKey)
        ? 100
        : /data|list|row|record|item|result/i.test(parentKey)
          ? 70
          : 20;
      const current = paths.get(path);
      paths.set(path, {
        path,
        label: path || "响应根数组",
        count: Math.max(current?.count || 0, value.length),
        objectCount: Math.max(current?.objectCount || 0, objectCount),
        score: nameScore - depth,
        depth
      });
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    collectArrayPaths(child, joinPath(path, key), depth + 1, paths, key);
  }
}

function chooseDefaultArrayPath(bundle) {
  const preferredPath = bundle.pagination?.dataPath;
  if (preferredPath && state.arrayPaths.some((item) => item.path === preferredPath)) {
    return preferredPath;
  }
  const firstRawArray = state.arrayPaths.find((item) => item.path !== "__dataset_rows__");
  return firstRawArray?.path || state.arrayPaths[0]?.path || "__dataset_rows__";
}

function getRowsForArrayPath(path) {
  if (path === "__dataset_rows__") {
    return state.chunks.flatMap((chunk) => chunk.rows || []);
  }

  const rows = [];
  for (const chunk of state.chunks) {
    if (chunk.rawResponse === undefined || chunk.rawResponse === null) {
      continue;
    }
    const value = getByPath(chunk.rawResponse, path);
    if (Array.isArray(value)) {
      rows.push(...value);
    }
  }

  if (!rows.length && !state.chunks.length) {
    return state.dataset?.rows || [];
  }
  return rows;
}

async function rebuildSourceData(resetFields) {
  invalidateDerivedCaches();
  state.sourceRows = getRowsForArrayPath(state.arrayPath);
  state.allColumns = buildColumnUnion(state.sourceRows);

  if (resetFields || !state.fieldConfigs.length) {
    state.fieldConfigs = state.allColumns.map((column, index) => ({
      path: column.path,
      label: column.path,
      selected: true,
      order: index
    }));
  } else {
    state.fieldConfigs = mergeFieldConfigs(state.fieldConfigs, state.allColumns);
  }

  if (resetFields) {
    state.filters = createFilterGroup("all");
    state.valueMappings = {};
    state.fieldMappings = [];
    state.widgets = createDefaultWidgets();
  }

  state.commonFilters = normalizeCommonFilters(state.commonFilters, state.fieldConfigs);
  recomputeFilteredRows();
}

function mergeFieldConfigs(previousFields, columns) {
  const previousMap = new Map(previousFields.map((field) => [field.path, field]));
  const next = [];

  for (const field of previousFields) {
    if (columns.some((column) => column.path === field.path)) {
      next.push({ ...field, order: next.length });
    }
  }

  for (const column of columns) {
    if (!previousMap.has(column.path)) {
      next.push({
        path: column.path,
        label: column.path,
        selected: false,
        order: next.length
      });
    }
  }

  return next;
}

function rebuildFieldConfigsForSource() {
  invalidateDerivedCaches();
  state.sourceRows = getRowsForArrayPath(state.arrayPath);
  state.allColumns = buildColumnUnion(state.sourceRows);
  state.fieldConfigs = state.allColumns.map((column, index) => ({
    path: column.path,
    label: column.path,
    selected: true,
    order: index
  }));
  state.filters = createFilterGroup("all");
  state.valueMappings = {};
  state.fieldMappings = [];
}

function buildColumnUnion(rows) {
  const columns = new Map();
  for (const row of rows) {
    const flattened = getFlattenedRow(row);
    for (const [path, value] of Object.entries(flattened)) {
      if (path.startsWith("__")) {
        continue;
      }
      const current = columns.get(path) || {
        path,
        count: 0,
        sample: value
      };
      current.count += 1;
      if (current.sample === undefined || current.sample === null || current.sample === "") {
        current.sample = value;
      }
      columns.set(path, current);
    }
  }
  return [...columns.values()];
}

function flattenRow(row, prefix = "", output = {}) {
  if (!isPlainObject(row)) {
    output[prefix || "value"] = row;
    return output;
  }

  for (const [key, value] of Object.entries(row)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      flattenRow(value, path, output);
    } else if (Array.isArray(value)) {
      output[path] = JSON.stringify(value);
    } else {
      output[path] = value;
    }
  }
  return output;
}

function getFlattenedRow(row) {
  if (row && typeof row === "object" && row.__flattened) {
    return row;
  }
  if (row && typeof row === "object" && state.flattenedRowCache.has(row)) {
    return state.flattenedRowCache.get(row);
  }
  const flattened = flattenRow(row);
  applyValueMappings(flattened);
  applyFieldMappings(flattened);
  applyValueMappings(flattened);
  const result = { ...flattened, __original: row, __flattened: true };
  if (row && typeof row === "object") {
    state.flattenedRowCache.set(row, result);
  }
  return result;
}

function invalidateDerivedCaches() {
  state.flattenedRowCache = new WeakMap();
  state.widgetRowsCache.clear();
}

function applyValueMappings(flattened) {
  for (const [field, mappings] of Object.entries(state.valueMappings || {})) {
    if (!(field in flattened) || !Array.isArray(mappings)) {
      continue;
    }
    const sourceValue = String(flattened[field] ?? "");
    const match = mappings.find((mapping) => String(mapping.sourceValue ?? "") === sourceValue);
    if (match && String(match.mappedValue ?? "") !== "") {
      flattened[field] = match.mappedValue;
    }
  }
}

function applyFieldMappings(flattened) {
  for (const mapping of state.fieldMappings || []) {
    const sourceField = resolveFieldReference(mapping.sourceField);
    const targetField = resolveFieldReference(mapping.targetField);
    if (!sourceField || !targetField || !(sourceField in flattened)) {
      continue;
    }

    let shouldApply = false;
    let derivedValue;
    if (mapping.operator === "copy") {
      shouldApply = true;
      derivedValue = flattened[sourceField];
    } else if (isFilterConditionReady({
      field: sourceField,
      operator: mapping.operator,
      value: mapping.conditionValue,
      enabled: true
    })) {
      shouldApply = matchesFilter(flattened, {
        field: sourceField,
        operator: mapping.operator,
        value: mapping.conditionValue
      });
      derivedValue = coerceDerivedValue(mapping.targetValue);
    }

    if (!shouldApply) {
      continue;
    }
    if (
      mapping.overwrite === false
      && flattened[targetField] !== undefined
      && flattened[targetField] !== null
      && flattened[targetField] !== ""
    ) {
      continue;
    }
    flattened[targetField] = derivedValue;
  }
}

function resolveFieldReference(reference) {
  const value = String(reference || "").trim();
  if (!value) {
    return "";
  }
  const normalized = value.toLowerCase();
  const matched = state.fieldConfigs.find((field) => (
    field.path.toLowerCase() === normalized
    || field.label.toLowerCase() === normalized
  ));
  return matched?.path || value;
}

function coerceDerivedValue(value) {
  const text = String(value ?? "");
  const trimmed = text.trim();
  if (trimmed === "") {
    return "";
  }
  if (trimmed === "null") {
    return null;
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : text;
}

function createFilterGroup(logic = "all") {
  return {
    id: createId("filter-group"),
    type: "group",
    logic,
    children: []
  };
}

function createFilterCondition(field = "") {
  return {
    id: createId("filter"),
    type: "condition",
    field,
    operator: "contains",
    value: "",
    enabled: true
  };
}

function recomputeFilteredRows() {
  state.filteredRows = state.sourceRows.filter((row) => {
    const flattened = getFlattenedRow(row);
    return evaluateFilterGroup(state.filters, flattened);
  });
  state.widgetRowsCache.clear();
  state.tablePages = {};
}

function evaluateFilterGroup(group, row) {
  if (!group || !Array.isArray(group.children) || !group.children.length) {
    return true;
  }

  const activeChildren = group.children.filter((child) => (
    child.enabled === false
      ? false
      : child.type === "group"
        ? true
        : child.type === "reference"
          ? Boolean(child.name)
          : isFilterConditionReady(child)
  ));
  if (!activeChildren.length) {
    return true;
  }

  const results = activeChildren
    .map((child) => (
      child.type === "group"
        ? evaluateFilterGroup(child, row)
        : child.type === "reference"
          ? evaluateCommonFilterReference(child, row)
          : child.field
            ? matchesFilter(row, child)
            : true
    ));

  return group.logic === "any" ? results.some(Boolean) : results.every(Boolean);
}

function evaluateCommonFilterReference(reference, row) {
  const common = state.commonFilters.find((item) => item.name === reference.name);
  return common ? evaluateFilterGroup(common.group, row) : true;
}

function isFilterConditionReady(condition) {
  if (condition.enabled === false || !condition.field) {
    return false;
  }
  if (["empty", "notEmpty"].includes(condition.operator)) {
    return true;
  }
  return String(condition.value ?? "").trim() !== "";
}

function findFilterNode(root, id, parent = null) {
  if (!root || !id) {
    return null;
  }
  if (root.id === id) {
    return { node: root, parent, index: -1 };
  }
  for (let index = 0; index < (root.children || []).length; index += 1) {
    const child = root.children[index];
    if (child.id === id) {
      return { node: child, parent: root, index };
    }
    if (child.type === "group") {
      const found = findFilterNode(child, id, child);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function matchesFilter(row, condition) {
  const rawValue = row[condition.field];
  const value = rawValue === undefined || rawValue === null ? "" : String(rawValue);
  const target = String(condition.value ?? "");
  const numberValue = Number(rawValue);
  const numberTarget = Number(target);
  const dateValue = isDateLikeValue(rawValue) ? toDateBoundary(rawValue) : null;
  const dateTarget = isDateLikeValue(target) ? toDateBoundary(target) : null;

  if (dateValue !== null && dateTarget !== null) {
    switch (condition.operator) {
      case "equals":
        return dateValue === dateTarget;
      case "notEquals":
        return dateValue !== dateTarget;
      case "gt":
        return dateValue > dateTarget;
      case "gte":
        return dateValue >= dateTarget;
      case "lt":
        return dateValue < dateTarget;
      case "lte":
        return dateValue <= dateTarget;
      default:
        break;
    }
  }

  switch (condition.operator) {
    case "equals":
      return value === target;
    case "notEquals":
      return value !== target;
    case "contains":
      return value.toLowerCase().includes(target.toLowerCase());
    case "notContains":
      return !value.toLowerCase().includes(target.toLowerCase());
    case "gt":
      return Number.isFinite(numberValue) && Number.isFinite(numberTarget) && numberValue > numberTarget;
    case "gte":
      return Number.isFinite(numberValue) && Number.isFinite(numberTarget) && numberValue >= numberTarget;
    case "lt":
      return Number.isFinite(numberValue) && Number.isFinite(numberTarget) && numberValue < numberTarget;
    case "lte":
      return Number.isFinite(numberValue) && Number.isFinite(numberTarget) && numberValue <= numberTarget;
    case "empty":
      return value === "";
    case "notEmpty":
      return value !== "";
    case "in":
      return target.split(",").map((item) => item.trim()).filter(Boolean).includes(value);
    case "notIn":
      return !target.split(",").map((item) => item.trim()).filter(Boolean).includes(value);
    default:
      return true;
  }
}

function isDateField(field) {
  const values = state.sourceRows
    .slice(0, 100)
    .map((row) => getFlattenedRow(row)[field])
    .filter((value) => value !== undefined && value !== null && value !== "");
  if (!values.length) {
    return false;
  }
  return values.filter(isDateLikeValue).length / values.length >= 0.7;
}

function normalizeDateInputValue(value) {
  if (!isDateLikeValue(value)) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function toDateBoundary(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function createDefaultWidgets() {
  const selectedFields = getSelectedFieldPaths();
  if (!selectedFields.length) {
    return [];
  }

  const categorical = findBestField(selectedFields, "category");
  const secondCategorical = findBestField(
    selectedFields.filter((field) => field !== categorical),
    "category"
  );
  const temporal = findBestField(selectedFields, "date");
  const metric = findBestField(selectedFields, "number");
  const metricField = metric || "";
  const widgets = [
    {
      id: createId("widget"),
      title: "记录数",
      type: "kpi",
      dimension: "",
      series: "",
      metricField: "",
      aggregation: "count",
      sort: "none",
      limit: 20,
      size: "half"
    },
    {
      id: createId("widget"),
      title: "二维数据表",
      type: "table",
      dimension: "",
      series: "",
      metricField: "",
      aggregation: "count",
      sort: "none",
      limit: 100,
      size: "full"
    },
    {
      id: createId("widget"),
      title: categorical ? `按 ${fieldLabel(categorical)} 统计` : "分类统计",
      type: "bar",
      dimension: categorical || selectedFields[0],
      series: "",
      metricField,
      aggregation: metric ? "sum" : "count",
      sort: "desc",
      limit: 0,
      size: "half"
    },
    {
      id: createId("widget"),
      title: categorical ? `${fieldLabel(categorical)} 占比` : "分类占比",
      type: "pie",
      dimension: categorical || selectedFields[0],
      series: "",
      metricField,
      aggregation: metric ? "sum" : "count",
      sort: "desc",
      limit: 10,
      size: "full",
      scale: 1.25
    }
  ];

  if (temporal || categorical) {
    widgets.push({
      id: createId("widget"),
      title: temporal ? `${fieldLabel(temporal)} 趋势` : "指标趋势",
      type: "line",
      dimension: temporal || categorical,
      series: "",
      metricField,
      aggregation: metric ? "sum" : "count",
      sort: "labelAsc",
      limit: 30,
      size: "full"
    });
  }

  if (categorical && secondCategorical) {
    widgets.push({
      id: createId("widget"),
      title: `${fieldLabel(categorical)} × ${fieldLabel(secondCategorical)}`,
      type: "stackedBar",
      dimension: categorical,
      series: secondCategorical,
      metricField,
      aggregation: metric ? "sum" : "count",
      sort: "desc",
      limit: 12,
      size: "full"
    });
  }

  return widgets.map(normalizeWidget);
}

function normalizeWidget(widget) {
  return {
    id: widget?.id || createId("widget"),
    title: widget?.title || "分析组件",
    type: widget?.type || "bar",
    dimension: widget?.dimension || "",
    series: widget?.series || "",
    metricField: widget?.metricField || "",
    metricAlias: String(widget?.metricAlias || ""),
    aggregation: widget?.aggregation || "count",
    sort: widget?.sort || "desc",
    axisLabelMode: widget?.axisLabelMode === "wrap" ? "wrap" : "scroll",
    showValues: widget?.showValues !== false,
    colors: Array.isArray(widget?.colors) ? widget.colors.filter(isHexColor).slice(0, 40) : [],
    filters: widget?.filters ? cloneJson(widget.filters) : createFilterGroup("all"),
    limit: Math.max(0, Number(widget?.limit) || 0),
    pageSize: Math.max(1, Number(widget?.pageSize) || 20),
    pieLegendThreshold: Math.max(1, Number(widget?.pieLegendThreshold) || 6),
    showLegendText: widget?.showLegendText === true,
    smallValueMode: ["leader", "shrink", "hover"].includes(widget?.smallValueMode)
      ? widget.smallValueMode
      : "leader",
    scale: Math.min(3, Math.max(0.5, Number(widget?.scale) || 1)),
    size: widget?.size === "full" ? "full" : "half"
  };
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || ""));
}

function findBestField(fields, type) {
  if (type === "number") {
    const candidates = fields
      .filter((field) => !isIdentifierLikeField(field))
      .map((field) => {
        const values = state.sourceRows.slice(0, 100)
          .map((row) => getFlattenedRow(row)[field])
          .filter((value) => value !== "");
        const numeric = values.filter((value) => Number.isFinite(Number(value))).length;
        const ratio = values.length ? numeric / values.length : 0;
        const nameScore = /amount|total|price|qty|quantity|score|value|sum|count|number/i.test(field) ? 10 : 0;
        return { field, score: ratio + nameScore };
      })
      .filter((item) => item.score >= 0.8)
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.field || "";
  }

  if (type === "date") {
    return fields.find((field) => {
      const values = state.sourceRows.slice(0, 40).map((row) => getFlattenedRow(row)[field]).filter(Boolean);
      const dates = values.filter(isDateLikeValue).length;
      return values.length > 0 && dates / values.length >= 0.7;
    }) || "";
  }

  const candidates = fields
    .filter((field) => !isIdentifierLikeField(field))
    .map((field) => {
      const values = state.sourceRows.slice(0, 200)
        .map((row) => getFlattenedRow(row)[field])
        .filter((value) => value !== "");
      const distinct = new Set(values.map(String)).size;
      const uniqueRatio = values.length ? distinct / values.length : 0;
      const dateRatio = values.length
        ? values.filter(isDateLikeValue).length / values.length
        : 0;
      const booleanRatio = values.length
        ? values.filter((value) => typeof value === "boolean" || ["true", "false"].includes(String(value).toLowerCase())).length / values.length
        : 0;
      const numericRatio = values.length
        ? values.filter((value) => Number.isFinite(Number(value))).length / values.length
        : 0;
      if (dateRatio > 0.7 || booleanRatio > 0.8) {
        return { field, score: -1 };
      }
      const nameScore = /region|category|type|status|group|department|city|省份|地区|类型|状态|分类|部门/i.test(field)
        ? 10
        : 0;
      const ideal = distinct > 1 && distinct <= 30 && !(numericRatio > 0.9 && distinct > 10 && nameScore === 0);
      return {
        field,
        score: ideal ? 20 + nameScore - Math.abs(8 - distinct) - uniqueRatio * 3 : -1
      };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.field || fields[0] || "";
}

function isIdentifierLikeField(field) {
  return /(^|\.)(id|uuid|guid|key|code)$/i.test(field)
    || /(^|\.).*(_id|Id)$/.test(field);
}

function isDateLikeValue(value) {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  const text = String(value ?? "").trim();
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[T\s].*)?$/.test(text)
    || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text);
}

function renderAll() {
  const startedAt = performance.now();
  renderTemplateSelect();
  renderFieldList();
  renderMappingEditor();
  renderCommonFilterList();
  renderFilterList();
  syncTemplateControls();
  recomputeFilteredRows();
  renderDatasetHeader();
  renderDashboard();
  document.documentElement.dataset.renderDurationMs = (
    performance.now() - startedAt
  ).toFixed(1);
}

function renderDatasetHeader() {
  const dataset = state.dataset;
  if (!dataset) {
    return;
  }

  elements.datasetStatus.className = `status-badge status-${dataset.status || "complete"}`;
  elements.datasetStatus.textContent = statusLabel(dataset.status);
  elements.datasetCaption.textContent = `${dataset.name || "未命名数据集"} · ${dataset.rowCount || 0} 条记录 · ${dataset.pageCount || 0} 页`;
  elements.dashboardHeading.textContent = `${dataset.name || "数据集"} 分析看板`;

  elements.arrayPathSelect.replaceChildren();
  for (const item of state.arrayPaths) {
    const option = document.createElement("option");
    option.value = item.path;
    option.textContent = `${item.label}${item.count ? ` · ${item.count} 条/页` : ""}`;
    elements.arrayPathSelect.append(option);
  }
  elements.arrayPathSelect.value = state.arrayPath;

  renderSummaryGrid([
    ["原始行数", state.sourceRows.length],
    ["字段数", state.allColumns.length],
    ["当前筛选", state.filteredRows.length],
    ["分页数", dataset.pageCount || 0],
    ["接口", dataset.request?.method || "-"],
    ["上下文", dataset.request?.context === "background" ? "后台" : "当前页面"]
  ]);
}

function renderSummaryGrid(items) {
  elements.datasetSummary.replaceChildren();
  for (const [label, value] of items) {
    const item = document.createElement("div");
    item.className = "summary-item";
    const labelElement = document.createElement("span");
    labelElement.textContent = label;
    const valueElement = document.createElement("strong");
    valueElement.textContent = String(value);
    item.append(labelElement, valueElement);
    elements.datasetSummary.append(item);
  }
}

function renderTemplateSelect() {
  const available = templatesForCurrentDataset();
  elements.templateSelect.replaceChildren();

  if (!available.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "未保存模板";
    elements.templateSelect.append(option);
    return;
  }

  for (const template of available) {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name || "未命名模板";
    elements.templateSelect.append(option);
  }
  elements.templateSelect.value = state.currentTemplateId || available[0].id;
}

function syncTemplateControls() {
  const available = templatesForCurrentDataset();
  const current = available.find((template) => template.id === state.currentTemplateId);
  if (current) {
    elements.templateName.value = current.name || "";
    elements.deleteTemplateButton.disabled = false;
  } else {
    elements.deleteTemplateButton.disabled = true;
    if (!elements.templateName.value) {
      elements.templateName.value = `${state.dataset?.name || "数据集"} 报表`;
    }
  }
}

function templatesForCurrentDataset() {
  const sourceProfileId = state.dataset?.sourceProfileId || state.dataset?.requestConfig?.id;
  return state.reportTemplates
    .filter((template) => (
      template.datasetId === state.datasetId
      || (sourceProfileId && template.sourceProfileId === sourceProfileId)
      || (!template.datasetId && theSameRequest(template.requestConfig, state.dataset?.requestConfig))
    ))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function findInitialTemplate(requestedTemplateId) {
  if (requestedTemplateId) {
    return state.reportTemplates.find((template) => template.id === requestedTemplateId) || null;
  }
  return templatesForCurrentDataset()[0] || null;
}

async function refreshReportTemplates() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.reportTemplates,
    STORAGE_KEYS.commonFilters
  ]);
  state.reportTemplates = Array.isArray(stored[STORAGE_KEYS.reportTemplates])
    ? stored[STORAGE_KEYS.reportTemplates]
    : [];
  state.commonFilters = normalizeCommonFilters(
    Array.isArray(stored[STORAGE_KEYS.commonFilters])
      ? stored[STORAGE_KEYS.commonFilters]
      : state.commonFilters,
    state.fieldConfigs
  );
}

function renderFieldList() {
  const search = elements.fieldSearch.value.trim().toLowerCase();
  const fields = state.fieldConfigs.filter((field) => (
    (!state.hideUnselectedFields || field.selected)
    && (!search || field.path.toLowerCase().includes(search) || field.label.toLowerCase().includes(search))
  ));
  elements.fieldList.replaceChildren();
  elements.fieldCount.textContent = `${state.fieldConfigs.filter((field) => field.selected).length} / ${state.fieldConfigs.length}`;
  elements.hideUnselectedFieldsButton.textContent = state.hideUnselectedFields
    ? "显示全部字段"
    : "隐藏未选中";

  for (const field of fields) {
    const item = document.createElement("div");
    item.className = `field-item${field.selected ? " is-selected" : ""}`;
    item.dataset.path = field.path;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = field.selected;
    checkbox.dataset.action = "select";

    const main = document.createElement("div");
    main.className = "field-item-main";
    const aliasInput = document.createElement("input");
    aliasInput.type = "text";
    aliasInput.value = field.label;
    aliasInput.dataset.action = "alias";
    aliasInput.placeholder = field.path;
    const code = document.createElement("code");
    code.textContent = field.path;
    main.append(aliasInput, code);

    const actions = document.createElement("div");
    actions.className = "field-item-actions";
    actions.append(
      createMiniButton("↑", "up", "上移"),
      createMiniButton("↓", "down", "下移")
    );

    item.append(checkbox, main, actions);
    elements.fieldList.append(item);
  }
}

function toggleHideUnselectedFields() {
  state.hideUnselectedFields = !state.hideUnselectedFields;
  persistReportUiState();
  renderFieldList();
}

function moveUnselectedFieldsTop() {
  const unselected = state.fieldConfigs.filter((field) => !field.selected);
  const selected = state.fieldConfigs.filter((field) => field.selected);
  state.fieldConfigs = [...unselected, ...selected];
  state.fieldConfigs.forEach((field, order) => {
    field.order = order;
  });
  renderFieldList();
  renderMappingEditor();
  renderFilterList();
  renderDashboard();
}

function createMiniButton(text, action, title) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mini-button";
  button.textContent = text;
  button.dataset.action = action;
  button.title = title;
  return button;
}

function handleFieldListChange(event) {
  const item = event.target.closest(".field-item");
  if (!item) {
    return;
  }
  const field = state.fieldConfigs.find((entry) => entry.path === item.dataset.path);
  if (!field) {
    return;
  }

  if (event.target.dataset.action === "select") {
    field.selected = event.target.checked;
    item.classList.toggle("is-selected", field.selected);
    elements.fieldCount.textContent = `${state.fieldConfigs.filter((entry) => entry.selected).length} / ${state.fieldConfigs.length}`;
    renderDashboard();
  }

  if (event.target.dataset.action === "alias") {
    field.label = event.target.value || field.path;
    renderMappingEditor();
    renderFilterList();
    renderDashboard();
  }
}

function handleFieldListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const item = button.closest(".field-item");
  const index = state.fieldConfigs.findIndex((field) => field.path === item.dataset.path);
  if (index < 0) {
    return;
  }

  if (button.dataset.action === "up" && index > 0) {
    [state.fieldConfigs[index - 1], state.fieldConfigs[index]] = [
      state.fieldConfigs[index],
      state.fieldConfigs[index - 1]
    ];
  }
  if (button.dataset.action === "down" && index < state.fieldConfigs.length - 1) {
    [state.fieldConfigs[index + 1], state.fieldConfigs[index]] = [
      state.fieldConfigs[index],
      state.fieldConfigs[index + 1]
    ];
  }

  state.fieldConfigs.forEach((field, order) => {
    field.order = order;
  });
  renderFieldList();
  renderMappingEditor();
  renderFilterList();
  renderDashboard();
}

function renderMappingEditor() {
  const fields = [...state.fieldConfigs].sort((a, b) => a.order - b.order);
  renderFieldMappingEditor(fields);
  if (!fields.length) {
    elements.mappingFieldSelect.replaceChildren();
    elements.mappingList.replaceChildren();
    return;
  }

  if (!fields.some((field) => field.path === state.mappingField)) {
    state.mappingField = fields[0].path;
  }

  elements.mappingFieldSelect.replaceChildren();
  for (const field of fields) {
    const option = document.createElement("option");
    option.value = field.path;
    option.textContent = field.label;
    elements.mappingFieldSelect.append(option);
  }
  elements.mappingFieldSelect.value = state.mappingField;

  const mappings = state.valueMappings[state.mappingField] || [];
  elements.mappingList.replaceChildren();
  if (!mappings.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "当前字段没有值映射。";
    elements.mappingList.append(empty);
    return;
  }

  for (const mapping of mappings) {
    const item = document.createElement("div");
    item.className = "mapping-item";
    item.dataset.id = mapping.id;

    const sourceInput = document.createElement("input");
    sourceInput.type = "text";
    sourceInput.dataset.action = "source";
    sourceInput.value = mapping.sourceValue;
    sourceInput.placeholder = "原始值";

    const mappedInput = document.createElement("input");
    mappedInput.type = "text";
    mappedInput.dataset.action = "mapped";
    mappedInput.value = mapping.mappedValue;
    mappedInput.placeholder = "展示值";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "mini-button";
    removeButton.dataset.action = "removeMapping";
    removeButton.textContent = "×";
    removeButton.title = "删除映射";

    item.append(sourceInput, mappedInput, removeButton);
    elements.mappingList.append(item);
  }
}

function renderFieldMappingEditor(fields) {
  elements.fieldMappingJson.value = JSON.stringify({
    version: 1,
    rules: state.fieldMappings
  }, null, 2);
  elements.fieldMappingState.textContent = state.fieldMappings.length
    ? `已应用 ${state.fieldMappings.length} 条字段派生规则。`
    : "尚未应用字段派生规则。";
}

function applyFieldMappingJson() {
  try {
    const parsed = JSON.parse(elements.fieldMappingJson.value || "{}");
    const rules = Array.isArray(parsed) ? parsed : parsed.rules;
    if (!Array.isArray(rules)) {
      throw new Error("JSON 中必须包含 rules 数组。");
    }
    state.fieldMappings = normalizeFieldMappings(rules);
    refreshDerivedFields();
    elements.fieldMappingState.textContent = `已应用 ${state.fieldMappings.length} 条字段派生规则。`;
    showToast(`已应用 ${state.fieldMappings.length} 条字段派生规则。`);
  } catch (error) {
    showToast(`字段派生规则错误：${error.message}`);
  }
}

function downloadFieldMappingTemplate() {
  const template = {
    version: 1,
    rules: [
      {
        sourceField: "商品名",
        operator: "equals",
        conditionValue: "可乐",
        targetField: "价格",
        targetValue: 2,
        overwrite: true
      }
    ]
  };
  downloadBlob(
    new Blob([JSON.stringify(template, null, 2)], { type: "application/json" }),
    "字段派生规则模板.json"
  );
}

async function importFieldMappingFile() {
  const [file] = elements.fieldMappingFileInput.files || [];
  elements.fieldMappingFileInput.value = "";
  if (!file) {
    return;
  }
  try {
    elements.fieldMappingJson.value = await file.text();
    applyFieldMappingJson();
  } catch (error) {
    showToast(`导入字段派生规则失败：${error.message}`);
  }
}

function refreshDerivedFields() {
  invalidateDerivedCaches();
  state.allColumns = buildColumnUnion(state.sourceRows);
  state.fieldConfigs = mergeFieldConfigs(state.fieldConfigs, state.allColumns);
  if (!state.fieldConfigs.some((field) => field.path === state.mappingField)) {
    state.mappingField = state.fieldConfigs[0]?.path || "";
  }
  recomputeFilteredRows();
  renderFieldList();
  renderMappingEditor();
  renderFilterList();
  renderDashboard();
}

function addValueMapping() {
  if (!state.mappingField) {
    return;
  }
  if (!state.valueMappings[state.mappingField]) {
    state.valueMappings[state.mappingField] = [];
  }
  const mappings = state.valueMappings[state.mappingField];
  const existing = new Set(mappings.map((mapping) => String(mapping.sourceValue)));
  const nextValue = getDistinctFieldValues(state.mappingField)
    .map((item) => item.value)
    .find((value) => !existing.has(String(value)));

  mappings.push({
    id: createId("mapping"),
    sourceValue: nextValue === undefined ? "" : String(nextValue),
    mappedValue: ""
  });
  renderMappingEditor();
}

function handleMappingChange(event) {
  const item = event.target.closest(".mapping-item");
  if (!item || !state.mappingField) {
    return;
  }
  const mapping = (state.valueMappings[state.mappingField] || [])
    .find((entry) => entry.id === item.dataset.id);
  if (!mapping) {
    return;
  }

  if (event.target.dataset.action === "source") {
    mapping.sourceValue = event.target.value;
  }
  if (event.target.dataset.action === "mapped") {
    mapping.mappedValue = event.target.value;
  }

  invalidateDerivedCaches();
  recomputeFilteredRows();
  renderDashboard();
}

function handleMappingClick(event) {
  const button = event.target.closest('button[data-action="removeMapping"]');
  if (!button) {
    return;
  }
  const item = button.closest(".mapping-item");
  const mappings = state.valueMappings[state.mappingField] || [];
  state.valueMappings[state.mappingField] = mappings.filter(
    (mapping) => mapping.id !== item.dataset.id
  );
  if (!state.valueMappings[state.mappingField].length) {
    delete state.valueMappings[state.mappingField];
  }
  invalidateDerivedCaches();
  renderMappingEditor();
  recomputeFilteredRows();
  renderDashboard();
}

function getDistinctFieldValues(field) {
  const counts = new Map();
  for (const row of state.sourceRows) {
    const value = getFlattenedRow(row)[field];
    const key = String(value ?? "");
    const current = counts.get(key) || { value, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

function renderCommonFilterList() {
  elements.commonFilterList.replaceChildren();
  if (!state.commonFilters.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "尚未保存常用条件。";
    elements.commonFilterList.append(empty);
    return;
  }

  for (const common of state.commonFilters) {
    const item = document.createElement("div");
    item.className = "common-filter-item";
    item.dataset.name = common.name;
    const name = document.createElement("code");
    name.textContent = common.name;
    const summary = document.createElement("span");
    summary.className = "common-filter-summary";
    summary.textContent = describeFilterGroup(common.group);
    const copy = document.createElement("div");
    copy.className = "common-filter-copy";
    copy.append(name, summary);
    const actions = document.createElement("div");
    actions.className = "button-row";
    const load = document.createElement("button");
    load.type = "button";
    load.className = "text-button";
    load.dataset.action = "loadCommonFilter";
    load.textContent = "载入";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button";
    remove.dataset.action = "deleteCommonFilter";
    remove.textContent = "删除";
    actions.append(load, remove);
    item.append(copy, actions);
    elements.commonFilterList.append(item);
  }
}

async function saveCommonFilter() {
  const name = elements.commonFilterName.value.trim();
  if (!name) {
    showToast("请输入常用条件名称。");
    return;
  }
  if (state.commonFilters.some((item) => item.name === name)) {
    showToast("常用条件名称必须唯一，请更换名称。");
    return;
  }
  state.commonFilters.push({
    id: createId("common-filter"),
    name,
    group: cloneJson(state.filters)
  });
  elements.commonFilterName.value = "";
  await chrome.storage.local.set({
    [STORAGE_KEYS.commonFilters]: state.commonFilters
  });
  renderCommonFilterList();
  showToast(`常用条件“${name}”已保存。`);
}

function handleCommonFilterClick(event) {
  const button = event.target.closest("button[data-action]");
  const item = event.target.closest(".common-filter-item");
  if (!button || !item) {
    return;
  }
  const common = state.commonFilters.find((entry) => entry.name === item.dataset.name);
  if (!common) {
    return;
  }
  if (button.dataset.action === "loadCommonFilter") {
    state.filters = normalizeFilters(common.group, state.fieldConfigs);
    renderFilterList();
    recomputeFilteredRows();
    renderDashboard();
    return;
  }
  if (button.dataset.action === "deleteCommonFilter") {
    if (!confirm(`确定删除常用条件“${common.name}”吗？`)) {
      return;
    }
    state.commonFilters = state.commonFilters.filter((entry) => entry.id !== common.id);
    chrome.storage.local.set({
      [STORAGE_KEYS.commonFilters]: state.commonFilters
    });
    renderCommonFilterList();
    showToast("常用条件已删除。");
  }
}

const FILTER_OPERATORS = {
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
};

function renderFilterList() {
  elements.filterLogic.value = state.filters.logic;
  elements.filterList.replaceChildren(renderFilterGroup(state.filters, true));
}

function renderFilterGroup(group, isRoot = false, options = {}) {
  const box = document.createElement("div");
  box.className = "filter-group";
  box.dataset.id = group.id;

  const header = document.createElement("div");
  header.className = "filter-group-header";
  const logicSelect = document.createElement("select");
  logicSelect.dataset.action = "groupLogic";
  logicSelect.dataset.id = group.id;
  logicSelect.innerHTML = `
    <option value="all">全部 AND</option>
    <option value="any">任一 OR</option>
  `;
  logicSelect.value = group.logic;

  const addConditionButton = document.createElement("button");
  addConditionButton.type = "button";
  addConditionButton.className = "text-button";
  addConditionButton.dataset.action = "addCondition";
  addConditionButton.dataset.id = group.id;
  addConditionButton.textContent = "条件";

  const addGroupButton = document.createElement("button");
  addGroupButton.type = "button";
  addGroupButton.className = "text-button";
  addGroupButton.dataset.action = "addGroup";
  addGroupButton.dataset.id = group.id;
  addGroupButton.textContent = "分组";

  header.append(logicSelect, addConditionButton, addGroupButton);

  if (options.allowReferences) {
    const addReferenceButton = document.createElement("button");
    addReferenceButton.type = "button";
    addReferenceButton.className = "text-button";
    addReferenceButton.dataset.action = "addReference";
    addReferenceButton.dataset.id = group.id;
    addReferenceButton.textContent = "常用";
    header.append(addReferenceButton);
  }

  if (!isRoot) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "mini-button";
    removeButton.dataset.action = "removeGroup";
    removeButton.dataset.id = group.id;
    removeButton.textContent = "×";
    removeButton.title = "删除整个分组";
    header.append(removeButton);
  }
  box.append(header);

  if (!group.children.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "本组尚未添加条件。";
    box.append(empty);
    return box;
  }

  for (const child of group.children) {
    if (child.type === "group") {
      box.append(renderFilterGroup(child, false, options));
    } else if (child.type === "reference") {
      box.append(createFilterReferenceItem(child));
    } else {
      box.append(createFilterItem(child));
    }
  }
  return box;
}

function createFilterReferenceItem(reference) {
  const item = document.createElement("div");
  item.className = "filter-reference-item";
  item.dataset.id = reference.id;

  const select = document.createElement("select");
  select.dataset.action = "referenceName";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "选择常用条件";
  select.append(empty);
  for (const common of state.commonFilters) {
    const option = document.createElement("option");
    option.value = common.name;
    option.textContent = common.name;
    select.append(option);
  }
  select.value = reference.name;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "mini-button";
  remove.dataset.action = "removeReference";
  remove.dataset.id = reference.id;
  remove.textContent = "×";
  remove.title = "删除常用条件引用";

  item.append(select, remove);
  return item;
}

function createFilterItem(condition) {
  const fields = [...state.fieldConfigs].sort((a, b) => a.order - b.order);
  const item = document.createElement("div");
  item.className = "filter-item";
  item.dataset.id = condition.id;

  const fieldSelect = document.createElement("select");
  fieldSelect.dataset.action = "field";
  for (const field of fields) {
    const option = document.createElement("option");
    option.value = field.path;
    option.textContent = field.label;
    fieldSelect.append(option);
  }
  fieldSelect.value = condition.field;

  const operatorSelect = document.createElement("select");
  operatorSelect.dataset.action = "operator";
  for (const [value, label] of Object.entries(FILTER_OPERATORS)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    operatorSelect.append(option);
  }
  operatorSelect.value = condition.operator;

  const valueInput = document.createElement("input");
  const dateField = isDateField(condition.field);
  valueInput.type = dateField && ["equals", "notEquals", "gt", "gte", "lt", "lte"].includes(condition.operator)
    ? "date"
    : "text";
  valueInput.dataset.action = "value";
  valueInput.value = valueInput.type === "date"
    ? normalizeDateInputValue(condition.value)
    : condition.value;
  valueInput.placeholder = ["empty", "notEmpty"].includes(condition.operator) ? "无需填写" : "筛选值";
  valueInput.disabled = ["empty", "notEmpty"].includes(condition.operator);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "mini-button";
  removeButton.dataset.action = "removeCondition";
  removeButton.dataset.id = condition.id;
  removeButton.textContent = "×";
  removeButton.title = "删除条件";

  item.append(fieldSelect, operatorSelect, valueInput, removeButton);
  return item;
}

function addFilterCondition() {
  addFilterConditionToGroup(state.filters.id);
}

function addFilterConditionToGroup(groupId) {
  const found = findFilterNode(state.filters, groupId);
  if (!found || found.node.type !== "group") {
    return;
  }
  const field = getSelectedFieldPaths()[0] || state.fieldConfigs[0]?.path || "";
  found.node.children.push(createFilterCondition(field));
  renderFilterList();
  recomputeFilteredRows();
  renderDashboard();
}

function addFilterGroupToGroup(groupId) {
  const found = findFilterNode(state.filters, groupId);
  if (!found || found.node.type !== "group") {
    return;
  }
  found.node.children.push(createFilterGroup("all"));
  renderFilterList();
  recomputeFilteredRows();
  renderDashboard();
}

function handleFilterChange(event) {
  if (event.target.dataset.action === "groupLogic") {
    const found = findFilterNode(state.filters, event.target.dataset.id);
    if (found?.node.type === "group") {
      found.node.logic = event.target.value;
      recomputeFilteredRows();
      renderDashboard();
    }
    return;
  }

  const item = event.target.closest(".filter-item");
  if (!item) {
    return;
  }
  const found = findFilterNode(state.filters, item.dataset.id);
  const condition = found?.node;
  if (!condition || condition.type !== "condition") {
    return;
  }

  if (event.target.dataset.action === "field") {
    condition.field = event.target.value;
  }
  if (event.target.dataset.action === "operator") {
    condition.operator = event.target.value;
    renderFilterList();
    recomputeFilteredRows();
    renderDashboard();
    return;
  }
  if (event.target.dataset.action === "value") {
    condition.value = event.target.value;
  }

  recomputeFilteredRows();
  renderDashboard();
}

function handleFilterClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const action = button.dataset.action;
  if (action === "addCondition") {
    addFilterConditionToGroup(button.dataset.id);
    return;
  }
  if (action === "addGroup") {
    addFilterGroupToGroup(button.dataset.id);
    return;
  }
  if (action === "removeCondition" || action === "removeGroup") {
    const found = findFilterNode(state.filters, button.dataset.id);
    if (found?.parent) {
      found.parent.children.splice(found.index, 1);
      renderFilterList();
      recomputeFilteredRows();
      renderDashboard();
    }
  }
}

function renderWidgetFilterEditor() {
  if (!state.editingWidgetFilters?.id) {
    state.editingWidgetFilters = createFilterGroup("all");
  }
  elements.widgetFilterList.replaceChildren(
    renderFilterGroup(state.editingWidgetFilters, true, { allowReferences: true })
  );
}

function addWidgetFilterCondition(groupId) {
  const found = findFilterNode(state.editingWidgetFilters, groupId);
  if (!found || found.node.type !== "group") {
    return;
  }
  const field = getSelectedFieldPaths()[0] || state.fieldConfigs[0]?.path || "";
  found.node.children.push(createFilterCondition(field));
  renderWidgetFilterEditor();
}

function addWidgetFilterGroup(groupId) {
  const found = findFilterNode(state.editingWidgetFilters, groupId);
  if (!found || found.node.type !== "group") {
    return;
  }
  found.node.children.push(createFilterGroup("all"));
  renderWidgetFilterEditor();
}

function addWidgetFilterReference(groupId) {
  const found = findFilterNode(state.editingWidgetFilters, groupId);
  if (!found || found.node.type !== "group") {
    return;
  }
  found.node.children.push({
    id: createId("filter-reference"),
    type: "reference",
    name: state.commonFilters[0]?.name || ""
  });
  renderWidgetFilterEditor();
}

function handleWidgetFilterChange(event) {
  const referenceItem = event.target.closest(".filter-reference-item");
  if (referenceItem && event.target.dataset.action === "referenceName") {
    const reference = findFilterNode(state.editingWidgetFilters, referenceItem.dataset.id)?.node;
    if (reference?.type === "reference") {
      reference.name = event.target.value;
    }
    return;
  }

  if (event.target.dataset.action === "groupLogic") {
    const found = findFilterNode(state.editingWidgetFilters, event.target.dataset.id);
    if (found?.node.type === "group") {
      found.node.logic = event.target.value;
    }
    return;
  }

  const item = event.target.closest(".filter-item");
  if (!item) {
    return;
  }
  const found = findFilterNode(state.editingWidgetFilters, item.dataset.id);
  const condition = found?.node;
  if (!condition || condition.type !== "condition") {
    return;
  }

  if (event.target.dataset.action === "field") {
    condition.field = event.target.value;
  }
  if (event.target.dataset.action === "operator") {
    condition.operator = event.target.value;
    renderWidgetFilterEditor();
  }
  if (event.target.dataset.action === "value") {
    condition.value = event.target.value;
  }
}

function handleWidgetFilterClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  if (button.dataset.action === "addCondition") {
    addWidgetFilterCondition(button.dataset.id);
    return;
  }
  if (button.dataset.action === "addGroup") {
    addWidgetFilterGroup(button.dataset.id);
    return;
  }
  if (button.dataset.action === "addReference") {
    addWidgetFilterReference(button.dataset.id);
    return;
  }
  if (
    button.dataset.action === "removeCondition"
    || button.dataset.action === "removeGroup"
    || button.dataset.action === "removeReference"
  ) {
    const found = findFilterNode(state.editingWidgetFilters, button.dataset.id);
    if (found?.parent) {
      found.parent.children.splice(found.index, 1);
      renderWidgetFilterEditor();
    }
  }
}

function renderDashboard() {
  state.widgetRowsCache.clear();
  const selectedFields = getSelectedFieldPaths();
  elements.analysisSummary.replaceChildren();
  for (const [label, value] of [
    ["筛选后行数", state.filteredRows.length],
    ["原始行数", state.sourceRows.length],
    ["展示字段", selectedFields.length],
    ["组件", state.widgets.length]
  ]) {
    const chip = document.createElement("span");
    chip.className = "analysis-chip";
    chip.textContent = `${label}: ${value}`;
    elements.analysisSummary.append(chip);
  }

  elements.dashboardGrid.replaceChildren();
  elements.dashboardEmpty.hidden = state.widgets.length > 0;

  state.widgets.forEach((widget, index) => {
    const card = document.createElement("article");
    card.className = `widget-card${widget.size === "full" ? " widget-full" : ""}`;
    card.dataset.id = widget.id;
    card.style.setProperty(
      "--widget-scale",
      String(widget.type === "pie" ? 1 : widget.scale || 1)
    );

    const header = document.createElement("header");
    header.className = "widget-header";
    const title = document.createElement("div");
    title.className = "widget-title";
    const strong = document.createElement("strong");
    strong.textContent = widget.title;
    const subtitle = document.createElement("span");
    subtitle.textContent = widgetSubtitle(widget);
    title.append(strong, subtitle);

    const actions = document.createElement("div");
    actions.className = "widget-actions";
    actions.append(
      createWidgetAction("↑", "up", "上移", index === 0),
      createWidgetAction("↓", "down", "下移", index === state.widgets.length - 1),
      createWidgetAction("PNG", "png", "导出此图表 PNG"),
      createWidgetAction("编辑", "edit", "编辑组件"),
      createWidgetAction("×", "delete", "删除组件")
    );
    header.append(title, actions);

    const body = document.createElement("div");
    body.className = "widget-body";
    renderWidgetBody(body, widget);
    card.append(header, body);
    elements.dashboardGrid.append(card);
  });
}

function widgetSubtitle(widget) {
  const metric = metricName(widget);
  return widget.dimension
    ? `${fieldLabel(widget.dimension)} · ${metric}`
    : metric;
}

function createWidgetAction(text, action, title, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mini-button";
  button.textContent = text;
  button.dataset.action = action;
  button.title = title;
  button.disabled = disabled;
  return button;
}

function handleDashboardAction(event) {
  const button = event.target.closest("button[data-action]");
  const card = event.target.closest(".widget-card");
  if (!button || !card) {
    return;
  }
  const index = state.widgets.findIndex((widget) => widget.id === card.dataset.id);
  if (index < 0) {
    return;
  }

  if (button.dataset.action === "tablePrev" || button.dataset.action === "tableNext") {
    const delta = button.dataset.action === "tablePrev" ? -1 : 1;
    state.tablePages[card.dataset.id] = Math.max(
      1,
      (state.tablePages[card.dataset.id] || 1) + delta
    );
    renderDashboard();
    return;
  }

  if (button.dataset.action === "up" && index > 0) {
    [state.widgets[index - 1], state.widgets[index]] = [state.widgets[index], state.widgets[index - 1]];
  }
  if (button.dataset.action === "down" && index < state.widgets.length - 1) {
    [state.widgets[index + 1], state.widgets[index]] = [state.widgets[index], state.widgets[index + 1]];
  }
  if (button.dataset.action === "edit") {
    openWidgetDialog(state.widgets[index]);
    return;
  }
  if (button.dataset.action === "png") {
    exportWidgetPng(card, state.widgets[index]);
    return;
  }
  if (button.dataset.action === "delete") {
    state.widgets.splice(index, 1);
  }
  renderDashboard();
}

function renderWidgetBody(container, widget) {
  container.replaceChildren();
  const widgetRows = getWidgetRows(widget);
  if (!widgetRows.length) {
    container.classList.add("is-empty");
    container.textContent = "当前筛选条件下没有数据。";
    return;
  }
  container.classList.remove("is-empty");

  if (widget.type === "kpi") {
    const value = aggregateRows(widgetRows, widget.metricField, widget.aggregation);
    const wrapper = document.createElement("div");
    wrapper.className = "widget-kpi";
    const strong = document.createElement("strong");
    strong.textContent = formatMetric(value);
    const span = document.createElement("span");
    span.textContent = widget.aggregation === "count"
      ? "筛选后的记录数"
      : `${aggregationLabel(widget.aggregation)} ${fieldLabel(widget.metricField)}`;
    wrapper.append(strong, span);
    container.append(wrapper);
    return;
  }

  if (widget.type === "table") {
    renderDetailTable(container, widget, widgetRows);
    return;
  }

  const pivot = buildPivotData(widget, widgetRows);
  if (!pivot.labels.length) {
    container.classList.add("is-empty");
    container.textContent = "没有可展示的数据。";
    return;
  }

  if (widget.type === "pivot") {
    renderPivotTable(container, pivot);
    return;
  }

  const chart = widget.type === "pie"
    ? renderPieChart(pivot)
    : widget.type === "line"
      ? renderLineChart(pivot)
      : renderBarChart(pivot, widget.type === "stackedBar");
  container.append(chart.container, chart.legend);
}

function buildPivotData(widget, rows = getWidgetRows(widget)) {
  const dimension = widget.dimension || "";
  const seriesField = widget.series || "";
  const groupMap = new Map();
  const seriesNames = new Set();

  for (const row of rows) {
    const flattened = getFlattenedRow(row);
    const label = dimension ? valueToLabel(flattened[dimension]) : "全部";
    const series = seriesField ? valueToLabel(flattened[seriesField]) : metricName(widget);
    seriesNames.add(series);
    if (!groupMap.has(label)) {
      groupMap.set(label, new Map());
    }
    const bucket = groupMap.get(label);
    if (!bucket.has(series)) {
      bucket.set(series, []);
    }
    bucket.get(series).push(row);
  }

  const seriesList = [...seriesNames];
  let labels = [...groupMap.keys()];
  const totals = new Map();
  for (const label of labels) {
    const bucket = groupMap.get(label);
    let total = 0;
    for (const series of seriesList) {
      total += aggregateRows(bucket.get(series) || [], widget.metricField, widget.aggregation);
    }
    totals.set(label, total);
  }

  if (widget.sort === "desc") {
    labels.sort((a, b) => totals.get(b) - totals.get(a));
  } else if (widget.sort === "asc") {
    labels.sort((a, b) => totals.get(a) - totals.get(b));
  } else if (widget.sort === "labelAsc") {
    labels.sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  }

  const limit = Math.max(0, Number(widget.limit) || 0);
  if (limit > 0) {
    labels = labels.slice(0, limit);
  }

  return {
    labels,
    seriesNames: seriesList,
    matrix: seriesList.map((series) => labels.map((label) => (
      aggregateRows(groupMap.get(label)?.get(series) || [], widget.metricField, widget.aggregation)
    ))),
    totals: labels.map((label) => totals.get(label) || 0),
    widget
  };
}

function getWidgetRows(widget) {
  if (state.widgetRowsCache.has(widget.id)) {
    return state.widgetRowsCache.get(widget.id);
  }
  const group = normalizeFilters(widget.filters || createFilterGroup("all"), state.fieldConfigs);
  const rows = state.filteredRows.filter((row) => (
    evaluateFilterGroup(group, getFlattenedRow(row))
  ));
  state.widgetRowsCache.set(widget.id, rows);
  return rows;
}

function renderDetailTable(container, widget, widgetRows = getWidgetRows(widget)) {
  const fields = getSelectedFields();
  const pageSize = Math.max(1, Number(widget.pageSize) || 20);
  const totalPages = Math.max(1, Math.ceil(widgetRows.length / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, state.tablePages[widget.id] || 1));
  state.tablePages[widget.id] = currentPage;
  const wrap = document.createElement("div");
  wrap.className = "data-table-wrap";
  const table = document.createElement("table");
  table.className = "data-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  for (const field of fields) {
    const th = document.createElement("th");
    th.textContent = field.label;
    headerRow.append(th);
  }
  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  const start = (currentPage - 1) * pageSize;
  for (const row of widgetRows.slice(start, start + pageSize)) {
    const flattened = getFlattenedRow(row);
    const tr = document.createElement("tr");
    for (const field of fields) {
      const td = document.createElement("td");
      td.textContent = displayValue(flattened[field.path]);
      td.title = td.textContent;
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.append(table);
  container.append(wrap);

  if (totalPages > 1) {
    const controls = document.createElement("div");
    controls.className = "table-pagination";
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "mini-button";
    previous.dataset.action = "tablePrev";
    previous.textContent = "上一页";
    previous.disabled = currentPage <= 1;

    const status = document.createElement("span");
    status.textContent = `第 ${currentPage} / ${totalPages} 页`;

    const next = document.createElement("button");
    next.type = "button";
    next.className = "mini-button";
    next.dataset.action = "tableNext";
    next.textContent = "下一页";
    next.disabled = currentPage >= totalPages;

    controls.append(previous, status, next);
    container.append(controls);
  }
}

function renderPivotTable(container, pivot) {
  const wrap = document.createElement("div");
  wrap.className = "data-table-wrap";
  const table = document.createElement("table");
  table.className = "data-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const firstTh = document.createElement("th");
  firstTh.textContent = fieldLabel(pivot.widget.dimension) || "分组";
  headRow.append(firstTh);

  if (pivot.seriesNames.length === 1) {
    const th = document.createElement("th");
    th.textContent = pivot.seriesNames[0];
    headRow.append(th);
  } else {
    for (const series of pivot.seriesNames) {
      const th = document.createElement("th");
      th.textContent = series;
      headRow.append(th);
    }
    const totalTh = document.createElement("th");
    totalTh.textContent = "合计";
    headRow.append(totalTh);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  pivot.labels.forEach((label, rowIndex) => {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("td");
    labelCell.textContent = label;
    tr.append(labelCell);

    if (pivot.seriesNames.length === 1) {
      const valueCell = document.createElement("td");
      valueCell.textContent = formatMetric(pivot.matrix[0][rowIndex]);
      tr.append(valueCell);
    } else {
      for (let seriesIndex = 0; seriesIndex < pivot.seriesNames.length; seriesIndex += 1) {
        const valueCell = document.createElement("td");
        valueCell.textContent = formatMetric(pivot.matrix[seriesIndex][rowIndex]);
        tr.append(valueCell);
      }
      const totalCell = document.createElement("td");
      totalCell.textContent = formatMetric(pivot.totals[rowIndex]);
      tr.append(totalCell);
    }
    tbody.append(tr);
  });
  table.append(tbody);
  wrap.append(table);
  container.append(wrap);
}

function renderBarChart(pivot, stacked) {
  const widget = pivot.widget;
  const axisLabelMode = widget.axisLabelMode || "scroll";
  const longestLabel = Math.max(0, ...pivot.labels.map((label) => String(label).length));
  const minSlot = axisLabelMode === "wrap"
    ? Math.min(220, Math.max(84, longestLabel * 7))
    : Math.max(64, longestLabel * 7 + 14);
  const leaderPadding = stacked && widget.smallValueMode === "leader" ? 120 : 22;
  const labelTextWidth = longestLabel * 7;
  const labelBottom = axisLabelMode === "wrap"
    ? Math.max(92, Math.ceil(longestLabel / 9) * 13 + 24)
    : Math.max(82, Math.sin((32 * Math.PI) / 180) * labelTextWidth + 24);
  const margin = {
    top: 28,
    right: leaderPadding,
    bottom: Math.min(320, labelBottom),
    left: 62
  };
  const width = Math.max(760, margin.left + margin.right + pivot.labels.length * minSlot);
  const height = Math.max(330, 248 + margin.bottom);
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const svg = createChartSvg(width, height, stacked ? "堆积条形图" : "条形图");
  const totals = stacked
    ? pivot.labels.map((label, index) => (
      pivot.seriesNames.reduce((sum, series, seriesIndex) => sum + pivot.matrix[seriesIndex][index], 0)
    ))
    : pivot.labels.map((label, index) => (
      pivot.seriesNames.reduce((sum, series, seriesIndex) => sum + pivot.matrix[seriesIndex][index], 0)
    ));
  const maxValue = Math.max(1, ...(stacked ? totals : pivot.matrix.flat()));
  const step = plotWidth / Math.max(1, pivot.labels.length);
  const groupWidth = Math.min(64, step * 0.76);
  const seriesCount = Math.max(1, pivot.seriesNames.length);

  drawAxes(svg, margin, plotWidth, plotHeight, maxValue);

  pivot.labels.forEach((label, labelIndex) => {
    const xCenter = margin.left + step * labelIndex + step / 2;
    if (stacked) {
      let cumulative = 0;
      const barWidth = Math.min(48, step * 0.64);
      pivot.seriesNames.forEach((series, seriesIndex) => {
        const value = pivot.matrix[seriesIndex][labelIndex];
        const barHeight = (value / maxValue) * plotHeight;
        const y = margin.top + plotHeight - cumulative - barHeight;
        const segment = appendSvgRect(svg, {
          x: xCenter - barWidth / 2,
          y,
          width: barWidth,
          height: Math.max(0, barHeight),
          fill: getWidgetColor(widget, seriesIndex),
          rx: 2
        });
        segment.append(createTitleNode(`${series}: ${formatMetric(value)}`));
        if (widget.showValues && barHeight >= 14) {
          appendSvgText(svg, formatMetric(value), xCenter, y + barHeight / 2 + 3, {
            anchor: "middle",
            fill: "#ffffff",
            size: 9
          });
        } else if (widget.showValues && widget.smallValueMode === "shrink" && barHeight >= 7) {
          appendSvgText(svg, formatMetric(value), xCenter, y + barHeight / 2 + 2, {
            anchor: "middle",
            fill: "#ffffff",
            size: Math.max(6, Math.min(8, barHeight - 2))
          });
        } else if (widget.showValues && widget.smallValueMode === "leader" && barHeight > 0) {
          const direction = seriesIndex % 2 === 0 ? 1 : -1;
          const endY = Math.max(
            margin.top + 8,
            Math.min(margin.top + plotHeight - 8, y + barHeight / 2 + (seriesIndex % 3 - 1) * 12)
          );
          const endX = xCenter + direction * (barWidth / 2 + 42 + (seriesIndex % 3) * 18);
          appendSvg(svg, "polyline", {
            points: `${xCenter},${y + barHeight / 2} ${xCenter + direction * (barWidth / 2 + 9)},${endY} ${endX},${endY}`,
            fill: "none",
            stroke: "#73827a",
            "stroke-width": 0.8
          });
          appendSvgText(svg, formatMetric(value), endX + direction * 3, endY + 3, {
            anchor: direction > 0 ? "start" : "end",
            fill: "#46544d",
            size: 8
          });
        }
        cumulative += barHeight;
      });
      if (widget.showValues && totals[labelIndex] > 0) {
        appendSvgText(svg, formatMetric(totals[labelIndex]), xCenter, margin.top + plotHeight - cumulative - 6, {
          anchor: "middle",
          fill: "#25332d",
          size: 9
        });
      }
    } else {
      const barWidth = groupWidth / seriesCount;
      pivot.seriesNames.forEach((series, seriesIndex) => {
        const value = pivot.matrix[seriesIndex][labelIndex];
        const barHeight = (value / maxValue) * plotHeight;
        const x = xCenter - groupWidth / 2 + barWidth * seriesIndex;
        const bar = appendSvgRect(svg, {
          x,
          y: margin.top + plotHeight - barHeight,
          width: Math.max(2, barWidth - 2),
          height: Math.max(0, barHeight),
          fill: pivot.seriesNames.length === 1
            ? getWidgetColor(widget, labelIndex)
            : getWidgetColor(widget, seriesIndex),
          rx: 2
        });
        bar.append(createTitleNode(`${label}: ${formatMetric(value)}`));
        if (widget.showValues && barHeight >= 12) {
          appendSvgText(svg, formatMetric(value), x + barWidth / 2, margin.top + plotHeight - barHeight - 5, {
            anchor: "middle",
            fill: "#35443d",
            size: 9
          });
        }
      });
    }
    appendAxisLabel(svg, label, xCenter, height - 18, Math.max(48, step - 8), axisLabelMode);
  });

  const legendLabels = pivot.seriesNames.length > 1 ? pivot.seriesNames : [metricName(widget)];
  const legend = buildLegend(
    legendLabels,
    legendLabels.map((label, index) => getWidgetColor(widget, index))
  );
  const container = document.createElement("div");
  container.className = "chart-scroll";
  container.append(svg);
  return { container, legend };
}

function renderPieChart(pivot) {
  const chartScale = Math.min(3, Math.max(0.5, Number(pivot.widget.scale) || 1));
  const width = Math.round(1000 * chartScale);
  const height = Math.round(520 * chartScale);
  const cx = Math.round(330 * chartScale);
  const cy = Math.round(240 * chartScale);
  const radius = Math.round(170 * chartScale);
  const values = pivot.totals;
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  const svg = createChartSvg(width, height, "饼图");
  let angle = -Math.PI / 2;
  const sideOffsets = { left: 0, right: 0 };

  values.forEach((value, index) => {
    const share = total > 0 ? Math.max(0, value) / total : 0;
    if (share <= 0) {
      return;
    }
    const endAngle = angle + share * Math.PI * 2;
    const path = createSvg("path", {
      d: describeArc(cx, cy, radius, angle, endAngle),
      fill: getWidgetColor(pivot.widget, index),
      stroke: "#ffffff",
      "stroke-width": 2
    });
    path.append(createTitleNode(`${pivot.labels[index]}: ${formatMetric(value)}`));
    svg.append(path);
    if (pivot.widget.showValues) {
      const middleAngle = (angle + endAngle) / 2;
      const labelPrefix = pivot.widget.showLegendText
        ? `${pivot.labels[index]}; `
        : "";
      const labelText = `${labelPrefix}${formatMetric(value)}; ${(share * 100).toFixed(1)}%`;
      if (share >= 0.05) {
        const labelPoint = polarToCartesian(cx, cy, radius * 0.66, middleAngle);
        appendSvgText(svg, labelText, labelPoint.x, labelPoint.y + 3, {
          anchor: "middle",
          fill: "#ffffff",
          size: 10
        });
      } else {
        const side = Math.cos(middleAngle) >= 0 ? "right" : "left";
        const direction = side === "right" ? 1 : -1;
        const rank = sideOffsets[side]++;
        const start = polarToCartesian(cx, cy, radius * 0.94, middleAngle);
        const elbow = polarToCartesian(cx, cy, radius + 20, middleAngle);
        const baseY = cy + Math.sin(middleAngle) * radius;
        const endY = Math.max(
          20,
          Math.min(height - 38, baseY + (rank % 5 - 2) * 15)
        );
        const endX = cx + direction * (radius + 76);
        appendSvg(svg, "polyline", {
          points: `${start.x},${start.y} ${elbow.x},${elbow.y} ${endX},${endY}`,
          fill: "none",
          stroke: "#73827a",
          "stroke-width": 1
        });
        appendSvgText(svg, labelText, endX + direction * 5, endY + 3, {
          anchor: side === "right" ? "start" : "end",
          fill: "#46544d",
          size: 10
        });
      }
    }
    angle = endAngle;
  });

  const legend = document.createElement("div");
  legend.className = `chart-legend${pivot.labels.length > (pivot.widget.pieLegendThreshold || 6) ? " legend-vertical" : ""}`;
  pivot.labels.forEach((label, index) => {
    const percent = total > 0 ? (values[index] / total) * 100 : 0;
    legend.append(createLegendItem(
      pivot.widget.showValues
        ? `${truncateLabel(label, 18)} · ${formatMetric(values[index])}; ${percent.toFixed(1)}%`
        : truncateLabel(label, 18),
      getWidgetColor(pivot.widget, index)
    ));
  });
  const container = document.createElement("div");
  container.className = "chart-scroll";
  container.append(svg);
  return { container, legend };
}

function renderLineChart(pivot) {
  const widget = pivot.widget;
  const axisLabelMode = widget.axisLabelMode || "scroll";
  const longestLabel = Math.max(0, ...pivot.labels.map((label) => String(label).length));
  const minSlot = axisLabelMode === "wrap"
    ? Math.min(220, Math.max(78, longestLabel * 7))
    : Math.max(60, longestLabel * 7 + 14);
  const margin = { top: 24, right: 22, bottom: axisLabelMode === "wrap" ? 92 : 82, left: 62 };
  const width = Math.max(760, margin.left + margin.right + pivot.labels.length * minSlot);
  const height = axisLabelMode === "wrap" ? 360 : 330;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(1, ...pivot.matrix.flat());
  const svg = createChartSvg(width, height, "折线图");
  drawAxes(svg, margin, plotWidth, plotHeight, maxValue);

  const step = plotWidth / Math.max(1, pivot.labels.length - 1);
  pivot.seriesNames.forEach((series, seriesIndex) => {
    const points = pivot.matrix[seriesIndex].map((value, index) => {
      const x = pivot.labels.length === 1
        ? margin.left + plotWidth / 2
        : margin.left + step * index;
      const y = margin.top + plotHeight - (value / maxValue) * plotHeight;
      return { x, y, value };
    });
    appendSvg(svg, "polyline", {
      points: points.map((point) => `${point.x},${point.y}`).join(" "),
      fill: "none",
      stroke: getWidgetColor(widget, seriesIndex),
      "stroke-width": 2.5,
      "stroke-linejoin": "round",
      "stroke-linecap": "round"
    });
    for (const point of points) {
      const circle = createSvg("circle", {
        cx: point.x,
        cy: point.y,
        r: 3.2,
        fill: getWidgetColor(widget, seriesIndex)
      });
      circle.append(createTitleNode(`${series}: ${formatMetric(point.value)}`));
      svg.append(circle);
      if (widget.showValues) {
        appendSvgText(svg, formatMetric(point.value), point.x, point.y - 7, {
          anchor: "middle",
          fill: "#35443d",
          size: 9
        });
      }
    }
  });

  pivot.labels.forEach((label, index) => {
    const x = pivot.labels.length === 1
      ? margin.left + plotWidth / 2
      : margin.left + step * index;
    appendAxisLabel(svg, label, x, height - 18, Math.max(48, plotWidth / Math.max(1, pivot.labels.length) - 8), axisLabelMode);
  });

  const container = document.createElement("div");
  container.className = "chart-scroll";
  container.append(svg);
  return {
    container,
    legend: buildLegend(
      pivot.seriesNames,
      pivot.seriesNames.map((label, index) => getWidgetColor(widget, index))
    )
  };
}

function drawAxes(svg, margin, plotWidth, plotHeight, maxValue) {
  appendSvg(svg, "line", {
    x1: margin.left,
    y1: margin.top + plotHeight,
    x2: margin.left + plotWidth,
    y2: margin.top + plotHeight,
    stroke: "#9aa9a2",
    "stroke-width": 1
  });
  appendSvg(svg, "line", {
    x1: margin.left,
    y1: margin.top,
    x2: margin.left,
    y2: margin.top + plotHeight,
    stroke: "#9aa9a2",
    "stroke-width": 1
  });

  for (let index = 0; index <= 4; index += 1) {
    const ratio = index / 4;
    const y = margin.top + plotHeight - ratio * plotHeight;
    appendSvg(svg, "line", {
      x1: margin.left,
      y1: y,
      x2: margin.left + plotWidth,
      y2: y,
      stroke: "#e2e9e5",
      "stroke-width": 1
    });
    appendSvgText(svg, formatMetric(maxValue * ratio), margin.left - 8, y + 3, {
      anchor: "end",
      fill: "#77837d",
      size: 9
    });
  }
}

function createChartSvg(width, height, label) {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.classList.add("chart-svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  return svg;
}

function appendSvg(parent, name, attributes = {}) {
  const element = createSvg(name, attributes);
  parent.append(element);
  return element;
}

function createSvg(name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function appendSvgRect(svg, attributes) {
  return appendSvg(svg, "rect", attributes);
}

function appendSvgText(svg, text, x, y, options = {}) {
  const element = appendSvg(svg, "text", {
    x,
    y,
    "text-anchor": options.anchor || "start",
    fill: options.fill || "#28352f",
    "font-size": options.size || 11,
    "font-family": "Inter, PingFang SC, Microsoft YaHei, sans-serif"
  });
  element.textContent = text;
  return element;
}

function createTitleNode(text) {
  const title = document.createElementNS(SVG_NAMESPACE, "title");
  title.textContent = text;
  return title;
}

function buildLegend(labels, colors = []) {
  const legend = document.createElement("div");
  legend.className = "chart-legend";
  labels.forEach((label, index) => {
    legend.append(createLegendItem(
      label,
      colors[index] || CHART_COLORS[index % CHART_COLORS.length]
    ));
  });
  return legend;
}

function getWidgetColor(widget, index) {
  return isHexColor(widget.colors?.[index])
    ? widget.colors[index]
    : CHART_COLORS[index % CHART_COLORS.length];
}

function appendAxisLabel(svg, label, x, y, maxWidth, mode) {
  if (mode === "wrap") {
    const maxChars = Math.max(5, Math.floor(maxWidth / 8));
    const lines = splitLabel(label, maxChars);
    const startY = y - Math.max(0, lines.length - 1) * 12;
    lines.forEach((line, index) => {
      appendSvgText(svg, line, x, startY + index * 12, {
        anchor: "middle",
        fill: "#637068",
        size: 10
      });
    });
    return;
  }

  const text = appendSvgText(svg, String(label ?? ""), x, y, {
    anchor: "end",
    fill: "#637068",
    size: 10
  });
  text.setAttribute("transform", `rotate(-32 ${x} ${y})`);
}

function splitLabel(label, maxChars) {
  const text = String(label ?? "");
  if (!text) {
    return ["（空）"];
  }
  const lines = [];
  for (let index = 0; index < text.length; index += maxChars) {
    lines.push(text.slice(index, index + maxChars));
  }
  return lines;
}

function createLegendItem(label, color) {
  const item = document.createElement("span");
  item.className = "legend-item";
  const swatch = document.createElement("span");
  swatch.className = "legend-swatch";
  swatch.style.backgroundColor = color;
  item.append(swatch, document.createTextNode(label));
  return item;
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function polarToCartesian(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

function aggregateRows(rows, field, aggregation) {
  if (!rows.length) {
    return 0;
  }
  if (aggregation === "count") {
    return rows.length;
  }

  const values = rows
    .map((row) => getFlattenedRow(row)[field])
    .filter((value) => value !== undefined && value !== null && value !== "");

  if (aggregation === "distinct") {
    return new Set(values.map(String)).size;
  }

  const numericValues = values.map(Number).filter(Number.isFinite);
  if (!numericValues.length) {
    return 0;
  }
  if (aggregation === "sum") {
    return numericValues.reduce((sum, value) => sum + value, 0);
  }
  if (aggregation === "avg") {
    return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
  }
  if (aggregation === "min") {
    return Math.min(...numericValues);
  }
  if (aggregation === "max") {
    return Math.max(...numericValues);
  }
  return 0;
}

function getSelectedFields() {
  return state.fieldConfigs
    .filter((field) => field.selected)
    .sort((a, b) => a.order - b.order);
}

function getSelectedFieldPaths() {
  return getSelectedFields().map((field) => field.path);
}

function fieldLabel(path) {
  if (!path) {
    return "";
  }
  return state.fieldConfigs.find((field) => field.path === path)?.label || path;
}

function metricName(widget) {
  if (String(widget.metricAlias || "").trim()) {
    return widget.metricAlias.trim();
  }
  if (widget.aggregation === "count") {
    return "计数";
  }
  if (widget.aggregation === "distinct") {
    return `${fieldLabel(widget.metricField)} 去重数`;
  }
  return `${aggregationLabel(widget.aggregation)}(${fieldLabel(widget.metricField)})`;
}

function aggregationLabel(aggregation) {
  const labels = {
    count: "计数",
    sum: "求和",
    avg: "平均",
    min: "最小",
    max: "最大",
    distinct: "去重计数"
  };
  return labels[aggregation] || aggregation;
}

function valueToLabel(value) {
  if (value === undefined || value === null || value === "") {
    return "（空）";
  }
  return truncateLabel(String(value), 32);
}

function displayValue(value) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatMetric(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return String(value ?? "-");
  }
  if (Number.isInteger(number)) {
    return number.toLocaleString("zh-CN");
  }
  return number.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function truncateLabel(value, length) {
  const text = String(value ?? "");
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function openWidgetDialog(widget = null) {
  state.editingWidgetId = widget?.id || null;
  const model = normalizeWidget(widget || {
    title: "新建分析组件",
    type: "bar",
    dimension: getSelectedFieldPaths()[0] || "",
    series: "",
    metricField: "",
    aggregation: "count",
    sort: "desc",
    axisLabelMode: "scroll",
    showValues: true,
    filters: createFilterGroup("all"),
    limit: 0,
    pageSize: 20,
    pieLegendThreshold: 6,
    showLegendText: false,
    smallValueMode: "leader",
    scale: 1,
    size: "half"
  });

  elements.widgetDialogTitle.textContent = widget ? "编辑分析组件" : "添加分析组件";
  elements.widgetTitle.value = model.title;
  elements.widgetType.value = model.type;
  elements.widgetSort.value = model.sort;
  elements.widgetMetricAlias.value = model.metricAlias;
  elements.widgetAxisLabelMode.value = model.axisLabelMode;
  elements.widgetShowValues.checked = model.showValues;
  elements.widgetLimit.value = model.limit;
  elements.widgetPageSize.value = model.pageSize;
  elements.widgetPieLegendThreshold.value = model.pieLegendThreshold;
  elements.widgetPieShowLegendText.checked = model.showLegendText;
  elements.widgetSmallValueMode.value = model.smallValueMode;
  elements.widgetScale.value = model.scale;
  elements.widgetSize.value = model.size;
  elements.widgetAggregation.value = model.aggregation;
  state.dialogColors = [...model.colors];
  state.editingWidgetFilters = normalizeFilters(model.filters, state.fieldConfigs);
  renderWidgetFieldOptions(model.dimension, model.series, model.metricField);
  renderWidgetColorInputs();
  renderWidgetFilterEditor();
  updateWidgetMetricState();
  updateWidgetTypeFields();
  elements.widgetDialog.showModal();
}

function renderWidgetFieldOptions(dimension, series, metricField) {
  const fields = getSelectedFields();
  elements.widgetDimension.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "全部分组";
  elements.widgetDimension.append(allOption);
  for (const field of fields) {
    const option = document.createElement("option");
    option.value = field.path;
    option.textContent = field.label;
    elements.widgetDimension.append(option);
  }
  elements.widgetDimension.value = dimension || "";

  elements.widgetSeries.replaceChildren();
  const noSeries = document.createElement("option");
  noSeries.value = "";
  noSeries.textContent = "不拆分系列";
  elements.widgetSeries.append(noSeries);
  for (const field of fields) {
    const option = document.createElement("option");
    option.value = field.path;
    option.textContent = field.label;
    elements.widgetSeries.append(option);
  }
  elements.widgetSeries.value = series || "";

  elements.widgetMetricField.replaceChildren();
  const countOption = document.createElement("option");
  countOption.value = "";
  countOption.textContent = "记录数";
  elements.widgetMetricField.append(countOption);
  for (const field of fields) {
    const option = document.createElement("option");
    option.value = field.path;
    option.textContent = field.label;
    elements.widgetMetricField.append(option);
  }
  elements.widgetMetricField.value = metricField || "";
}

function updateWidgetMetricState() {
  const aggregation = elements.widgetAggregation.value;
  elements.widgetMetricField.disabled = aggregation === "count";
  if (aggregation === "count") {
    elements.widgetMetricField.value = "";
  }
}

function updateWidgetTypeFields() {
  const isPie = elements.widgetType.value === "pie";
  elements.pieLegendThresholdField.hidden = !isPie;
  elements.pieShowLegendTextField.hidden = !isPie;
}

function getWidgetColorLabels(model = null) {
  const current = model || {
    id: "preview",
    type: elements.widgetType.value,
    dimension: elements.widgetDimension.value,
    series: elements.widgetSeries.value,
    metricField: elements.widgetMetricField.value,
    metricAlias: elements.widgetMetricAlias.value,
    aggregation: elements.widgetAggregation.value,
    sort: elements.widgetSort.value,
    limit: Math.max(0, Number(elements.widgetLimit.value) || 0),
    pageSize: Math.max(1, Number(elements.widgetPageSize.value) || 20),
    pieLegendThreshold: Math.max(1, Number(elements.widgetPieLegendThreshold.value) || 6),
    showLegendText: elements.widgetPieShowLegendText.checked,
    smallValueMode: elements.widgetSmallValueMode.value,
    axisLabelMode: elements.widgetAxisLabelMode.value,
    showValues: elements.widgetShowValues.checked,
    colors: [],
    size: elements.widgetSize.value
  };

  try {
    const pivot = buildPivotData(current);
    if (current.type === "pie") {
      return pivot.labels.slice(0, 40);
    }
    if (["stackedBar", "line"].includes(current.type) || current.series) {
      return pivot.seriesNames.slice(0, 40);
    }
    if (current.type === "bar" && pivot.labels.length) {
      return pivot.labels.slice(0, 40);
    }
    return ["主色"];
  } catch {
    return ["主色"];
  }
}

function renderWidgetColorInputs() {
  const labels = getWidgetColorLabels();
  elements.widgetColorList.replaceChildren();
  labels.forEach((label, index) => {
    const row = document.createElement("label");
    row.className = "color-row";
    const input = document.createElement("input");
    input.type = "color";
    input.value = state.dialogColors[index] || CHART_COLORS[index % CHART_COLORS.length];
    input.dataset.index = index;
    linkColorInput(input, index);
    const text = document.createElement("span");
    text.textContent = label;
    row.append(input, text);
    elements.widgetColorList.append(row);
  });
}

function linkColorInput(input, index) {
  input.addEventListener("input", () => {
    state.dialogColors[index] = input.value;
  });
}

function closeWidgetDialog() {
  state.editingWidgetId = null;
  elements.widgetDialog.close();
}

function saveWidgetFromDialog(event) {
  event.preventDefault();
  const model = {
    id: state.editingWidgetId || createId("widget"),
    title: elements.widgetTitle.value.trim() || "分析组件",
    type: elements.widgetType.value,
    dimension: elements.widgetDimension.value,
    series: elements.widgetSeries.value,
    metricField: elements.widgetMetricField.value,
    metricAlias: elements.widgetMetricAlias.value.trim(),
    aggregation: elements.widgetAggregation.value,
    sort: elements.widgetSort.value,
    axisLabelMode: elements.widgetAxisLabelMode.value,
    showValues: elements.widgetShowValues.checked,
    colors: state.dialogColors.slice(0, 40),
    filters: cloneJson(state.editingWidgetFilters),
    limit: Math.max(0, Number(elements.widgetLimit.value) || 0),
    pageSize: Math.max(1, Number(elements.widgetPageSize.value) || 20),
    pieLegendThreshold: Math.max(1, Number(elements.widgetPieLegendThreshold.value) || 6),
    showLegendText: elements.widgetPieShowLegendText.checked,
    smallValueMode: elements.widgetSmallValueMode.value,
    scale: Math.min(3, Math.max(0.5, Number(elements.widgetScale.value) || 1)),
    size: elements.widgetSize.value
  };
  const normalized = normalizeWidget(model);

  if (state.editingWidgetId) {
    const index = state.widgets.findIndex((widget) => widget.id === state.editingWidgetId);
    if (index >= 0) {
      state.widgets[index] = normalized;
    }
  } else {
    state.widgets.push(normalized);
  }
  closeWidgetDialog();
  renderDashboard();
}

function ensureWidgetsUseValidFields() {
  const valid = new Set(getSelectedFieldPaths());
  for (const widget of state.widgets) {
    widget.filters = normalizeFilters(widget.filters || createFilterGroup("all"), state.fieldConfigs);
    if (widget.dimension && !valid.has(widget.dimension)) {
      widget.dimension = getSelectedFieldPaths()[0] || "";
    }
    if (widget.series && !valid.has(widget.series)) {
      widget.series = "";
    }
    if (widget.metricField && !valid.has(widget.metricField)) {
      widget.metricField = "";
      widget.aggregation = "count";
    }
  }
}

function createDefaultTemplateState() {
  state.currentTemplateId = null;
  state.arrayPath = chooseDefaultArrayPath(state.dataset);
  state.fieldConfigs = [];
  state.valueMappings = {};
  state.fieldMappings = [];
  state.mappingField = "";
  state.filters = createFilterGroup("all");
  state.widgets = [];
}

async function applyTemplate(template) {
  invalidateDerivedCaches();
  state.currentTemplateId = template.id || null;
  state.arrayPath = state.arrayPaths.some((item) => item.path === template.arrayPath)
    ? template.arrayPath
    : chooseDefaultArrayPath(state.dataset);
  state.sourceRows = getRowsForArrayPath(state.arrayPath);
  state.valueMappings = normalizeValueMappings(template.valueMappings);
  state.fieldMappings = normalizeFieldMappings(template.fieldMappings);
  state.commonFilters = mergeCommonFilters(
    state.commonFilters,
    template.commonFilters
  );
  state.allColumns = buildColumnUnion(state.sourceRows);

  if (Array.isArray(template.fields) && template.fields.length) {
    state.fieldConfigs = mergeFieldConfigs(template.fields, state.allColumns);
  } else {
    state.fieldConfigs = state.allColumns.map((column, index) => ({
      path: column.path,
      label: column.path,
      selected: true,
      order: index
    }));
  }

  state.mappingField = template.mappingField || state.fieldConfigs[0]?.path || "";
  state.filters = normalizeFilters(template.filters, state.fieldConfigs);
  state.widgets = Array.isArray(template.widgets) && template.widgets.length
    ? cloneJson(template.widgets).map(normalizeWidget)
    : createDefaultWidgets();
  ensureWidgetsUseValidFields();
  recomputeFilteredRows();
  await chrome.storage.local.set({
    [STORAGE_KEYS.commonFilters]: state.commonFilters
  });
}

function normalizeFilters(filters, fields) {
  const validPaths = new Set(fields.map((field) => field.path));
  if (filters?.children && Array.isArray(filters.children)) {
    return normalizeFilterNode(filters, validPaths, true);
  }

  const group = createFilterGroup(filters?.logic === "any" ? "any" : "all");
  group.children = Array.isArray(filters?.conditions)
    ? filters.conditions.map((condition) => normalizeFilterCondition(condition, validPaths)).filter(Boolean)
    : [];
  return group;
}

function normalizeFilterNode(node, validPaths, forceGroup = false) {
  if (node?.type === "reference" && node.name) {
    return {
      id: node.id || createId("filter-reference"),
      type: "reference",
      name: String(node.name)
    };
  }
  if (node?.type === "group" || forceGroup || Array.isArray(node?.children)) {
    const group = createFilterGroup(node?.logic === "any" ? "any" : "all");
    group.id = node?.id || group.id;
    group.children = Array.isArray(node?.children)
      ? node.children
        .map((child) => normalizeFilterNode(child, validPaths, false))
        .filter(Boolean)
      : [];
    return group;
  }
  return normalizeFilterCondition(node, validPaths);
}

function normalizeFilterCondition(condition, validPaths) {
  if (!condition || !validPaths.has(condition.field)) {
    return null;
  }
  return {
    id: condition.id || createId("filter"),
    type: "condition",
    field: condition.field,
    operator: FILTER_OPERATORS[condition.operator] ? condition.operator : "contains",
    value: String(condition.value ?? ""),
    enabled: condition.enabled !== false
  };
}

function normalizeValueMappings(valueMappings) {
  if (!valueMappings || typeof valueMappings !== "object") {
    return {};
  }
  const normalized = {};
  for (const [field, mappings] of Object.entries(valueMappings)) {
    if (!Array.isArray(mappings)) {
      continue;
    }
    const items = mappings
      .filter((mapping) => mapping && typeof mapping === "object")
      .map((mapping) => ({
        id: mapping.id || createId("mapping"),
        sourceValue: String(mapping.sourceValue ?? ""),
        mappedValue: String(mapping.mappedValue ?? "")
      }))
      .filter((mapping) => mapping.sourceValue !== "" || mapping.mappedValue !== "");
    if (items.length) {
      normalized[field] = items;
    }
  }
  return normalized;
}

function normalizeFieldMappings(fieldMappings) {
  if (!Array.isArray(fieldMappings)) {
    return [];
  }
  return fieldMappings
    .filter((mapping) => mapping && typeof mapping === "object")
    .map((mapping) => ({
      id: mapping.id || createId("field-mapping"),
      sourceField: String(mapping.sourceField || ""),
      operator: mapping.operator || (
        mapping.conditionValue !== undefined || mapping.targetValue !== undefined
          ? "equals"
          : "copy"
      ),
      conditionValue: String(mapping.conditionValue ?? mapping.sourceValue ?? ""),
      targetField: String(mapping.targetField || ""),
      targetValue: String(mapping.targetValue ?? mapping.derivedValue ?? ""),
      overwrite: mapping.overwrite !== false
    }))
    .filter((mapping) => mapping.sourceField && mapping.targetField);
}

function normalizeCommonFilters(commonFilters, fields = state.fieldConfigs) {
  if (!Array.isArray(commonFilters)) {
    return [];
  }
  const unique = new Map();
  for (const item of commonFilters) {
    const name = String(item?.name || "").trim();
    if (!name) {
      continue;
    }
    unique.set(name, {
      id: item.id || createId("common-filter"),
      name,
      group: normalizeFilters(item.group || item.filters || item, fields)
    });
  }
  return [...unique.values()];
}

function describeFilterGroup(group, depth = 0) {
  if (!group || !Array.isArray(group.children) || !group.children.length) {
    return "空条件";
  }
  const joiner = group.logic === "any" ? " OR " : " AND ";
  const parts = group.children.map((child) => {
    if (child.type === "group") {
      return `(${describeFilterGroup(child, depth + 1)})`;
    }
    if (child.type === "reference") {
      return `[${child.name || "未选择常用条件"}]`;
    }
    const label = fieldLabel(child.field);
    const operator = FILTER_OPERATORS[child.operator] || child.operator;
    return ["empty", "notEmpty"].includes(child.operator)
      ? `${label} ${operator}`
      : `${label} ${operator} ${child.conditionValue ?? child.value ?? ""}`;
  });
  return depth > 0 ? parts.join(joiner) : parts.join(joiner);
}

function mergeCommonFilters(current, incoming) {
  const merged = new Map((current || []).map((item) => [item.name, item]));
  for (const item of normalizeCommonFilters(incoming)) {
    merged.set(item.name, item);
  }
  return [...merged.values()];
}

function createNewTemplate() {
  createDefaultTemplateState();
  state.allColumns = buildColumnUnion(getRowsForArrayPath(state.arrayPath));
  state.fieldConfigs = state.allColumns.map((column, index) => ({
    path: column.path,
    label: column.path,
    selected: true,
    order: index
  }));
  state.widgets = createDefaultWidgets();
  recomputeFilteredRows();
  elements.templateName.value = `${state.dataset.name || "数据集"} 新报表`;
  renderAll();
}

async function saveTemplate(asNew) {
  const name = elements.templateName.value.trim() || `${state.dataset.name || "数据集"} 报表`;
  const id = asNew || !state.currentTemplateId
    ? createId("report")
    : state.currentTemplateId;
  const template = buildCurrentTemplateModel({ id, name });

  state.reportTemplates = state.reportTemplates.filter((item) => item.id !== id);
  state.reportTemplates.push(template);
  state.currentTemplateId = id;
  await chrome.storage.local.set({
    [STORAGE_KEYS.reportTemplates]: state.reportTemplates
  });
  broadcast({ type: "REPORT_TEMPLATES_UPDATED", templateId: id });
  renderTemplateSelect();
  syncTemplateControls();
  showToast(`报表模板“${name}”已保存。`);
}

function buildCurrentTemplateModel({ id, name, createdAt } = {}) {
  const now = Date.now();
  const existing = id
    ? state.reportTemplates.find((template) => template.id === id)
    : null;
  return {
    id: id || createId("report"),
    name: name || elements.templateName.value.trim() || `${state.dataset.name || "数据集"} 报表`,
    datasetId: state.datasetId,
    sourceProfileId: state.dataset.sourceProfileId || state.dataset.requestConfig?.id || "",
    requestConfig: cloneJson(state.dataset.requestConfig || null),
    arrayPath: state.arrayPath,
    fields: cloneJson(state.fieldConfigs),
    valueMappings: cloneJson(state.valueMappings),
    fieldMappings: cloneJson(state.fieldMappings),
    commonFilters: cloneJson(normalizeCommonFilters(state.commonFilters, state.fieldConfigs)),
    mappingField: state.mappingField,
    filters: cloneJson(state.filters),
    widgets: cloneJson(state.widgets),
    createdAt: createdAt || existing?.createdAt || now,
    updatedAt: now
  };
}

async function deleteTemplate() {
  if (!state.currentTemplateId) {
    return;
  }
  const current = state.reportTemplates.find((template) => template.id === state.currentTemplateId);
  if (!confirm(`确定删除报表模板“${current?.name || "未命名"}”吗？`)) {
    return;
  }

  state.reportTemplates = state.reportTemplates.filter(
    (template) => template.id !== state.currentTemplateId
  );
  state.currentTemplateId = null;
  await chrome.storage.local.set({
    [STORAGE_KEYS.reportTemplates]: state.reportTemplates
  });
  broadcast({ type: "REPORT_TEMPLATES_UPDATED" });
  renderTemplateSelect();
  syncTemplateControls();
  showToast("报表模板已删除。");
}

async function exportDashboardPng(immersive = false) {
  const button = immersive ? elements.exportImmersivePngButton : elements.exportPngButton;
  button.disabled = true;
  try {
    const canvas = await renderDashboardCanvas(immersive);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    downloadBlob(
      blob,
      `${safeFileName(state.dataset.name)}-${immersive ? "immersive" : "full"}-dashboard.png`
    );
    showToast(immersive ? "沉浸态看板 PNG 已导出。" : "完整页看板 PNG 已导出。");
  } catch (error) {
    showToast(`PNG 导出失败：${error.message}`);
  } finally {
    button.disabled = false;
  }
}

async function exportWidgetPng(card, widget) {
  try {
    const canvas = await renderElementCanvas(card, {
      allowScroll: true,
      background: "#ffffff"
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    downloadBlob(blob, `${safeFileName(widget.title)}.png`);
    showToast("单图 PNG 已导出。");
  } catch (error) {
    showToast(`单图导出失败：${error.message}`);
  }
}

async function renderDashboardCanvas(immersive) {
  if (immersive) {
    const clone = prepareExportClone(elements.dashboardGrid);
    const fullWidth = getFullElementWidth(elements.dashboardGrid) + 44;
    const width = Math.max(1240, fullWidth);
    const height = Math.max(420, elements.dashboardGrid.scrollHeight + 80);
    const title = `${state.dataset.name || "数据分析"} · Dashboard`;
    const html = `
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width - 44}px;padding:22px;background:#f3f6f4;box-sizing:border-box">
        <div class="export-heading">${escapeHtml(title)}</div>
        ${clone.outerHTML}
      </div>
    `;
    return renderHtmlToCanvas(html, width, height, "#f3f6f4");
  }

  const clone = prepareExportClone(elements.dashboardGrid);
  const width = Math.max(1240, getFullElementWidth(elements.dashboardGrid) + 48);
  const height = Math.max(520, elements.dashboardGrid.scrollHeight + 130);
  const title = `${state.dataset.name || "数据分析"} · Dashboard`;
  const summary = [
    `数据行数：${state.filteredRows.length}`,
    `字段数：${getSelectedFieldPaths().length}`,
    `组件数：${state.widgets.length}`
  ].join("　");
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width - 48}px;padding:24px;background:#f3f6f4;box-sizing:border-box">
      <div class="export-heading">${escapeHtml(title)}</div>
      <div style="margin:-5px 0 16px;color:#637068;font:12px Inter,PingFang SC,sans-serif">${escapeHtml(summary)}</div>
      ${clone.outerHTML}
    </div>
  `;
  return renderHtmlToCanvas(html, width, height, "#f3f6f4");
}

async function renderElementCanvas(element, options = {}) {
  const clone = prepareExportClone(element);
  clone.querySelectorAll(".widget-actions, .table-pagination").forEach((item) => item.remove());
  const width = options.allowScroll
    ? Math.max(720, getFullElementWidth(element) + 28)
    : Math.max(720, element.clientWidth + 28);
  const height = Math.max(260, element.scrollHeight + 28);
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width - 28}px;padding:14px;background:${options.background || "#ffffff"};box-sizing:border-box">
      ${clone.outerHTML}
    </div>
  `;
  return renderHtmlToCanvas(html, width, height, options.background || "#ffffff");
}

async function renderHtmlToCanvas(html, width, height, background) {
  const css = await fetch(chrome.runtime.getURL("report.css")).then((response) => response.text());
  const documentHtml = `
    <style>
      ${css}
      html, body { min-width: 0; width: ${width}px; background: #f3f6f4; }
      body { padding: 18px; }
      .export-heading { margin: 0 0 14px; font: 700 22px Inter, PingFang SC, sans-serif; color: #17211d; }
      .widget-card { break-inside: avoid; }
      .chart-scroll { overflow: visible !important; }
      .data-table-wrap { overflow: visible !important; max-height: none !important; }
    </style>
    ${html}
  `;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">${documentHtml}</foreignObject>
    </svg>
  `;
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = background || "#f3f6f4";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function prepareExportClone(element) {
  const clone = element.cloneNode(true);
  sanitizeExportClone(clone);
  return clone;
}

function sanitizeExportClone(root) {
  root.querySelectorAll(
    ".widget-actions, .export-controls, .template-controls .button-row, .section-controls, .dashboard-toolbar .button-row, .immersive-exit, dialog, script, input[type='file']"
  ).forEach((element) => element.remove());
}

function getFullElementWidth(element) {
  let width = Math.max(element.clientWidth, element.scrollWidth);
  for (const item of element.querySelectorAll(".chart-scroll, .data-table-wrap")) {
    width = Math.max(width, item.scrollWidth + 28);
  }
  return width;
}

async function exportDashboardHtml() {
  try {
    const clone = elements.dashboardGrid.cloneNode(true);
    clone.querySelectorAll(".widget-actions").forEach((element) => element.remove());
    const css = await fetch(chrome.runtime.getURL("report.css")).then((response) => response.text());
    const title = `${state.dataset.name || "数据分析"} · Dashboard`;
    const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body class="export-page">
  <main class="report-main">
    <div class="dashboard-toolbar">
      <div class="dashboard-title">
        <div><p class="section-kicker">Exported Dashboard</p><h1>${escapeHtml(title)}</h1></div>
      </div>
    </div>
    ${clone.outerHTML}
  </main>
</body>
</html>`;
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${safeFileName(state.dataset.name)}-dashboard.html`);
    showToast("本地 HTML 看板已导出。");
  } catch (error) {
    showToast(`HTML 导出失败：${error.message}`);
  }
}

async function exportDashboardRules() {
  const templates = templatesForCurrentDataset();
  const currentId = state.currentTemplateId || createId("report");
  const current = buildCurrentTemplateModel({
    id: currentId,
    name: elements.templateName.value.trim()
      || state.reportTemplates.find((template) => template.id === state.currentTemplateId)?.name
      || `${state.dataset.name || "数据集"} 报表`
  });
  const exportList = [
    current,
    ...templates.filter((template) => template.id !== current.id)
  ];
  const packageData = {
    type: "sso-data-bridge-dashboard-package",
    version: 1,
    exportedAt: Date.now(),
    requestConfig: cloneJson(state.dataset.requestConfig || null),
    requestName: state.dataset.name || state.dataset.requestConfig?.name || "导入的请求",
    commonFilters: cloneJson(normalizeCommonFiltersForStorage(
      normalizeCommonFilters(state.commonFilters, state.fieldConfigs),
      exportList
    )),
    fieldMappings: cloneJson(current.fieldMappings),
    templates: cloneJson(exportList)
  };
  downloadBlob(
    new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json" }),
    `${safeFileName(state.dataset.name)}-dashboard-rules.json`
  );
  showToast("看板规则已导出。");
}

async function importDashboardRules() {
  const [file] = elements.reportRulesInput.files || [];
  elements.reportRulesInput.value = "";
  if (!file) {
    return;
  }

  try {
    const packageData = JSON.parse(await file.text());
    const importedTemplates = packageData?.type === "sso-data-bridge-dashboard-package"
      ? Array.isArray(packageData.templates)
        ? packageData.templates
        : packageData.template
          ? [packageData.template]
          : []
      : Array.isArray(packageData)
        ? packageData
        : [packageData];

    if (!importedTemplates.length) {
      throw new Error("规则文件中没有报表模板。");
    }

    const sameRequest = theSameRequest(packageData?.requestConfig, state.dataset?.requestConfig);
    const imported = importedTemplates
      .filter((template) => template && typeof template === "object")
      .map((template) => ({
        ...cloneJson(template),
        id: state.reportTemplates.some((item) => item.id === template.id)
          ? createId("report")
          : template.id || createId("report"),
        datasetId: sameRequest ? state.datasetId : "",
        sourceProfileId: sameRequest
          ? state.dataset.sourceProfileId || state.dataset.requestConfig?.id || ""
          : template.sourceProfileId || packageData?.requestConfig?.id || "",
        requestConfig: cloneJson(packageData?.requestConfig || state.dataset.requestConfig || null),
        updatedAt: Date.now()
      }));

    state.reportTemplates = [
      ...state.reportTemplates.filter((item) => !imported.some((template) => template.id === item.id)),
      ...imported
    ];
    state.commonFilters = mergeCommonFilters(
      state.commonFilters,
      normalizeCommonFiltersForStorage(packageData?.commonFilters, imported)
    );
    await chrome.storage.local.set({
      [STORAGE_KEYS.reportTemplates]: state.reportTemplates,
      [STORAGE_KEYS.commonFilters]: state.commonFilters
    });
    broadcast({ type: "REPORT_TEMPLATES_UPDATED", templateId: imported[0].id });
    await applyTemplate(imported[0]);
    renderAll();
    showToast(`已导入并持久化 ${imported.length} 个报表模板。`);
  } catch (error) {
    showToast(`规则导入失败：${error.message}`);
  }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法渲染看板图片。"));
    image.src = source;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getByPath(source, path) {
  if (!path) {
    return source;
  }
  let current = source;
  for (const part of parsePath(path)) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function joinPath(base, key) {
  if (!base) {
    return key;
  }
  if (/^\d+$/.test(key)) {
    return `${base}[${key}]`;
  }
  return `${base}.${key}`;
}

function parsePath(path) {
  return String(path)
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function theSameRequest(left, right) {
  return Boolean(left && right && left.method === right.method && left.url === right.url);
}

function statusLabel(status) {
  const labels = {
    running: "抓取中",
    complete: "已完成",
    stopped: "已停止",
    error: "失败",
    interrupted: "已中断"
  };
  return labels[status] || "已读取";
}

function safeFileName(value) {
  return String(value || "report")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}
