import {
  deleteDataset,
  getDatasetBundle,
  listDatasets
} from "./lib/storage.js";

const elements = {
  datasetSelect: document.querySelector("#dataset-select"),
  datasetStatus: document.querySelector("#dataset-status"),
  lastUpdated: document.querySelector("#last-updated"),
  rowLimit: document.querySelector("#row-limit"),
  refreshButton: document.querySelector("#refresh-button"),
  openReportButton: document.querySelector("#open-report-button"),
  copyButton: document.querySelector("#copy-button"),
  downloadButton: document.querySelector("#download-button"),
  deleteButton: document.querySelector("#delete-button"),
  summary: document.querySelector("#summary"),
  jsonOutput: document.querySelector("#json-output"),
  toast: document.querySelector("#toast")
};

let datasets = [];
let currentDatasetId = new URLSearchParams(location.search).get("datasetId");
let currentPayload = null;
let reloadTimer = null;
let toastTimer = null;

initialize().catch((error) => {
  showToast(`读取数据失败：${error.message}`);
});

async function initialize() {
  elements.refreshButton.addEventListener("click", () => refresh());
  elements.openReportButton.addEventListener("click", openReport);
  elements.copyButton.addEventListener("click", copyPayload);
  elements.downloadButton.addEventListener("click", downloadPayload);
  elements.deleteButton.addEventListener("click", removeCurrentDataset);
  elements.datasetSelect.addEventListener("change", async () => {
    currentDatasetId = elements.datasetSelect.value || null;
    await refresh();
  });
  elements.rowLimit.addEventListener("change", () => refresh());

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SELECT_DATASET") {
      currentDatasetId = message.datasetId;
      refresh();
      return;
    }

    if (
      (message?.type === "DATASET_UPDATED" || message?.type === "DATASET_COMPLETE")
      && (!currentDatasetId || !message.datasetId || message.datasetId === currentDatasetId)
    ) {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => refresh(), 180);
    }
  });

  await refresh();
}

async function openReport() {
  if (!currentDatasetId) {
    showToast("当前没有可分析的数据集。");
    return;
  }
  const response = await chrome.runtime.sendMessage({
    type: "OPEN_REPORT",
    datasetId: currentDatasetId
  });
  if (!response?.ok) {
    showToast(response?.error || "无法打开数据分析工具。");
  }
}

async function refresh() {
  datasets = await listDatasets();

  if (!currentDatasetId || !datasets.some((dataset) => dataset.id === currentDatasetId)) {
    currentDatasetId = datasets[0]?.id || null;
  }

  renderDatasetSelect();

  if (!currentDatasetId) {
    currentPayload = {
      message: "尚无抓取结果。请先在扩展侧边栏运行一个接口任务。"
    };
    elements.datasetStatus.className = "status status-idle";
    elements.datasetStatus.textContent = "等待数据";
    elements.lastUpdated.textContent = "";
    elements.deleteButton.disabled = true;
    renderSummary(null, 0);
    renderJson();
    return;
  }

  const limit = Math.max(1, Number(elements.rowLimit.value) || 300);
  const bundle = await getDatasetBundle(currentDatasetId, limit);
  if (!bundle) {
    currentDatasetId = null;
    await refresh();
    return;
  }

  currentPayload = buildPayload(bundle);
  elements.datasetStatus.className = `status status-${bundle.status || "idle"}`;
  elements.datasetStatus.textContent = statusLabel(bundle.status);
  elements.lastUpdated.textContent = `更新于 ${formatDate(bundle.updatedAt)}`;
  elements.deleteButton.disabled = false;
  renderSummary(bundle, bundle.rows.length);
  renderJson();
}

function buildPayload(bundle) {
  return {
    dataset: {
      id: bundle.id,
      name: bundle.name,
      status: bundle.status,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
      rowCount: bundle.rowCount,
      pageCount: bundle.pageCount,
      error: bundle.error
    },
    request: bundle.request,
    pagination: bundle.pagination,
    result: {
      returnedRows: bundle.rows.length,
      totalRows: bundle.rowCount,
      truncated: bundle.truncated
    },
    pages: bundle.pages || [],
    rows: bundle.rows
  };
}

function renderDatasetSelect() {
  elements.datasetSelect.replaceChildren();

  if (!datasets.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无数据集";
    elements.datasetSelect.append(option);
    elements.datasetSelect.disabled = true;
    return;
  }

  elements.datasetSelect.disabled = false;
  for (const dataset of datasets) {
    const option = document.createElement("option");
    option.value = dataset.id;
    option.textContent = `${dataset.name || "未命名"} · ${dataset.rowCount || 0} 条 · ${formatDate(dataset.createdAt)}`;
    elements.datasetSelect.append(option);
  }
  elements.datasetSelect.value = currentDatasetId;
}

function renderSummary(bundle, displayedRows) {
  elements.summary.replaceChildren();
  if (!bundle) {
    elements.summary.append(createSummaryItem("数据集", "无"));
    return;
  }

  const items = [
    ["名称", bundle.name || "未命名"],
    ["状态", statusLabel(bundle.status)],
    ["总行数", bundle.rowCount || 0],
    ["页数", bundle.pageCount || 0],
    ["当前展示", displayedRows],
    ["截断", bundle.truncated ? "是" : "否"]
  ];

  for (const [label, value] of items) {
    elements.summary.append(createSummaryItem(label, value));
  }
}

function createSummaryItem(label, value) {
  const item = document.createElement("span");
  item.className = "summary-item";
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  item.append(strong, document.createTextNode(String(value)));
  return item;
}

function renderJson() {
  elements.jsonOutput.textContent = JSON.stringify(currentPayload, null, 2);
}

async function copyPayload() {
  if (!currentPayload) {
    return;
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2));
    showToast("当前展示的 JSON 已复制。");
  } catch (error) {
    showToast(`复制失败：${error.message}`);
  }
}

async function downloadPayload() {
  if (!currentDatasetId) {
    return;
  }

  elements.downloadButton.disabled = true;
  try {
    const fullBundle = await getDatasetBundle(currentDatasetId);
    const payload = buildPayload(fullBundle);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(fullBundle.name)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("完整 JSON 已开始下载。");
  } catch (error) {
    showToast(`下载失败：${error.message}`);
  } finally {
    elements.downloadButton.disabled = false;
  }
}

async function removeCurrentDataset() {
  if (!currentDatasetId) {
    return;
  }
  const dataset = datasets.find((item) => item.id === currentDatasetId);
  if (!confirm(`确定删除数据集“${dataset?.name || "未命名"}”吗？`)) {
    return;
  }

  await deleteDataset(currentDatasetId);
  currentDatasetId = null;
  await refresh();
  showToast("数据集已删除。");
}

function statusLabel(status) {
  const labels = {
    idle: "等待数据",
    running: "抓取中",
    complete: "已完成",
    stopped: "已停止",
    error: "失败",
    interrupted: "已中断"
  };
  return labels[status] || status || "未知";
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function sanitizeFileName(value) {
  return String(value || "dataset")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}
