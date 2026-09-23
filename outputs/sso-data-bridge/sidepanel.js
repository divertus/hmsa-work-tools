import {
  createDefaultConfig,
  createId,
  normalizeConfig,
  STORAGE_KEYS,
  validateConfig
} from "./lib/config.js";
import { saveCustomChartThemes } from "./lib/chart-themes.js";
import { normalizeCommonFiltersForStorage } from "./lib/report-rules.js";

const elements = {
  configForm: document.querySelector("#config-form"),
  profileSelect: document.querySelector("#profile-select"),
  draftState: document.querySelector("#draft-state"),
  configName: document.querySelector("#config-name"),
  requestMethod: document.querySelector("#request-method"),
  requestContext: document.querySelector("#request-context"),
  requestUrl: document.querySelector("#request-url"),
  requestHeaders: document.querySelector("#request-headers"),
  requestBodyMode: document.querySelector("#request-body-mode"),
  requestBody: document.querySelector("#request-body"),
  paginationEnabled: document.querySelector("#pagination-enabled"),
  paginationFields: document.querySelector("#pagination-fields"),
  paginationType: document.querySelector("#pagination-type"),
  paginationTarget: document.querySelector("#pagination-target"),
  paginationPageParam: document.querySelector("#pagination-page-param"),
  pageParameterLabel: document.querySelector("#page-parameter-label"),
  paginationSizeParam: document.querySelector("#pagination-size-param"),
  paginationCursorParam: document.querySelector("#pagination-cursor-param"),
  paginationInitialCursor: document.querySelector("#pagination-initial-cursor"),
  paginationPageSize: document.querySelector("#pagination-page-size"),
  paginationStartPage: document.querySelector("#pagination-start-page"),
  paginationStep: document.querySelector("#pagination-step"),
  paginationStartOffset: document.querySelector("#pagination-start-offset"),
  paginationMaxPages: document.querySelector("#pagination-max-pages"),
  paginationDataPath: document.querySelector("#pagination-data-path"),
  paginationTotalPath: document.querySelector("#pagination-total-path"),
  paginationPageCountPath: document.querySelector("#pagination-page-count-path"),
  paginationHasNextPath: document.querySelector("#pagination-has-next-path"),
  paginationNextCursorPath: document.querySelector("#pagination-next-cursor-path"),
  paginationDedupePath: document.querySelector("#pagination-dedupe-path"),
  paginationStopShortPage: document.querySelector("#pagination-stop-short-page"),
  runInterval: document.querySelector("#run-interval"),
  runTimeout: document.querySelector("#run-timeout"),
  runButton: document.querySelector("#run-job-button"),
  stopButton: document.querySelector("#stop-job-button"),
  openReportButton: document.querySelector("#open-report-button"),
  openAnalyzerButton: document.querySelector("#open-analyzer-button"),
  reportTemplateSelect: document.querySelector("#report-template-select"),
  reportTemplateState: document.querySelector("#report-template-state"),
  openReportTemplateButton: document.querySelector("#open-report-template-button"),
  deleteReportTemplateButton: document.querySelector("#delete-report-template-button"),
  newProfileButton: document.querySelector("#new-profile-button"),
  saveProfileButton: document.querySelector("#save-profile-button"),
  saveAsProfileButton: document.querySelector("#save-as-profile-button"),
  deleteProfileButton: document.querySelector("#delete-profile-button"),
  exportProfileButton: document.querySelector("#export-profile-button"),
  importProfileButton: document.querySelector("#import-profile-button"),
  importFileInput: document.querySelector("#import-file-input"),
  jobStatusBadge: document.querySelector("#job-status-badge"),
  jobStatusMessage: document.querySelector("#job-status-message"),
  jobMetrics: document.querySelector("#job-metrics"),
  jobProgressBar: document.querySelector("#job-progress-bar"),
  toast: document.querySelector("#toast")
};

let profiles = [];
let reportTemplates = [];
let activeProfileId = null;
let currentConfig = createDefaultConfig();
let jobState = null;
let draftTimer = null;
let toastTimer = null;

initialize().catch((error) => {
  showToast(`初始化失败：${error.message}`);
});

async function initialize() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.profiles,
    STORAGE_KEYS.activeProfileId,
    STORAGE_KEYS.draft,
    STORAGE_KEYS.capturedRequest,
    STORAGE_KEYS.lastAppliedCaptureId,
    STORAGE_KEYS.reportTemplates
  ]);

  profiles = Array.isArray(stored[STORAGE_KEYS.profiles])
    ? stored[STORAGE_KEYS.profiles].map(normalizeConfig)
    : [];
  activeProfileId = stored[STORAGE_KEYS.activeProfileId] || null;
  reportTemplates = Array.isArray(stored[STORAGE_KEYS.reportTemplates])
    ? stored[STORAGE_KEYS.reportTemplates]
    : [];

  const savedDraft = stored[STORAGE_KEYS.draft];
  if (savedDraft) {
    currentConfig = normalizeConfig(savedDraft);
  } else {
    const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
    currentConfig = activeProfile ? clone(activeProfile) : createDefaultConfig();
  }

  applyConfig(currentConfig);
  renderProfileSelect();
  renderReportTemplateSelect();
  updateConditionalFields();
  bindEvents();

  const capture = stored[STORAGE_KEYS.capturedRequest];
  if (capture?.id && capture.id !== stored[STORAGE_KEYS.lastAppliedCaptureId]) {
    await applyNetworkCapture(capture);
  }

  await refreshJobState();
}

function bindEvents() {
  elements.configForm.addEventListener("input", handleFormInput);
  elements.configForm.addEventListener("change", handleFormInput);

  elements.profileSelect.addEventListener("change", async () => {
    await persistDraft(readConfig());
    activeProfileId = elements.profileSelect.value || null;
    const selected = profiles.find((profile) => profile.id === activeProfileId);
    currentConfig = selected ? clone(selected) : createDefaultConfig();
    applyConfig(currentConfig);
    updateConditionalFields();
    await chrome.storage.local.set({
      [STORAGE_KEYS.activeProfileId]: activeProfileId,
      [STORAGE_KEYS.draft]: currentConfig
    });
  });

  elements.newProfileButton.addEventListener("click", async () => {
    await persistDraft(readConfig());
    activeProfileId = null;
    currentConfig = createDefaultConfig();
    applyConfig(currentConfig);
    renderProfileSelect();
    updateConditionalFields();
    await chrome.storage.local.set({
      [STORAGE_KEYS.activeProfileId]: null,
      [STORAGE_KEYS.draft]: currentConfig
    });
    showToast("已创建新的配置草稿。");
  });

  elements.saveProfileButton.addEventListener("click", () => saveCurrentProfile(false));
  elements.saveAsProfileButton.addEventListener("click", () => saveCurrentProfile(true));
  elements.deleteProfileButton.addEventListener("click", deleteCurrentProfile);
  elements.exportProfileButton.addEventListener("click", exportCurrentProfile);
  elements.importProfileButton.addEventListener("click", () => elements.importFileInput.click());
  elements.importFileInput.addEventListener("change", importProfiles);
  elements.runButton.addEventListener("click", runJob);
  elements.stopButton.addEventListener("click", stopJob);
  elements.openReportButton.addEventListener("click", () => openReport(
    jobState?.datasetId || null,
    null
  ));
  elements.openAnalyzerButton.addEventListener("click", openAnalyzer);
  elements.openReportTemplateButton.addEventListener("click", () => {
    const template = reportTemplates.find(
      (item) => item.id === elements.reportTemplateSelect.value
    );
    if (template) {
      openReport(template.datasetId || null, template.id);
    }
  });
  elements.deleteReportTemplateButton.addEventListener("click", deleteSelectedReportTemplate);

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "JOB_STATE") {
      jobState = message.state;
      renderJobState();
    }
    if (message?.type === "DATASET_UPDATED") {
      elements.jobMetrics.textContent = `数据集 ${message.datasetId} 已更新。`;
    }
    if (message?.type === "NETWORK_CAPTURE_SELECTED") {
      applyNetworkCapture(message.capture).catch((error) => {
        showToast(`载入网络请求失败：${error.message}`);
      });
    }
    if (message?.type === "REPORT_TEMPLATES_UPDATED") {
      chrome.storage.local.get(STORAGE_KEYS.reportTemplates).then((stored) => {
        reportTemplates = Array.isArray(stored[STORAGE_KEYS.reportTemplates])
          ? stored[STORAGE_KEYS.reportTemplates]
          : [];
        renderReportTemplateSelect();
      });
    }
  });
}

function handleFormInput() {
  currentConfig = readConfig();
  updateConditionalFields();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(async () => {
    await persistDraft(currentConfig);
  }, 180);
}

function readConfig() {
  return normalizeConfig({
    id: currentConfig.id || createId("profile"),
    name: elements.configName.value,
    request: {
      method: elements.requestMethod.value,
      url: elements.requestUrl.value,
      context: elements.requestContext.value,
      headersText: elements.requestHeaders.value,
      bodyMode: elements.requestBodyMode.value,
      bodyText: elements.requestBody.value
    },
    pagination: {
      enabled: elements.paginationEnabled.checked,
      type: elements.paginationType.value,
      target: elements.paginationTarget.value,
      pageParam: elements.paginationPageParam.value,
      sizeParam: elements.paginationSizeParam.value,
      cursorParam: elements.paginationCursorParam.value,
      pageSize: elements.paginationPageSize.value,
      startPage: elements.paginationStartPage.value,
      step: elements.paginationStep.value,
      startOffset: elements.paginationStartOffset.value,
      initialCursor: elements.paginationInitialCursor.value,
      maxPages: elements.paginationMaxPages.value,
      dataPath: elements.paginationDataPath.value,
      totalPath: elements.paginationTotalPath.value,
      pageCountPath: elements.paginationPageCountPath.value,
      hasNextPath: elements.paginationHasNextPath.value,
      nextCursorPath: elements.paginationNextCursorPath.value,
      dedupePath: elements.paginationDedupePath.value,
      stopOnShortPage: elements.paginationStopShortPage.checked
    },
    run: {
      intervalMs: elements.runInterval.value,
      timeoutMs: elements.runTimeout.value
    }
  });
}

function applyConfig(input) {
  const config = normalizeConfig(input);
  currentConfig = config;

  elements.configName.value = config.name;
  elements.requestMethod.value = config.request.method;
  elements.requestContext.value = config.request.context;
  elements.requestUrl.value = config.request.url;
  elements.requestHeaders.value = config.request.headersText;
  elements.requestBodyMode.value = config.request.bodyMode;
  elements.requestBody.value = config.request.bodyText;

  elements.paginationEnabled.checked = config.pagination.enabled;
  elements.paginationType.value = config.pagination.type;
  elements.paginationTarget.value = config.pagination.target;
  elements.paginationPageParam.value = config.pagination.pageParam;
  elements.paginationSizeParam.value = config.pagination.sizeParam;
  elements.paginationCursorParam.value = config.pagination.cursorParam;
  elements.paginationPageSize.value = config.pagination.pageSize;
  elements.paginationStartPage.value = config.pagination.startPage;
  elements.paginationStep.value = config.pagination.step;
  elements.paginationStartOffset.value = config.pagination.startOffset;
  elements.paginationInitialCursor.value = config.pagination.initialCursor;
  elements.paginationMaxPages.value = config.pagination.maxPages;
  elements.paginationDataPath.value = config.pagination.dataPath;
  elements.paginationTotalPath.value = config.pagination.totalPath;
  elements.paginationPageCountPath.value = config.pagination.pageCountPath;
  elements.paginationHasNextPath.value = config.pagination.hasNextPath;
  elements.paginationNextCursorPath.value = config.pagination.nextCursorPath;
  elements.paginationDedupePath.value = config.pagination.dedupePath;
  elements.paginationStopShortPage.checked = config.pagination.stopOnShortPage;

  elements.runInterval.value = config.run.intervalMs;
  elements.runTimeout.value = config.run.timeoutMs;
}

function updateConditionalFields() {
  const paginationEnabled = elements.paginationEnabled.checked;
  const paginationType = elements.paginationType.value;

  for (const field of elements.paginationFields.querySelectorAll("input, select, textarea")) {
    field.disabled = !paginationEnabled;
  }

  for (const field of document.querySelectorAll("[data-pagination-type]")) {
    const supportedTypes = String(field.dataset.paginationType).split(/\s+/);
    field.classList.toggle("is-hidden", !supportedTypes.includes(paginationType));
  }

  elements.pageParameterLabel.textContent = paginationType === "offset"
    ? "offset 参数名"
    : "页码参数名";
  elements.requestBody.disabled = elements.requestBodyMode.value === "none";
}

async function saveCurrentProfile(saveAsNew) {
  const inputConfig = readConfig();
  if (saveAsNew) {
    inputConfig.id = createId("profile");
  }

  const { config, errors } = validateConfig(inputConfig);
  if (errors.length) {
    showToast(errors[0]);
    return;
  }

  const saved = {
    ...config,
    id: config.id || createId("profile")
  };
  const existingIndex = profiles.findIndex((profile) => profile.id === saved.id);

  if (existingIndex >= 0) {
    profiles[existingIndex] = saved;
  } else {
    profiles.push(saved);
  }

  activeProfileId = saved.id;
  currentConfig = clone(saved);
  await Promise.all([
    persistProfiles(),
    chrome.storage.local.set({
      [STORAGE_KEYS.activeProfileId]: activeProfileId,
      [STORAGE_KEYS.draft]: saved
    })
  ]);
  renderProfileSelect();
  showToast(`已保存配置“${saved.name}”。`);
}

async function deleteCurrentProfile() {
  if (!activeProfileId) {
    currentConfig = createDefaultConfig();
    activeProfileId = null;
    applyConfig(currentConfig);
    renderProfileSelect();
    await chrome.storage.local.set({
      [STORAGE_KEYS.activeProfileId]: null,
      [STORAGE_KEYS.draft]: currentConfig
    });
    showToast("当前只是草稿，已重置。");
    return;
  }

  const profile = profiles.find((item) => item.id === activeProfileId);
  profiles = profiles.filter((item) => item.id !== activeProfileId);
  activeProfileId = profiles[0]?.id || null;
  currentConfig = profiles[0] ? clone(profiles[0]) : createDefaultConfig();
  applyConfig(currentConfig);
  renderProfileSelect();
  await Promise.all([
    persistProfiles(),
    chrome.storage.local.set({
      [STORAGE_KEYS.activeProfileId]: activeProfileId,
      [STORAGE_KEYS.draft]: currentConfig
    })
  ]);
  showToast(`已删除配置“${profile?.name || "未命名"}”。`);
}

async function exportCurrentProfile() {
  const config = readConfig();
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFileName(config.name)}.sso-data-bridge.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("配置已导出。");
}

async function importProfiles() {
  const [file] = elements.importFileInput.files || [];
  elements.importFileInput.value = "";
  if (!file) {
    return;
  }

  try {
    const raw = JSON.parse(await file.text());
    if ([
      "sso-data-bridge-dashboard-package",
      "sso-data-bridge-dashboard-only"
    ].includes(raw?.type)) {
      await importDashboardPackage(raw);
      return;
    }

    const imported = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.profiles)
        ? raw.profiles
        : [raw];

    const normalized = imported.map((item) => {
      const config = normalizeConfig(item);
      return {
        ...config,
        id: profiles.some((profile) => profile.id === config.id)
          ? createId("profile")
          : config.id
      };
    });

    if (!normalized.length) {
      throw new Error("文件中没有配置。");
    }

    profiles.push(...normalized);
    activeProfileId = normalized[0].id;
    currentConfig = clone(normalized[0]);
    applyConfig(currentConfig);
    await Promise.all([
      persistProfiles(),
      chrome.storage.local.set({
        [STORAGE_KEYS.activeProfileId]: activeProfileId,
        [STORAGE_KEYS.draft]: currentConfig
      })
    ]);
    renderProfileSelect();
    showToast(`已导入 ${normalized.length} 个配置。`);
  } catch (error) {
    showToast(`导入失败：${error.message}`);
  }
}

async function importDashboardPackage(packageData) {
  const dashboardOnly = packageData.type === "sso-data-bridge-dashboard-only";
  let requestConfig;
  let profileId;

  if (dashboardOnly) {
    const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
    if (!activeProfile) {
      throw new Error("仅看板规则不包含请求配置，请先选择或保存一个接口配置。");
    }
    requestConfig = clone(activeProfile);
    profileId = activeProfile.id;
  } else {
    if (!packageData.requestConfig) {
      throw new Error("看板规则中没有请求配置。");
    }
    const importedConfig = normalizeConfig(packageData.requestConfig);
    const existingProfile = profiles.find((profile) => profile.id === importedConfig.id);
    profileId = existingProfile ? createId("profile") : importedConfig.id;
    requestConfig = {
      ...importedConfig,
      id: profileId
    };
    profiles.push(requestConfig);
  }

  activeProfileId = profileId;
  currentConfig = clone(requestConfig);
  applyConfig(currentConfig);

  const importedTemplates = Array.isArray(packageData.templates)
    ? packageData.templates
    : packageData.template
      ? [packageData.template]
      : [];

  const normalizedTemplates = importedTemplates
    .filter((template) => template && typeof template === "object")
    .map((template) => ({
      ...template,
      id: reportTemplates.some((item) => item.id === template.id)
        ? createId("report")
        : template.id || createId("report"),
      datasetId: "",
      sourceProfileId: profileId,
      requestConfig: clone(requestConfig),
      createdAt: template.createdAt || Date.now(),
      updatedAt: Date.now()
    }));

  reportTemplates.push(...normalizedTemplates);
  const commonStored = await chrome.storage.local.get([
    STORAGE_KEYS.commonFilters,
    STORAGE_KEYS.chartThemes,
    STORAGE_KEYS.reportUiState
  ]);
  const storedCommonFilters = Array.isArray(commonStored[STORAGE_KEYS.commonFilters])
    ? commonStored[STORAGE_KEYS.commonFilters]
    : [];
  const importedCommonFilters = Array.isArray(packageData.commonFilters)
    ? packageData.commonFilters
    : packageData.commonFilters
      ? [packageData.commonFilters]
      : [];
  const mergedCommonFilters = normalizeCommonFiltersForStorage([
    ...storedCommonFilters,
    ...importedCommonFilters
  ], normalizedTemplates);
  const mergedChartThemes = saveCustomChartThemes(
    commonStored[STORAGE_KEYS.chartThemes],
    packageData.chartThemes
  );
  const reportUiState = {
    ...(commonStored[STORAGE_KEYS.reportUiState] || {}),
    ...(packageData.chartThemeId
      ? { chartThemeId: packageData.chartThemeId }
      : {})
  };
  await Promise.all([
    persistProfiles(),
    chrome.storage.local.set({
      [STORAGE_KEYS.activeProfileId]: activeProfileId,
      [STORAGE_KEYS.draft]: currentConfig,
      [STORAGE_KEYS.reportTemplates]: reportTemplates,
      [STORAGE_KEYS.commonFilters]: mergedCommonFilters,
      [STORAGE_KEYS.chartThemes]: mergedChartThemes,
      [STORAGE_KEYS.reportUiState]: reportUiState
    })
  ]);
  renderProfileSelect();
  renderReportTemplateSelect();
  chrome.runtime.sendMessage({
    type: "REPORT_TEMPLATES_UPDATED",
    templateId: normalizedTemplates[0]?.id || null
  }).catch(() => {});
  showToast(dashboardOnly
    ? `已导入 ${normalizedTemplates.length} 个当前看板模板和 ${mergedCommonFilters.length} 个常用条件。`
    : `已导入请求、${normalizedTemplates.length} 个报表模板和 ${mergedCommonFilters.length} 个常用条件。`);
}

async function runJob() {
  const { config, errors } = validateConfig(readConfig());
  if (errors.length) {
    showToast(errors[0]);
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (config.request.context === "tab" && !tab?.id) {
    showToast("没有找到可用于发送请求的当前标签页。");
    return;
  }

  currentConfig = config;
  await persistDraft(config);

  try {
    const response = await chrome.runtime.sendMessage({
      type: "START_JOB",
      config,
      tabId: tab?.id
    });
    if (!response?.ok) {
      throw new Error(response?.error || "任务启动失败。");
    }
    jobState = response.state;
    renderJobState();
    showToast("抓取任务已启动。");
  } catch (error) {
    showToast(`启动失败：${error.message}`);
  }
}

async function stopJob() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "STOP_JOB" });
    if (!response?.ok) {
      throw new Error(response?.error || "停止任务失败。");
    }
    jobState = response.state;
    renderJobState();
  } catch (error) {
    showToast(`停止失败：${error.message}`);
  }
}

async function openAnalyzer() {
  const response = await chrome.runtime.sendMessage({
    type: "OPEN_ANALYZER",
    datasetId: jobState?.datasetId || null
  });
  if (!response?.ok) {
    showToast(response?.error || "无法打开 JSON 工具。");
  }
}

async function openReport(datasetId, templateId) {
  const response = await chrome.runtime.sendMessage({
    type: "OPEN_REPORT",
    datasetId,
    templateId
  });
  if (!response?.ok) {
    showToast(response?.error || "无法打开分析看板。");
  }
}

async function deleteSelectedReportTemplate() {
  const templateId = elements.reportTemplateSelect.value;
  const template = reportTemplates.find((item) => item.id === templateId);
  if (!template) {
    return;
  }
  if (!confirm(`确定删除报表模板“${template.name || "未命名"}”吗？`)) {
    return;
  }

  reportTemplates = reportTemplates.filter((item) => item.id !== templateId);
  await chrome.storage.local.set({
    [STORAGE_KEYS.reportTemplates]: reportTemplates
  });
  renderReportTemplateSelect();
  chrome.runtime.sendMessage({
    type: "REPORT_TEMPLATES_UPDATED",
    templateId: null
  }).catch(() => {});
  showToast("报表模板已删除。");
}

async function refreshJobState() {
  const response = await chrome.runtime.sendMessage({ type: "GET_JOB_STATE" });
  if (response?.ok) {
    jobState = response.state;
    renderJobState();
  } else {
    renderJobState();
  }
}

function renderProfileSelect() {
  elements.profileSelect.replaceChildren();

  if (!activeProfileId || !profiles.some((profile) => profile.id === activeProfileId)) {
    const draftOption = document.createElement("option");
    draftOption.value = "";
    draftOption.textContent = "未保存草稿";
    elements.profileSelect.append(draftOption);
  }

  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name || "未命名配置";
    elements.profileSelect.append(option);
  }

  elements.profileSelect.value = activeProfileId || "";
}

function renderReportTemplateSelect() {
  elements.reportTemplateSelect.replaceChildren();
  const sorted = [...reportTemplates].sort(
    (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
  );

  if (!sorted.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无报表模板";
    elements.reportTemplateSelect.append(option);
    elements.reportTemplateSelect.disabled = true;
    elements.openReportTemplateButton.disabled = true;
    elements.deleteReportTemplateButton.disabled = true;
    elements.reportTemplateState.textContent = "本地模板";
    return;
  }

  for (const template of sorted) {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name || "未命名模板";
    elements.reportTemplateSelect.append(option);
  }
  elements.reportTemplateSelect.disabled = false;
  elements.openReportTemplateButton.disabled = false;
  elements.deleteReportTemplateButton.disabled = false;
  elements.reportTemplateState.textContent = `${sorted.length} 个模板`;
}

function renderJobState() {
  const status = jobState?.status || "idle";
  const labels = {
    idle: "空闲",
    running: "运行中",
    stopping: "停止中",
    complete: "已完成",
    stopped: "已停止",
    error: "失败",
    interrupted: "已中断"
  };

  elements.jobStatusBadge.className = `status-badge status-${status}`;
  elements.jobStatusBadge.textContent = labels[status] || status;

  if (!jobState) {
    elements.jobStatusMessage.textContent = "当前没有运行中的任务。";
    elements.jobMetrics.textContent = "";
    elements.jobProgressBar.style.width = "0%";
    elements.runButton.disabled = false;
    elements.stopButton.disabled = true;
    return;
  }

  elements.jobStatusMessage.textContent = jobState.message || "任务状态已更新。";
  elements.jobMetrics.textContent = [
    `第 ${jobState.page || 0} / ${jobState.maxPages || 0} 页`,
    `保存 ${jobState.rowCount || 0} 条`,
    `接口返回 ${jobState.apiRowCount || 0} 条`
  ].join(" · ");

  let progress = 0;
  if (status === "complete") {
    progress = 100;
  } else if (jobState.total > 0) {
    progress = Math.min(100, ((jobState.apiRowCount || 0) / jobState.total) * 100);
  } else if (jobState.maxPages > 0) {
    progress = Math.min(100, ((jobState.page || 0) / jobState.maxPages) * 100);
  }
  elements.jobProgressBar.style.width = `${progress}%`;

  const isRunning = status === "running" || status === "stopping";
  elements.runButton.disabled = isRunning;
  elements.stopButton.disabled = !isRunning || status === "stopping";
}

async function persistProfiles() {
  await chrome.storage.local.set({ [STORAGE_KEYS.profiles]: profiles });
}

async function persistDraft(config) {
  currentConfig = config;
  await chrome.storage.local.set({ [STORAGE_KEYS.draft]: config });
  elements.draftState.textContent = "草稿已保存";
}

async function applyNetworkCapture(capture) {
  if (!capture?.request) {
    return;
  }

  const nextConfig = normalizeConfig({
    ...currentConfig,
    name: capture.name || currentConfig.name,
    request: capture.request,
    pagination: capture.pagination || currentConfig.pagination
  });

  applyConfig(nextConfig);
  updateConditionalFields();
  await Promise.all([
    persistDraft(nextConfig),
    chrome.storage.local.set({
      [STORAGE_KEYS.lastAppliedCaptureId]: capture.id
    })
  ]);
  elements.draftState.textContent = "已载入网络捕获";
  showToast(`已载入捕获请求：${nextConfig.name}`);
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function sanitizeFileName(value) {
  return String(value || "interface")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
