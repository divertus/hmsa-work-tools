import { createId, STORAGE_KEYS } from "./lib/config.js";
import {
  DEFAULT_CHART_THEME_ID,
  getChartTheme,
  listChartThemes,
  normalizeChartTheme,
  saveCustomChartThemes,
  validateChartTheme
} from "./lib/chart-themes.js";
import { buildEChartsOption } from "./lib/echarts-adapter.js";
import { normalizeCommonFiltersForStorage } from "./lib/report-rules.js";
import { getRawDatasetBundle, listDatasets } from "./lib/storage.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

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
  exportDashboardRulesButton: document.querySelector("#export-dashboard-rules-button"),
  importRulesButton: document.querySelector("#import-rules-button"),
  exportImmersivePngButton: document.querySelector("#export-immersive-png-button"),
  reportRulesInput: document.querySelector("#report-rules-input"),
  reportSidebar: document.querySelector(".report-sidebar"),
  arrayPathSelect: document.querySelector("#array-path-select"),
  datasetSummary: document.querySelector("#dataset-summary"),
  fieldSearch: document.querySelector("#field-search"),
  fieldCount: document.querySelector("#field-count"),
  selectAllFieldsButton: document.querySelector("#select-all-fields-button"),
  invertFieldsButton: document.querySelector("#invert-fields-button"),
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
  cancelCommonFilterEditButton: document.querySelector("#cancel-common-filter-edit-button"),
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
  chartThemeSelect: document.querySelector("#chart-theme-select"),
  chartThemePreview: document.querySelector("#chart-theme-preview"),
  createChartThemeButton: document.querySelector("#create-chart-theme-button"),
  deleteChartThemeButton: document.querySelector("#delete-chart-theme-button"),
  chartThemeDialog: document.querySelector("#chart-theme-dialog"),
  chartThemeForm: document.querySelector("#chart-theme-form"),
  chartThemeDialogClose: document.querySelector("#chart-theme-dialog-close"),
  chartThemeCancelButton: document.querySelector("#chart-theme-cancel-button"),
  chartThemeName: document.querySelector("#chart-theme-name"),
  themeColorList: document.querySelector("#theme-color-list"),
  themeTextColor: document.querySelector("#theme-text-color"),
  themeBackgroundColor: document.querySelector("#theme-background-color"),
  themeAxisColor: document.querySelector("#theme-axis-color"),
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
  smallValueModeField: document.querySelector("#small-value-mode-field"),
  widgetScale: document.querySelector("#widget-scale"),
  widgetSize: document.querySelector("#widget-size"),
  chartColorEditor: document.querySelector("#chart-color-editor"),
  kpiColorFields: document.querySelector("#kpi-color-fields"),
  widgetKpiFontColor: document.querySelector("#widget-kpi-font-color"),
  widgetKpiBackgroundColor: document.querySelector("#widget-kpi-background-color"),
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
  editingCommonFilterId: null,
  editingCommonFilterName: "",
  flattenedRowCache: new WeakMap(),
  widgetRowsCache: new Map(),
  widgets: [],
  reportTemplates: [],
  currentTemplateId: null,
  editingWidgetId: null,
  dialogColors: [],
  editingWidgetFilters: createFilterGroup("all"),
  draggingWidgetId: null,
  dropWidgetIndex: null,
  dragOriginCard: null,
  dragPreview: null,
  dragPlaceholder: null,
  dragStartPoint: null,
  dragPointerOffset: null,
  dragMoved: false,
  hiddenSections: {},
  sidebarHidden: false,
  hideUnselectedFields: false,
  tablePages: {},
  chartThemeId: DEFAULT_CHART_THEME_ID,
  customChartThemes: [],
  dialogThemeColors: [],
  chartInstances: new Map(),
  chartOptions: new Map(),
  chartResizeObservers: new Map(),
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
    STORAGE_KEYS.commonFilters,
    STORAGE_KEYS.chartThemes
  ]);
  state.reportTemplates = Array.isArray(stored[STORAGE_KEYS.reportTemplates])
    ? stored[STORAGE_KEYS.reportTemplates]
    : [];
  state.hiddenSections = stored[STORAGE_KEYS.reportUiState]?.hiddenSections || {};
  state.sidebarHidden = Boolean(stored[STORAGE_KEYS.reportUiState]?.sidebarHidden);
  state.hideUnselectedFields = Boolean(stored[STORAGE_KEYS.reportUiState]?.hideUnselectedFields);
  state.chartThemeId = stored[STORAGE_KEYS.reportUiState]?.chartThemeId
    || DEFAULT_CHART_THEME_ID;
  state.customChartThemes = saveCustomChartThemes(
    [],
    Array.isArray(stored[STORAGE_KEYS.chartThemes])
      ? stored[STORAGE_KEYS.chartThemes]
      : []
  );
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
  elements.arrayPathSelect.addEventListener("change", async () => {
    state.arrayPath = elements.arrayPathSelect.value;
    rebuildFieldConfigsForSource();
    await rebuildSourceData(false);
    ensureWidgetsUseValidFields();
    renderAll();
  });

  elements.fieldSearch.addEventListener("input", renderFieldList);
  elements.selectAllFieldsButton.addEventListener("click", selectAllFields);
  elements.invertFieldsButton.addEventListener("click", invertFieldSelection);
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
  elements.cancelCommonFilterEditButton.addEventListener("click", cancelCommonFilterEdit);
  elements.commonFilterList.addEventListener("click", handleCommonFilterClick);

  elements.addWidgetButton.addEventListener("click", () => openWidgetDialog());
  elements.chartThemeSelect.addEventListener("change", applySelectedChartTheme);
  elements.createChartThemeButton.addEventListener("click", openChartThemeDialog);
  elements.deleteChartThemeButton.addEventListener("click", deleteSelectedChartTheme);
  elements.chartThemeDialogClose.addEventListener("click", closeChartThemeDialog);
  elements.chartThemeCancelButton.addEventListener("click", closeChartThemeDialog);
  elements.chartThemeForm.addEventListener("submit", saveChartThemeFromDialog);
  elements.themeColorList.addEventListener("input", handleThemeColorInput);
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
  elements.dashboardGrid.addEventListener("pointerdown", handleWidgetPointerDown);

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
  elements.exportRulesButton.addEventListener("click", () => exportDashboardRules(false));
  elements.exportDashboardRulesButton.addEventListener("click", () => exportDashboardRules(true));

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
    elements.widgetKpiFontColor.value = "#173d35";
    elements.widgetKpiBackgroundColor.value = "#f3f6f4";
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
        renderChartThemeControls();
        const incoming = state.reportTemplates.find((item) => item.id === message.templateId);
        if (incoming) {
          await applyTemplate(incoming);
          renderAll();
        } else {
          renderDashboard();
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
      hideUnselectedFields: state.hideUnselectedFields,
      chartThemeId: state.chartThemeId
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
    const fieldPath = resolveFieldReference(field);
    if (!(fieldPath in flattened) || !Array.isArray(mappings)) {
      continue;
    }
    const sourceValue = String(flattened[fieldPath] ?? "");
    const match = mappings.find((mapping) => String(mapping.sourceValue ?? "") === sourceValue);
    if (match && String(match.mappedValue ?? "") !== "") {
      flattened[fieldPath] = match.mappedValue;
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
  return resolveFieldPath(reference, state.fieldConfigs);
}

function resolveFieldPath(reference, fields = state.fieldConfigs) {
  const value = String(reference || "").trim();
  if (!value) {
    return "";
  }
  const normalized = value.toLowerCase();
  const matched = (fields || []).find((field) => (
    String(field.path || "").toLowerCase() === normalized
    || String(field.label || "").toLowerCase() === normalized
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
    enabled: true,
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

function evaluateFilterGroup(group, row, referenceStack = []) {
  if (
    !group
    || group.enabled === false
    || !Array.isArray(group.children)
    || !group.children.length
  ) {
    return true;
  }

  const activeChildren = group.children.filter(
    (child) => isFilterNodeActive(child, referenceStack)
  );
  if (!activeChildren.length) {
    return true;
  }

  const results = activeChildren
    .map((child) => (
      child.type === "group"
        ? evaluateFilterGroup(child, row, referenceStack)
        : child.type === "reference"
          ? evaluateCommonFilterReference(child, row, referenceStack)
          : child.field
            ? matchesFilter(row, child)
            : true
    ));

  return group.logic === "any" ? results.some(Boolean) : results.every(Boolean);
}

function isFilterNodeActive(node, referenceStack = []) {
  if (!node || node.enabled === false) {
    return false;
  }
  if (node.type === "group") {
    return Array.isArray(node.children)
      && node.children.some((child) => isFilterNodeActive(child, referenceStack));
  }
  if (node.type === "reference") {
    return Boolean(node.name) && isCommonFilterActive(node.name, referenceStack);
  }
  return isFilterConditionReady(node);
}

function isCommonFilterActive(name, referenceStack = []) {
  if (referenceStack.includes(name)) {
    return true;
  }
  const common = state.commonFilters.find((item) => item.name === name);
  return Boolean(
    common
    && common.group?.enabled !== false
    && Array.isArray(common.group?.children)
    && common.group.children.some(
      (child) => isFilterNodeActive(child, [...referenceStack, name])
    )
  );
}

function evaluateCommonFilterReference(reference, row, referenceStack = []) {
  if (!reference.name || referenceStack.includes(reference.name)) {
    return false;
  }
  const common = state.commonFilters.find((item) => item.name === reference.name);
  return common
    ? evaluateFilterGroup(common.group, row, [...referenceStack, reference.name])
    : false;
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
  const rawValue = row[resolveFieldReference(condition.field)];
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
    kpiFontColor: isHexColor(widget?.kpiFontColor) ? widget.kpiFontColor : "",
    kpiBackgroundColor: isHexColor(widget?.kpiBackgroundColor) ? widget.kpiBackgroundColor : "",
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
  renderChartThemeControls();
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
    STORAGE_KEYS.commonFilters,
    STORAGE_KEYS.chartThemes,
    STORAGE_KEYS.reportUiState
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
  state.customChartThemes = saveCustomChartThemes(
    [],
    Array.isArray(stored[STORAGE_KEYS.chartThemes])
      ? stored[STORAGE_KEYS.chartThemes]
      : state.customChartThemes
  );
  state.chartThemeId = stored[STORAGE_KEYS.reportUiState]?.chartThemeId
    || state.chartThemeId
    || DEFAULT_CHART_THEME_ID;
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

function selectAllFields() {
  state.fieldConfigs.forEach((field) => {
    field.selected = true;
  });
  applyFieldSelectionChange();
}

function invertFieldSelection() {
  state.fieldConfigs.forEach((field) => {
    field.selected = !field.selected;
  });
  applyFieldSelectionChange();
}

function applyFieldSelectionChange() {
  ensureWidgetsUseValidFields();
  renderFieldList();
  renderMappingEditor();
  renderFilterList();
  renderDashboard();
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
    applyFieldSelectionChange();
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
  const fieldPath = resolveFieldReference(field);
  const counts = new Map();
  for (const row of state.sourceRows) {
    const value = getFlattenedRow(row)[fieldPath];
    const key = String(value ?? "");
    const current = counts.get(key) || { value, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

function renderCommonFilterList() {
  if (
    state.editingCommonFilterId
    && !state.commonFilters.some((item) => item.id === state.editingCommonFilterId)
  ) {
    clearCommonFilterEditState();
  }
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
    item.className = `common-filter-item${common.id === state.editingCommonFilterId ? " is-editing" : ""}`;
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
    load.textContent = common.id === state.editingCommonFilterId ? "重新载入" : "编辑并载入";
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
  const editing = state.commonFilters.find((item) => item.id === state.editingCommonFilterId) || null;
  const previousName = editing?.name || "";
  const name = elements.commonFilterName.value.trim() || editing?.name || "";
  const group = captureCommonFilterGroup();
  if (!name) {
    showToast("请输入常用条件名称。");
    return;
  }
  if (state.commonFilters.some((item) => item.name === name && item.id !== editing?.id)) {
    showToast("常用条件名称必须唯一，请更换名称。");
    return;
  }
  if (editing) {
    editing.group = cloneJson(group);
    editing.filters = cloneJson(group);
    if (name !== previousName) {
      renameCommonFilterReferencesInState(previousName, name);
    }
    editing.name = name;
    syncCommonFilterToTemplates(editing, previousName);
    state.editingCommonFilterName = name;
  } else {
    state.commonFilters.push({
      id: createId("common-filter"),
      name,
      group: cloneJson(group),
      filters: cloneJson(group)
    });
  }
  await chrome.storage.local.set(editing
    ? {
      [STORAGE_KEYS.commonFilters]: state.commonFilters,
      [STORAGE_KEYS.reportTemplates]: state.reportTemplates
    }
    : {
      [STORAGE_KEYS.commonFilters]: state.commonFilters
    });
  cancelCommonFilterEdit();
  renderCommonFilterList();
  renderFilterList();
  renderWidgetFilterEditor();
  renderDashboard();
  showToast(editing ? `常用条件“${name}”已更新。` : `常用条件“${name}”已保存。`);
}

function captureCommonFilterGroup() {
  const group = normalizeFilters(state.filters, state.fieldConfigs);
  const [stored] = normalizeCommonFiltersForStorage([{
    id: state.editingCommonFilterId || createId("common-filter"),
    name: state.editingCommonFilterName || elements.commonFilterName.value.trim() || "临时条件",
    group
  }]);
  return cloneJson(stored?.group || group);
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
    beginCommonFilterEdit(common);
    return;
  }
  if (button.dataset.action === "deleteCommonFilter") {
    if (!confirm(`确定删除常用条件“${common.name}”吗？`)) {
      return;
    }
    state.commonFilters = state.commonFilters.filter((entry) => entry.id !== common.id);
    if (state.editingCommonFilterId === common.id) {
      cancelCommonFilterEdit();
    }
    chrome.storage.local.set({
      [STORAGE_KEYS.commonFilters]: state.commonFilters
    });
    renderCommonFilterList();
    renderWidgetFilterEditor();
    renderDashboard();
    showToast("常用条件已删除。");
  }
}

function beginCommonFilterEdit(common) {
  state.editingCommonFilterId = common.id;
  state.editingCommonFilterName = common.name;
  elements.commonFilterName.value = common.name;
  elements.saveCommonFilterButton.textContent = "更新常用条件";
  elements.cancelCommonFilterEditButton.hidden = false;
  state.filters = normalizeFilters(common.group, state.fieldConfigs);
  renderFilterList();
  renderCommonFilterList();
  recomputeFilteredRows();
  renderDashboard();
}

function cancelCommonFilterEdit() {
  clearCommonFilterEditState();
  renderCommonFilterList();
}

function clearCommonFilterEditState() {
  state.editingCommonFilterId = null;
  state.editingCommonFilterName = "";
  elements.commonFilterName.value = "";
  elements.saveCommonFilterButton.textContent = "保存当前条件";
  elements.cancelCommonFilterEditButton.hidden = true;
}

function renameCommonFilterReferencesInState(oldName, newName) {
  if (!oldName || !newName || oldName === newName) {
    return;
  }
  const roots = [
    state.filters,
    state.editingWidgetFilters,
    ...state.commonFilters.map((item) => item.group),
    ...state.widgets.map((widget) => widget.filters),
    ...state.reportTemplates.flatMap((template) => [
      template.filters,
      ...(Array.isArray(template.commonFilters) ? template.commonFilters : [])
        .map((item) => item.group || item.filters || item),
      ...(Array.isArray(template.widgets) ? template.widgets : [])
        .map((widget) => widget.filters)
    ])
  ];
  roots.forEach((root) => renameCommonFilterReferences(root, oldName, newName));
}

function syncCommonFilterToTemplates(commonFilter, previousName) {
  for (const template of state.reportTemplates) {
    for (const item of Array.isArray(template.commonFilters) ? template.commonFilters : []) {
      if (item.id === commonFilter.id || item.name === previousName || item.name === commonFilter.name) {
        item.id = commonFilter.id;
        item.name = commonFilter.name;
        item.group = cloneJson(commonFilter.group);
        item.filters = cloneJson(commonFilter.group);
      }
    }
  }
}

function renameCommonFilterReferences(node, oldName, newName) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (node.type === "reference" && node.name === oldName) {
    node.name = newName;
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => renameCommonFilterReferences(child, oldName, newName));
  }
  if (Array.isArray(node.conditions)) {
    node.conditions.forEach((child) => renameCommonFilterReferences(child, oldName, newName));
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
  if (state.draggingWidgetId) {
    cancelWidgetDrag();
  }
  disposeAllChartInstances();
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
    card.className = [
      "widget-card",
      widget.size === "full" ? "widget-full" : "",
      widget.type === "kpi" ? "widget-kpi-card" : ""
    ].filter(Boolean).join(" ");
    card.dataset.id = widget.id;
    if (widget.type === "kpi") {
      card.style.setProperty("--kpi-font-color", widget.kpiFontColor || "#173d35");
      card.style.setProperty("--kpi-background-color", widget.kpiBackgroundColor || "#f3f6f4");
    }
    card.style.setProperty(
      "--widget-scale",
      String(widget.scale || 1)
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
    const dragHandle = document.createElement("span");
    dragHandle.className = "widget-drag-handle";
    dragHandle.textContent = "⠿";
    dragHandle.title = "拖动组件排序";
    dragHandle.setAttribute("aria-hidden", "true");
    dragHandle.draggable = false;
    actions.append(
      dragHandle,
      createWidgetAction("↑", "up", "上移", index === 0),
      createWidgetAction("↓", "down", "下移", index === state.widgets.length - 1),
      createWidgetAction("PNG", "png", "导出此图表 PNG"),
      createWidgetAction("复制", "copy", "快速复制组件"),
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
  if (button.dataset.action === "tableExport") {
    exportTableExcel(state.widgets[index], getWidgetRows(state.widgets[index]));
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
  if (button.dataset.action === "copy") {
    copyWidget(index);
    return;
  }
  if (button.dataset.action === "delete") {
    state.widgets.splice(index, 1);
  }
  renderDashboard();
}

function copyWidget(index) {
  const source = state.widgets[index];
  if (!source) {
    return;
  }
  const copied = normalizeWidget({
    ...cloneJson(source),
    id: createId("widget"),
    title: nextCopiedWidgetTitle(source.title, state.widgets)
  });
  state.widgets.splice(index + 1, 0, copied);
  renderDashboard();
  requestAnimationFrame(() => {
    elements.dashboardGrid
      .querySelector(`.widget-card[data-id="${copied.id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  showToast(`已复制组件“${source.title}”。`);
}

function nextCopiedWidgetTitle(baseTitle, widgets) {
  const root = `${String(baseTitle || "分析组件").trim()} 副本`;
  const titles = new Set((widgets || []).map((widget) => String(widget.title || "")));
  if (!titles.has(root)) {
    return root;
  }
  let index = 2;
  while (titles.has(`${root} ${index}`)) {
    index += 1;
  }
  return `${root} ${index}`;
}

function handleWidgetPointerDown(event) {
  if (event.button !== 0 || !event.target.closest(".widget-drag-handle")) {
    return;
  }
  const card = event.target.closest(".widget-card");
  if (!card || !state.widgets.some((widget) => widget.id === card.dataset.id)) {
    return;
  }
  event.preventDefault();
  const rect = card.getBoundingClientRect();
  state.draggingWidgetId = card.dataset.id;
  state.dropWidgetIndex = state.widgets.findIndex((widget) => widget.id === card.dataset.id);
  state.dragOriginCard = card;
  state.dragStartPoint = { x: event.clientX, y: event.clientY };
  state.dragPointerOffset = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  state.dragMoved = false;
  window.addEventListener("pointermove", handleWidgetPointerMove, { passive: false });
  window.addEventListener("pointerup", handleWidgetPointerUp);
  window.addEventListener("pointercancel", handleWidgetPointerUp);
}

function handleWidgetPointerMove(event) {
  if (!state.draggingWidgetId) {
    return;
  }
  if (
    !state.dragMoved
    && Math.hypot(
      event.clientX - state.dragStartPoint.x,
      event.clientY - state.dragStartPoint.y
    ) < 5
  ) {
    return;
  }
  event.preventDefault();
  state.dragMoved = true;
  activateWidgetDrag();
  if (!state.dragPreview) {
    return;
  }
  state.dragPreview.style.left = `${event.clientX - state.dragPointerOffset.x}px`;
  state.dragPreview.style.top = `${event.clientY - state.dragPointerOffset.y}px`;
  updateWidgetDropPlaceholder(event);
}

function activateWidgetDrag() {
  if (state.dragPreview || !state.dragOriginCard) {
    return;
  }
  const widget = state.widgets.find((item) => item.id === state.draggingWidgetId);
  if (!widget) {
    cancelWidgetDrag();
    return;
  }
  const card = state.dragOriginCard;
  const rect = card.getBoundingClientRect();
  card.classList.add("is-drag-origin");
  document.body.classList.add("widget-dragging");

  const preview = document.createElement("div");
  preview.className = `widget-drag-preview${widget.size === "full" ? " widget-full" : ""}`;
  preview.style.width = `${Math.max(220, Math.min(360, rect.width))}px`;
  const previewTitle = document.createElement("strong");
  previewTitle.textContent = widget.title;
  const previewMeta = document.createElement("span");
  previewMeta.textContent = widgetSubtitle(widget);
  preview.append(previewTitle, previewMeta);

  const placeholder = document.createElement("div");
  placeholder.className = `widget-drop-placeholder${widget.size === "full" ? " widget-full" : ""}`;
  placeholder.style.minHeight = `${Math.max(140, rect.height)}px`;
  placeholder.innerHTML = "<span>放置到此处</span>";

  state.dragPreview = preview;
  state.dragPlaceholder = placeholder;
  document.body.append(preview);
  const previewRect = preview.getBoundingClientRect();
  state.dragPointerOffset = {
    x: Math.max(12, Math.min(state.dragPointerOffset.x, previewRect.width - 12)),
    y: Math.max(12, Math.min(state.dragPointerOffset.y, previewRect.height))
  };
}

function updateWidgetDropPlaceholder(event) {
  if (!state.dragPreview || !state.dragPlaceholder) {
    return;
  }
  const previewRect = state.dragPreview.getBoundingClientRect();
  const cards = [...elements.dashboardGrid.querySelectorAll(".widget-card")]
    .filter((card) => card.dataset.id !== state.draggingWidgetId);
  if (!cards.length) {
    elements.dashboardGrid.append(state.dragPlaceholder);
    state.dropWidgetIndex = 0;
    return;
  }

  let targetCard = null;
  let bestOverlap = 0;
  for (const card of cards) {
    const ratio = rectangleOverlapRatio(previewRect, card.getBoundingClientRect());
    if (ratio > bestOverlap) {
      bestOverlap = ratio;
      targetCard = card;
    }
  }

  const gridRect = elements.dashboardGrid.getBoundingClientRect();
  if (bestOverlap < 0.1) {
    if (previewRect.top < gridRect.top + 28) {
      targetCard = cards[0];
    } else if (previewRect.bottom > gridRect.bottom - 28) {
      elements.dashboardGrid.append(state.dragPlaceholder);
      state.dropWidgetIndex = state.widgets.length - 1;
      return;
    } else {
      targetCard = cards.reduce((closest, card) => {
        const rect = card.getBoundingClientRect();
        const distance = Math.hypot(
          event.clientX - (rect.left + rect.width / 2),
          event.clientY - (rect.top + rect.height / 2)
        );
        return !closest || distance < closest.distance ? { card, distance } : closest;
      }, null)?.card || null;
    }
  }

  if (!targetCard) {
    return;
  }
  const targetRect = targetCard.getBoundingClientRect();
  const sameRow = event.clientY >= targetRect.top && event.clientY <= targetRect.bottom;
  const insertAfter = sameRow
    ? event.clientX > targetRect.left + targetRect.width / 2
    : event.clientY > targetRect.top + targetRect.height / 2;
  const baseWidgets = state.widgets.filter((widget) => widget.id !== state.draggingWidgetId);
  const targetIndex = baseWidgets.findIndex((widget) => widget.id === targetCard.dataset.id);
  if (targetIndex < 0) {
    return;
  }
  state.dropWidgetIndex = targetIndex + (insertAfter ? 1 : 0);
  if (insertAfter) {
    targetCard.after(state.dragPlaceholder);
  } else {
    elements.dashboardGrid.insertBefore(state.dragPlaceholder, targetCard);
  }
}

function handleWidgetPointerUp(event) {
  if (!state.draggingWidgetId) {
    return;
  }
  const shouldCommit = state.dragMoved && Number.isInteger(state.dropWidgetIndex);
  if (shouldCommit) {
    const dragged = state.widgets.find((widget) => widget.id === state.draggingWidgetId);
    if (dragged) {
      const remaining = state.widgets.filter((widget) => widget.id !== state.draggingWidgetId);
      const index = Math.max(0, Math.min(remaining.length, state.dropWidgetIndex));
      remaining.splice(index, 0, dragged);
      state.widgets = remaining;
    }
  }
  cancelWidgetDrag();
  if (shouldCommit) {
    renderDashboard();
  }
}

function cancelWidgetDrag() {
  window.removeEventListener("pointermove", handleWidgetPointerMove);
  window.removeEventListener("pointerup", handleWidgetPointerUp);
  window.removeEventListener("pointercancel", handleWidgetPointerUp);
  state.dragOriginCard?.classList.remove("is-drag-origin");
  state.dragPreview?.remove();
  state.dragPlaceholder?.remove();
  document.body.classList.remove("widget-dragging");
  state.draggingWidgetId = null;
  state.dropWidgetIndex = null;
  state.dragOriginCard = null;
  state.dragPreview = null;
  state.dragPlaceholder = null;
  state.dragStartPoint = null;
  state.dragPointerOffset = null;
  state.dragMoved = false;
}

function rectangleOverlapRatio(leftRect, rightRect) {
  const width = Math.max(
    0,
    Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left)
  );
  const height = Math.max(
    0,
    Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top)
  );
  const targetArea = Math.max(1, rightRect.width * rightRect.height);
  return (width * height) / targetArea;
}

function renderWidgetBody(container, widget) {
  container.replaceChildren();
  const widgetRows = getWidgetRows(widget);
  if (!widgetRows.length) {
    if (widget.type === "table") {
      container.classList.remove("is-empty");
      renderDetailTable(container, widget, widgetRows);
      return;
    }
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
    if (widget.kpiFontColor) {
      container.style.color = widget.kpiFontColor;
    }
    if (widget.kpiBackgroundColor) {
      container.style.background = widget.kpiBackgroundColor;
      container.style.borderRadius = "6px";
    }
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

  if (isEChartsReady() && renderEChartsWidget(container, widget, pivot)) {
    return;
  }

  const chart = widget.type === "pie"
    ? renderPieChart(pivot)
    : widget.type === "line"
      ? renderLineChart(pivot)
      : renderBarChart(pivot, widget.type === "stackedBar");
  container.append(chart.container, chart.legend);
}

function isEChartsReady() {
  return Boolean(window.echarts?.init);
}

function renderEChartsWidget(container, widget, pivot) {
  let chartElement = null;
  try {
    const theme = getCurrentChartTheme();
    chartElement = document.createElement("div");
    chartElement.className = "echarts-chart";
    chartElement.style.background = theme.backgroundColor;
    chartElement.style.borderRadius = "6px";
    chartElement.style.height = widget.type === "pie"
      ? "470px"
      : widget.type === "line"
        ? "330px"
        : "360px";
    container.append(chartElement);

    const instance = window.echarts.init(chartElement, null, {
      renderer: "svg"
    });
    const option = buildEChartsOption({
      widget,
      pivot,
      theme,
      metricLabel: metricName(widget)
    });
    instance.setOption(option, true);
    state.chartInstances.set(widget.id, instance);
    state.chartOptions.set(widget.id, option);
    applyEChartsLeaderOverlay(instance, option);
    instance.on("datazoom", () => {
      applyEChartsLeaderOverlay(instance, option);
    });

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => {
        instance.resize();
        applyEChartsLeaderOverlay(instance, option);
      });
      observer.observe(chartElement);
      state.chartResizeObservers.set(widget.id, observer);
    }
    requestAnimationFrame(() => {
      if (!instance.isDisposed()) {
        instance.resize();
        applyEChartsLeaderOverlay(instance, option);
      }
    });
    return true;
  } catch (error) {
    chartElement?.remove();
    console.warn("ECharts render failed, falling back to SVG renderer.", error);
    return false;
  }
}

function disposeAllChartInstances() {
  for (const observer of state.chartResizeObservers.values()) {
    observer.disconnect();
  }
  state.chartResizeObservers.clear();
  for (const instance of state.chartInstances.values()) {
    if (!instance.isDisposed()) {
      instance.dispose();
    }
  }
  state.chartInstances.clear();
  state.chartOptions.clear();
}

function applyEChartsLeaderOverlay(instance, option) {
  const points = option?.__ssoMeta?.smallPoints;
  if (!Array.isArray(points) || !points.length || instance.isDisposed()) {
    return;
  }
  const width = instance.getWidth();
  const height = instance.getHeight();
  const graphics = [];
  for (const point of points) {
    const start = instance.convertToPixel(
      { xAxisIndex: 0, yAxisIndex: 0 },
      [point.labelIndex, point.startValue]
    );
    const end = instance.convertToPixel(
      { xAxisIndex: 0, yAxisIndex: 0 },
      [point.labelIndex, point.endValue]
    );
    if (!Array.isArray(start) || !Array.isArray(end)) {
      continue;
    }
    if (
      end[0] < 0
      || end[0] > width
      || end[1] < 0
      || end[1] > height
    ) {
      continue;
    }
    const direction = point.seriesIndex % 2 === 0 ? 1 : -1;
    const centerY = (start[1] + end[1]) / 2;
    const endY = Math.max(
      20,
      Math.min(height - 26, centerY + (point.seriesIndex % 3 - 1) * 12)
    );
    const endX = Math.max(
      36,
      Math.min(width - 36, end[0] + direction * 62)
    );
    graphics.push({
      type: "polyline",
      shape: {
        points: [
          [end[0], centerY],
          [end[0] + direction * 12, endY],
          [endX, endY]
        ]
      },
      style: {
        stroke: option.textStyle?.color || "#46544d",
        lineWidth: 0.8,
        fill: "none"
      },
      silent: true
    });
    graphics.push({
      type: "text",
      left: direction > 0 ? endX + 3 : endX - 3,
      top: endY - 7,
      style: {
        text: formatMetric(point.value),
        fill: option.textStyle?.color || "#46544d",
        font: "9px Inter, PingFang SC, Microsoft YaHei, sans-serif",
        textAlign: direction > 0 ? "left" : "right"
      },
      silent: true
    });
  }
  instance.setOption({
    graphic: [{
      id: "sso-leader-overlay",
      type: "group",
      children: graphics
    }]
  }, { lazyUpdate: false, silent: true });
}

function getCurrentChartTheme() {
  return getChartTheme(state.chartThemeId, state.customChartThemes);
}

function renderChartThemeControls() {
  const themes = listChartThemes(state.customChartThemes);
  if (!themes.some((theme) => theme.id === state.chartThemeId)) {
    state.chartThemeId = DEFAULT_CHART_THEME_ID;
  }
  elements.chartThemeSelect.replaceChildren();
  for (const theme of themes) {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.name;
    elements.chartThemeSelect.append(option);
  }
  elements.chartThemeSelect.value = state.chartThemeId;
  renderChartThemePreview(getCurrentChartTheme());
  elements.deleteChartThemeButton.disabled = !state.customChartThemes
    .some((theme) => theme.id === state.chartThemeId);
}

function renderChartThemePreview(theme) {
  elements.chartThemePreview.replaceChildren();
  for (const color of theme.colors.slice(0, 8)) {
    const swatch = document.createElement("span");
    swatch.className = "theme-preview-swatch";
    swatch.style.backgroundColor = color;
    swatch.title = color;
    elements.chartThemePreview.append(swatch);
  }
}

function applySelectedChartTheme() {
  state.chartThemeId = elements.chartThemeSelect.value || DEFAULT_CHART_THEME_ID;
  renderChartThemeControls();
  persistReportUiState();
  renderDashboard();
}

function openChartThemeDialog() {
  const base = getCurrentChartTheme();
  state.dialogThemeColors = [...base.colors];
  elements.chartThemeName.value = `${base.name} 自定义`;
  elements.themeTextColor.value = base.textColor;
  elements.themeBackgroundColor.value = base.backgroundColor;
  elements.themeAxisColor.value = base.axisColor;
  renderThemeColorInputs();
  elements.chartThemeDialog.showModal();
}

function renderThemeColorInputs() {
  elements.themeColorList.replaceChildren();
  state.dialogThemeColors.forEach((color, index) => {
    const row = document.createElement("label");
    row.className = "color-row";
    const input = document.createElement("input");
    input.type = "color";
    input.value = color;
    input.dataset.themeColorIndex = String(index);
    const label = document.createElement("span");
    label.textContent = `分类色 ${index + 1}`;
    row.append(input, label);
    elements.themeColorList.append(row);
  });
}

function handleThemeColorInput(event) {
  const index = Number(event.target.dataset.themeColorIndex);
  if (Number.isInteger(index) && index >= 0) {
    state.dialogThemeColors[index] = event.target.value;
  }
}

function closeChartThemeDialog() {
  elements.chartThemeDialog.close();
}

async function saveChartThemeFromDialog(event) {
  event.preventDefault();
  const base = getCurrentChartTheme();
  const name = elements.chartThemeName.value.trim();
  const textColor = elements.themeTextColor.value;
  const backgroundColor = elements.themeBackgroundColor.value;
  const axisColor = elements.themeAxisColor.value;
  const candidate = normalizeChartTheme({
    ...base,
    id: createId("theme"),
    name,
    description: `${name || base.name} 自定义配色方案`,
    colors: [...state.dialogThemeColors],
    textColor,
    mutedTextColor: mixHexColors(textColor, backgroundColor, 0.52),
    backgroundColor,
    gridColor: mixHexColors(axisColor, backgroundColor, 0.78),
    axisColor,
    tooltipBackground: textColor,
    legendTextColor: textColor
  });
  const validation = validateChartTheme(candidate);
  if (!validation.valid) {
    showToast(validation.errors[0] || "配色方案无效。");
    return;
  }

  state.customChartThemes = saveCustomChartThemes(
    state.customChartThemes,
    [candidate]
  );
  state.chartThemeId = candidate.id;
  await chrome.storage.local.set({
    [STORAGE_KEYS.chartThemes]: state.customChartThemes
  });
  persistReportUiState();
  closeChartThemeDialog();
  renderChartThemeControls();
  renderDashboard();
  showToast(`配色方案“${candidate.name}”已保存并应用。`);
}

async function deleteSelectedChartTheme() {
  const theme = getCurrentChartTheme();
  if (!state.customChartThemes.some((item) => item.id === theme.id)) {
    return;
  }
  if (!confirm(`确定删除配色方案“${theme.name}”吗？`)) {
    return;
  }
  state.customChartThemes = state.customChartThemes.filter((item) => item.id !== theme.id);
  state.chartThemeId = DEFAULT_CHART_THEME_ID;
  await chrome.storage.local.set({
    [STORAGE_KEYS.chartThemes]: state.customChartThemes
  });
  persistReportUiState();
  renderChartThemeControls();
  renderDashboard();
  showToast("配色方案已删除。");
}

function mixHexColors(first, second, secondWeight) {
  const left = parseHexColor(first);
  const right = parseHexColor(second);
  if (!left || !right) {
    return "#66727a";
  }
  const weight = Math.max(0, Math.min(1, Number(secondWeight) || 0));
  const channel = (key) => Math.round(left[key] * (1 - weight) + right[key] * weight);
  return `#${[channel("r"), channel("g"), channel("b")]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseHexColor(value) {
  const source = String(value || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(source)) {
    return null;
  }
  const number = Number.parseInt(source, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255
  };
}

function buildPivotData(widget, rows = getWidgetRows(widget)) {
  const dimension = resolveFieldReference(widget.dimension || "");
  const seriesField = resolveFieldReference(widget.series || "");
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
  if (!widgetRows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = Math.max(1, fields.length);
    td.className = "table-empty-cell";
    td.textContent = "当前筛选条件下没有数据。";
    tr.append(td);
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.append(table);
  container.append(wrap);

  const controls = document.createElement("div");
  controls.className = "table-pagination";
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "mini-button";
  previous.dataset.action = "tablePrev";
  previous.textContent = "上一页";
  previous.disabled = currentPage <= 1;

  const status = document.createElement("span");
  status.className = "table-page-status";
  status.textContent = `第 ${currentPage} / ${totalPages} 页 · 每页 ${pageSize} 条 · 共 ${widgetRows.length} 条`;

  const next = document.createElement("button");
  next.type = "button";
  next.className = "mini-button";
  next.dataset.action = "tableNext";
  next.textContent = "下一页";
  next.disabled = currentPage >= totalPages;

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "mini-button table-export-button";
  exportButton.dataset.action = "tableExport";
  exportButton.textContent = "导出 Excel";

  controls.append(status, previous, next, exportButton);
  container.append(controls);
}

function exportTableExcel(widget, rows) {
  const fields = getSelectedFields();
  if (!fields.length) {
    showToast("没有可导出的字段。");
    return;
  }

  const header = fields
    .map((field) => excelCell(field.label, "String"))
    .join("");
  const body = rows.map((row) => {
    const flattened = getFlattenedRow(row);
    return `<Row>${fields.map((field) => {
      const value = flattened[field.path];
      if (typeof value === "number" && Number.isFinite(value)) {
        return excelCell(value, "Number");
      }
      if (typeof value === "boolean") {
        return excelCell(value ? "TRUE" : "FALSE", "Boolean");
      }
      const text = value === undefined || value === null || value === ""
        ? ""
        : displayValue(value);
      return excelCell(text, "String");
    }).join("")}</Row>`;
  }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="数据">
    <Table>
      <Row>${header}</Row>
      ${body}
    </Table>
  </Worksheet>
</Workbook>`;
  downloadBlob(
    new Blob([`\ufeff${xml}`], { type: "application/vnd.ms-excel;charset=utf-8" }),
    `${safeFileName(widget.title)}-全部数据.xls`
  );
  showToast(`已导出 ${rows.length} 条数据到 Excel。`);
}

function excelCell(value, type) {
  return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
  const leaderPadding = widget.smallValueMode === "leader" ? 120 : 22;
  const labelTextWidth = longestLabel * 7;
  const labelBottom = axisLabelMode === "wrap"
    ? Math.max(92, Math.ceil(longestLabel / 9) * 13 + 24)
    : Math.max(88, Math.sin((32 * Math.PI) / 180) * labelTextWidth + 34);
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
  const axisBottom = margin.top + plotHeight;
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
  const leaderTracks = { left: [], right: [] };

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
        setChartTooltipElement(
          segment,
          `${series}: ${formatMetric(value)}`,
          { x: xCenter, y: y + barHeight / 2 }
        );
        if (widget.showValues) {
          appendBarValueLabel(svg, {
            mode: widget.smallValueMode,
            text: formatMetric(value),
            x: xCenter,
            y,
            barWidth,
            barHeight,
            plotTop: margin.top,
            plotBottom: margin.top + plotHeight,
            chartWidth: width,
            seriesIndex,
            leaderTracks,
            position: "inside",
            largeThreshold: 14
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
            ? getWidgetColor(
              widget,
              Array.isArray(widget.colors) && widget.colors.length
                ? labelIndex
                : 0
            )
            : getWidgetColor(widget, seriesIndex),
          rx: 2
        });
        setChartTooltipElement(
          bar,
          `${label}: ${formatMetric(value)}`,
          { x: x + barWidth / 2, y: margin.top + plotHeight - barHeight / 2 }
        );
        if (widget.showValues) {
          appendBarValueLabel(svg, {
            mode: widget.smallValueMode,
            text: formatMetric(value),
            x: x + barWidth / 2,
            y: margin.top + plotHeight - barHeight,
            barWidth,
            barHeight,
            plotTop: margin.top,
            plotBottom: margin.top + plotHeight,
            chartWidth: width,
            seriesIndex,
            leaderTracks,
            position: "above",
            largeThreshold: 12,
            largeFill: "#35443d"
          });
        }
      });
    }
    appendAxisLabel(
      svg,
      label,
      xCenter,
      axisBottom + 18,
      Math.max(48, step - 8),
      axisLabelMode,
      { growDown: true }
    );
  });

  const legendLabels = pivot.seriesNames.length > 1 ? pivot.seriesNames : [metricName(widget)];
  const legend = buildLegend(
    legendLabels,
    legendLabels.map((label, index) => getWidgetColor(widget, index))
  );
  const container = document.createElement("div");
  container.className = "chart-scroll";
  container.append(svg);
  attachChartTooltip(container, svg);
  return { container, legend };
}

function renderPieChart(pivot) {
  const chartScale = Math.min(3, Math.max(0.5, Number(pivot.widget.scale) || 1));
  const width = Math.round(1000 * chartScale);
  const height = Math.round(520 * chartScale);
  const cx = Math.round(400 * chartScale);
  const cy = Math.round(240 * chartScale);
  const radius = Math.round(170 * chartScale);
  const values = pivot.totals;
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  const svg = createChartSvg(width, height, "饼图");
  let angle = -Math.PI / 2;
  const leaderTracks = { left: [], right: [] };

  values.forEach((value, index) => {
    const share = total > 0 ? Math.max(0, value) / total : 0;
    if (share <= 0) {
      return;
    }
    const endAngle = angle + share * Math.PI * 2;
    const middleAngle = (angle + endAngle) / 2;
    const labelPrefix = pivot.widget.showLegendText
      ? `${pivot.labels[index]}; `
      : "";
    const labelText = `${labelPrefix}${formatMetric(value)}; ${(share * 100).toFixed(1)}%`;
    const path = createSvg("path", {
      d: describeArc(cx, cy, radius, angle, endAngle),
      fill: getWidgetColor(pivot.widget, index),
      stroke: "#ffffff",
      "stroke-width": 2
    });
    setChartTooltipElement(
      path,
      pivot.widget.showLegendText
        ? labelText
        : `${pivot.labels[index]}: ${labelText}`,
      polarToCartesian(cx, cy, radius * 0.72, middleAngle)
    );
    svg.append(path);
    if (pivot.widget.showValues) {
      const mode = pivot.widget.smallValueMode || "leader";
      if (share >= 0.05) {
        const labelPoint = polarToCartesian(cx, cy, radius * 0.66, middleAngle);
        appendSvgText(svg, labelText, labelPoint.x, labelPoint.y + 3, {
          anchor: "middle",
          fill: "#ffffff",
          size: 9
        });
      } else if (mode === "shrink") {
        const arcWidth = Math.max(4, share * Math.PI * 2 * radius * 0.66);
        const size = Math.max(3, Math.min(10, arcWidth / Math.max(3, labelText.length * 0.62)));
        const naturalWidth = labelText.length * size * 0.58;
        const labelPoint = polarToCartesian(cx, cy, radius * 0.66, middleAngle);
        appendSvgText(svg, labelText, labelPoint.x, labelPoint.y + 3, {
          anchor: "middle",
          fill: "#ffffff",
          size,
          textLength: naturalWidth > arcWidth * 0.86
            ? Math.max(4, arcWidth * 0.86)
            : null,
          lengthAdjust: "spacingAndGlyphs"
        });
      } else if (mode === "leader") {
        const side = Math.cos(middleAngle) >= 0 ? "right" : "left";
        const direction = side === "right" ? 1 : -1;
        const start = polarToCartesian(cx, cy, radius * 0.94, middleAngle);
        const elbow = polarToCartesian(cx, cy, radius + 20, middleAngle);
        const baseY = cy + Math.sin(middleAngle) * radius;
        const endY = allocateLeaderTrack(
          baseY,
          leaderTracks[side],
          20,
          height - 38,
          15
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
  attachChartTooltip(container, svg);
  return { container, legend };
}

function allocateLeaderTrack(preferred, tracks, min, max, gap) {
  const clamp = (value) => Math.max(min, Math.min(max, value));
  let candidate = clamp(preferred);
  const isFree = (value) => tracks.every((track) => Math.abs(track - value) >= gap - 1);
  if (isFree(candidate)) {
    tracks.push(candidate);
    tracks.sort((a, b) => a - b);
    return candidate;
  }

  for (let step = 1; step <= 30; step += 1) {
    for (const direction of [1, -1]) {
      candidate = clamp(preferred + direction * step * gap);
      if (isFree(candidate)) {
        tracks.push(candidate);
        tracks.sort((a, b) => a - b);
        return candidate;
      }
    }
  }
  return clamp(preferred);
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
  const attributes = {
    x,
    y,
    "text-anchor": options.anchor || "start",
    fill: options.fill || "#28352f",
    "font-size": options.size || 11,
    "font-family": "Inter, PingFang SC, Microsoft YaHei, sans-serif"
  };
  if (options.textLength) {
    attributes.textLength = options.textLength;
  }
  if (options.lengthAdjust) {
    attributes.lengthAdjust = options.lengthAdjust;
  }
  const element = appendSvg(svg, "text", attributes);
  element.textContent = text;
  return element;
}

function appendBarValueLabel(svg, options) {
  const {
    mode = "leader",
    text,
    x,
    y,
    barWidth,
    barHeight,
    plotTop,
    plotBottom,
    chartWidth,
    seriesIndex = 0,
    leaderTracks = null,
    position = "inside",
    largeThreshold = 12,
    largeFill = "#ffffff"
  } = options;
  if (!text || barHeight <= 0) {
    return;
  }

  if (barHeight >= largeThreshold) {
    appendSvgText(
      svg,
      text,
      x,
      position === "above" ? y - 5 : y + barHeight / 2 + 3,
      {
        anchor: "middle",
        fill: largeFill,
        size: 9
      }
    );
    return;
  }

  if (mode === "hover") {
    return;
  }

  if (mode === "shrink") {
    const size = Math.max(3, Math.min(9, barHeight, barWidth - 2));
    appendSvgText(svg, text, x, y + Math.max(4, barHeight / 2 + 2), {
      anchor: "middle",
      fill: "#ffffff",
      size,
      textLength: Math.max(4, barWidth - 2),
      lengthAdjust: "spacingAndGlyphs"
    });
    return;
  }

  const direction = seriesIndex % 2 === 0 ? 1 : -1;
  const centerY = y + barHeight / 2;
  const side = direction > 0 ? "right" : "left";
  const preferredY = centerY + (seriesIndex % 3 - 1) * 12;
  const endY = leaderTracks?.[side]
    ? allocateLeaderTrack(preferredY, leaderTracks[side], plotTop + 8, plotBottom - 8, 12)
    : Math.max(plotTop + 8, Math.min(plotBottom - 8, preferredY));
  const endX = Math.max(
    64,
    Math.min(chartWidth - 8, x + direction * (barWidth / 2 + 48 + (seriesIndex % 3) * 18))
  );
  appendSvg(svg, "polyline", {
    points: `${x},${centerY} ${x + direction * (barWidth / 2 + 9)},${endY} ${endX},${endY}`,
    fill: "none",
    stroke: "#73827a",
    "stroke-width": 0.8
  });
  appendSvgText(svg, text, endX + direction * 3, endY + 3, {
    anchor: direction > 0 ? "start" : "end",
    fill: "#46544d",
    size: 8
  });
}

function createTitleNode(text) {
  const title = document.createElementNS(SVG_NAMESPACE, "title");
  title.textContent = text;
  return title;
}

function setChartTooltipElement(element, text, hitPoint = null) {
  element.dataset.chartTooltip = String(text ?? "");
  if (hitPoint) {
    element.dataset.chartHitX = String(hitPoint.x);
    element.dataset.chartHitY = String(hitPoint.y);
  }
  element.append(createTitleNode(text));
  return element;
}

function attachChartTooltip(container, svg) {
  if (!svg.querySelector("[data-chart-tooltip]")) {
    return;
  }
  const tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.hidden = true;
  container.append(tooltip);
  const hide = () => {
    tooltip.hidden = true;
  };
  svg.addEventListener("pointermove", (event) => {
    const direct = event.target.closest("[data-chart-tooltip]");
    const target = direct || findNearestChartTooltip(svg, event.clientX, event.clientY);
    if (!target) {
      hide();
      return;
    }
    tooltip.textContent = target.dataset.chartTooltip;
    tooltip.hidden = false;
    tooltip.style.left = `${Math.min(
      event.clientX + 12,
      window.innerWidth - tooltip.offsetWidth - 10
    )}px`;
    tooltip.style.top = `${Math.min(
      event.clientY + 12,
      window.innerHeight - tooltip.offsetHeight - 10
    )}px`;
  });
  svg.addEventListener("pointerleave", hide);
}

function findNearestChartTooltip(svg, clientX, clientY) {
  const candidates = [...svg.querySelectorAll("[data-chart-tooltip]")];
  let nearest = null;
  let nearestDistance = 24 * 24;
  for (const element of candidates) {
    const point = chartTooltipPoint(element, svg);
    const distance = (point.x - clientX) ** 2 + (point.y - clientY) ** 2;
    if (distance < nearestDistance) {
      nearest = element;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function chartTooltipPoint(element, svg) {
  const x = Number(element.dataset.chartHitX);
  const y = Number(element.dataset.chartHitY);
  if (Number.isFinite(x) && Number.isFinite(y) && element.getScreenCTM) {
    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    const screenPoint = point.matrixTransform(element.getScreenCTM());
    return { x: screenPoint.x, y: screenPoint.y };
  }
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function buildLegend(labels, colors = []) {
  const legend = document.createElement("div");
  legend.className = "chart-legend";
  labels.forEach((label, index) => {
    legend.append(createLegendItem(
      label,
      colors[index] || getCurrentChartTheme().colors[
        index % getCurrentChartTheme().colors.length
      ]
    ));
  });
  return legend;
}

function getWidgetColor(widget, index) {
  return isHexColor(widget.colors?.[index])
    ? widget.colors[index]
    : getCurrentChartTheme().colors[index % getCurrentChartTheme().colors.length];
}

function appendAxisLabel(svg, label, x, y, maxWidth, mode, options = {}) {
  if (mode === "wrap") {
    const maxChars = Math.max(5, Math.floor(maxWidth / 8));
    const lines = splitLabel(label, maxChars);
    const startY = options.growDown
      ? y
      : y - Math.max(0, lines.length - 1) * 12;
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

  const fieldPath = resolveFieldReference(field);
  const values = rows
    .map((row) => getFlattenedRow(row)[fieldPath])
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
  elements.widgetKpiFontColor.value = model.kpiFontColor || "#173d35";
  elements.widgetKpiBackgroundColor.value = model.kpiBackgroundColor || "#f3f6f4";
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
  const isKpi = elements.widgetType.value === "kpi";
  const supportsSmallValueMode = ["pie", "bar", "stackedBar"].includes(elements.widgetType.value);
  elements.pieLegendThresholdField.hidden = !isPie;
  elements.pieShowLegendTextField.hidden = !isPie;
  elements.smallValueModeField.hidden = !supportsSmallValueMode;
  elements.chartColorEditor.hidden = isKpi;
  elements.kpiColorFields.hidden = !isKpi;
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
    const themeColors = getCurrentChartTheme().colors;
    input.value = state.dialogColors[index]
      || themeColors[index % themeColors.length];
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
    kpiFontColor: elements.widgetKpiFontColor.value,
    kpiBackgroundColor: elements.widgetKpiBackgroundColor.value,
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
    state.widgets.unshift(normalized);
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
  clearCommonFilterEditState();
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
  if (
    filters
    && typeof filters === "object"
    && (
      filters.type === "group"
      || Array.isArray(filters.children)
      || Array.isArray(filters.conditions)
    )
  ) {
    return normalizeFilterNode(filters, validPaths, true, fields);
  }

  const group = createFilterGroup(filters?.logic === "any" ? "any" : "all");
  group.children = Array.isArray(filters?.conditions)
    ? filters.conditions
      .map((condition) => normalizeFilterCondition(condition, validPaths, fields))
      .filter(Boolean)
    : [];
  return group;
}

function normalizeFilterNode(node, validPaths, forceGroup = false, fields = state.fieldConfigs) {
  if (node?.type === "reference" && node.name) {
    return {
      id: node.id || createId("filter-reference"),
      type: "reference",
      name: String(node.name),
      enabled: node.enabled !== false
    };
  }
  if (
    node?.type === "group"
    || forceGroup
    || Array.isArray(node?.children)
    || Array.isArray(node?.conditions)
  ) {
    const group = createFilterGroup(node?.logic === "any" ? "any" : "all");
    group.id = node?.id || group.id;
    group.enabled = node?.enabled !== false;
    const children = Array.isArray(node?.children)
      ? node.children
      : Array.isArray(node?.conditions)
        ? node.conditions
        : [];
    group.children = children
      .map((child) => normalizeFilterNode(child, validPaths, false, fields))
      .filter(Boolean);
    return group;
  }
  return normalizeFilterCondition(node, validPaths, fields);
}

function normalizeFilterCondition(condition, validPaths, fields = state.fieldConfigs) {
  const field = resolveFieldPath(condition?.field, fields);
  if (!condition || !validPaths.has(field)) {
    return null;
  }
  return {
    id: condition.id || createId("filter"),
    type: "condition",
    field,
    operator: FILTER_OPERATORS[condition.operator] ? condition.operator : "contains",
    value: String(condition.value ?? condition.conditionValue ?? ""),
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
  const items = Array.isArray(commonFilters)
    ? commonFilters
    : commonFilters?.name
      ? [commonFilters]
      : [];
  if (!items.length) {
    return [];
  }
  const unique = new Map();
  for (const item of items) {
    const name = String(item?.name || "").trim();
    if (!name) {
      continue;
    }
    const group = normalizeFilters(item.group || item.filters || item, fields);
    unique.set(name, {
      id: item.id || createId("common-filter"),
      name,
      group,
      filters: cloneJson(group)
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
    const canvas = await renderEChartsWidgetCanvas(card, widget)
      || await renderElementCanvas(card, {
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

async function renderEChartsWidgetCanvas(card, widget) {
  const instance = state.chartInstances.get(widget.id);
  const originalOption = state.chartOptions.get(widget.id);
  if (!instance || !originalOption || instance.isDisposed()) {
    return null;
  }
  const labels = Array.isArray(originalOption.xAxis?.data)
    ? originalOption.xAxis.data
    : [];
  if (!originalOption.dataZoom?.length || labels.length <= 10) {
    return null;
  }

  const chartElement = instance.getDom();
  const originalWidth = chartElement.style.width;
  const fullWidth = Math.max(instance.getWidth(), labels.length * 84 + 120);
  const exportOption = {
    ...originalOption,
    dataZoom: [],
    graphic: [],
    xAxis: {
      ...originalOption.xAxis,
      axisLabel: {
        ...originalOption.xAxis.axisLabel,
        hideOverlap: false,
        interval: 0,
        rotate: 28,
        overflow: "none",
        width: undefined
      }
    }
  };

  try {
    chartElement.style.width = `${fullWidth}px`;
    instance.resize({ width: fullWidth });
    instance.setOption(exportOption, { notMerge: true, lazyUpdate: false });
    applyEChartsLeaderOverlay(instance, exportOption);
    await nextAnimationFrame();
    return await renderElementCanvas(card, {
      allowScroll: true,
      background: "#ffffff"
    });
  } finally {
    chartElement.style.width = originalWidth;
    instance.resize();
    instance.setOption(originalOption, { notMerge: true, lazyUpdate: false });
    applyEChartsLeaderOverlay(instance, originalOption);
  }
}

function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function renderDashboardCanvas(immersive) {
  cancelWidgetDrag();
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
  cancelWidgetDrag();
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
    ".widget-actions, .widget-drag-preview, .widget-drop-placeholder, .widget-drag-handle, .chart-tooltip, .table-pagination, .export-controls, .template-controls .button-row, .section-controls, .dashboard-toolbar .button-row, .immersive-exit, dialog, script, input[type='file']"
  ).forEach((element) => element.remove());
}

function getFullElementWidth(element) {
  let width = Math.max(element.clientWidth, element.scrollWidth);
  for (const item of element.querySelectorAll(
    ".chart-scroll, .echarts-chart, .data-table-wrap"
  )) {
    width = Math.max(width, item.scrollWidth + 28);
  }
  return width;
}

async function exportDashboardHtml() {
  try {
    cancelWidgetDrag();
    const clone = elements.dashboardGrid.cloneNode(true);
    clone.querySelectorAll(
      ".widget-actions, .widget-drag-preview, .widget-drop-placeholder, .widget-drag-handle, .chart-tooltip"
    ).forEach((element) => element.remove());
    prepareInteractiveTableExports(clone);
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
  <script>${EXPORTED_TABLE_SCRIPT}</script>
</body>
</html>`;
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${safeFileName(state.dataset.name)}-dashboard.html`);
    showToast("本地 HTML 看板已导出。");
  } catch (error) {
    showToast(`HTML 导出失败：${error.message}`);
  }
}

function prepareInteractiveTableExports(clone) {
  for (const widget of state.widgets.filter((item) => item.type === "table")) {
    const card = [...clone.querySelectorAll(".widget-card")]
      .find((item) => item.dataset.id === widget.id);
    const body = card?.querySelector(".widget-body");
    if (!body) {
      continue;
    }
    body.replaceChildren(createInteractiveTableExport(widget));
  }
}

function createInteractiveTableExport(widget) {
  const fields = getSelectedFields();
  const rows = getWidgetRows(widget).map((row) => {
    const flattened = getFlattenedRow(row);
    return fields.map((field) => displayValue(flattened[field.path]));
  });
  const pageSize = Math.max(1, Number(widget.pageSize) || 20);
  const root = document.createElement("div");
  root.className = "table-export-root";
  root.dataset.exportTable = "";

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
  const tbody = document.createElement("tbody");
  table.append(thead, tbody);
  wrap.append(table);

  const controls = document.createElement("div");
  controls.className = "table-pagination";
  const status = document.createElement("span");
  status.className = "table-page-status";
  status.dataset.exportTableStatus = "";
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "mini-button";
  previous.dataset.exportTablePrev = "";
  previous.textContent = "上一页";
  const next = document.createElement("button");
  next.type = "button";
  next.className = "mini-button";
  next.dataset.exportTableNext = "";
  next.textContent = "下一页";
  controls.append(status, previous, next);

  const data = document.createElement("script");
  data.type = "application/json";
  data.dataset.exportTableData = "";
  data.textContent = JSON.stringify({ pageSize, rows }).replace(/</g, "\\u003c");

  root.append(wrap, controls, data);
  return root;
}

const EXPORTED_TABLE_SCRIPT = `
(() => {
  document.querySelectorAll("[data-export-table]").forEach((root) => {
    const dataNode = root.querySelector("[data-export-table-data]");
    const tbody = root.querySelector("tbody");
    const status = root.querySelector("[data-export-table-status]");
    const previous = root.querySelector("[data-export-table-prev]");
    const next = root.querySelector("[data-export-table-next]");
    if (!dataNode || !tbody || !status || !previous || !next) return;
    const data = JSON.parse(dataNode.textContent || "{}");
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const pageSize = Math.max(1, Number(data.pageSize) || 20);
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    let page = 1;
    const render = () => {
      tbody.replaceChildren();
      const start = (page - 1) * pageSize;
      const pageRows = rows.slice(start, start + pageSize);
      if (!pageRows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = Math.max(1, root.querySelectorAll("thead th").length);
        td.className = "table-empty-cell";
        td.textContent = "当前筛选条件下没有数据。";
        tr.append(td);
        tbody.append(tr);
      } else {
        pageRows.forEach((row) => {
          const tr = document.createElement("tr");
          row.forEach((value) => {
            const td = document.createElement("td");
            td.textContent = value;
            td.title = value;
            tr.append(td);
          });
          tbody.append(tr);
        });
      }
      status.textContent = "第 " + page + " / " + totalPages + " 页 · 每页 " + pageSize + " 条 · 共 " + rows.length + " 条";
      previous.disabled = page <= 1;
      next.disabled = page >= totalPages;
    };
    previous.addEventListener("click", () => {
      page = Math.max(1, page - 1);
      render();
    });
    next.addEventListener("click", () => {
      page = Math.min(totalPages, page + 1);
      render();
    });
    render();
  });
})();
`;

async function exportDashboardRules(dashboardOnly = false) {
  cancelWidgetDrag();
  const templates = templatesForCurrentDataset();
  const currentId = state.currentTemplateId || createId("report");
  const current = buildCurrentTemplateModel({
    id: currentId,
    name: elements.templateName.value.trim()
      || state.reportTemplates.find((template) => template.id === state.currentTemplateId)?.name
      || `${state.dataset.name || "数据集"} 报表`
  });
  const exportList = dashboardOnly
    ? [current]
    : [
      current,
      ...templates.filter((template) => template.id !== current.id)
    ];
  const packageData = {
    type: dashboardOnly
      ? "sso-data-bridge-dashboard-only"
      : "sso-data-bridge-dashboard-package",
    version: 1,
    exportedAt: Date.now(),
    commonFilters: cloneJson(normalizeCommonFiltersForStorage(
      normalizeCommonFilters(state.commonFilters, state.fieldConfigs),
      exportList
    )),
    chartThemeId: state.chartThemeId,
    chartThemes: cloneJson(state.customChartThemes),
    fieldMappings: cloneJson(current.fieldMappings),
    templates: cloneJson(exportList)
  };
  if (!dashboardOnly) {
    packageData.requestConfig = cloneJson(state.dataset.requestConfig || null);
    packageData.requestName = state.dataset.name || state.dataset.requestConfig?.name || "导入的请求";
  }
  downloadBlob(
    new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json" }),
    `${safeFileName(state.dataset.name)}-${dashboardOnly ? "current-dashboard" : "dashboard"}-rules.json`
  );
  showToast(dashboardOnly ? "当前看板规则已单独导出。" : "完整请求与看板规则已导出。");
}

async function importDashboardRules() {
  const [file] = elements.reportRulesInput.files || [];
  elements.reportRulesInput.value = "";
  if (!file) {
    return;
  }

  try {
    const packageData = JSON.parse(await file.text());
    const dashboardOnly = packageData?.type === "sso-data-bridge-dashboard-only";
    const importedTemplates = [
      "sso-data-bridge-dashboard-package",
      "sso-data-bridge-dashboard-only"
    ].includes(packageData?.type)
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

    const sameRequest = dashboardOnly
      || theSameRequest(packageData?.requestConfig, state.dataset?.requestConfig);
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
    state.customChartThemes = saveCustomChartThemes(
      state.customChartThemes,
      packageData?.chartThemes
    );
    if (packageData?.chartThemeId) {
      state.chartThemeId = packageData.chartThemeId;
    }
    await chrome.storage.local.set({
      [STORAGE_KEYS.reportTemplates]: state.reportTemplates,
      [STORAGE_KEYS.commonFilters]: state.commonFilters,
      [STORAGE_KEYS.chartThemes]: state.customChartThemes
    });
    persistReportUiState();
    broadcast({ type: "REPORT_TEMPLATES_UPDATED", templateId: imported[0].id });
    await applyTemplate(imported[0]);
    renderAll();
    showToast(
      `已导入并持久化 ${imported.length} 个${dashboardOnly ? "当前看板" : "报表"}模板。`
    );
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
