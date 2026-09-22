import { createDefaultConfig, STORAGE_KEYS } from "./lib/config.js";

const MAX_RECORDS = 1200;
const MAX_RENDERED_ROWS = 600;
const MAX_DETAIL_CHARS = 120000;

const elements = {
  captureState: document.querySelector("#capture-state"),
  refreshButton: document.querySelector("#refresh-button"),
  clearButton: document.querySelector("#clear-button"),
  searchInput: document.querySelector("#search-input"),
  typeFilter: document.querySelector("#type-filter"),
  hideOptions: document.querySelector("#hide-options"),
  requestCount: document.querySelector("#request-count"),
  tableBody: document.querySelector("#request-table-body"),
  emptyState: document.querySelector("#empty-state"),
  detailTitle: document.querySelector("#detail-title"),
  detailBadge: document.querySelector("#detail-badge"),
  detailMeta: document.querySelector("#detail-meta"),
  detailContent: document.querySelector("#detail-content"),
  applyButton: document.querySelector("#apply-button"),
  applyState: document.querySelector("#apply-state"),
  tabs: [...document.querySelectorAll(".tab")],
  toast: document.querySelector("#toast")
};

const records = new Map();
let selectedId = null;
let selectedRecord = null;
let activeDetailView = "request";
let inferredCapture = null;
let toastTimer = null;

initialize();

function initialize() {
  applyTheme(chrome.devtools.panels.themeName);

  elements.refreshButton.addEventListener("click", loadCurrentHar);
  elements.clearButton.addEventListener("click", clearRecords);
  elements.searchInput.addEventListener("input", renderRequestTable);
  elements.typeFilter.addEventListener("change", renderRequestTable);
  elements.hideOptions.addEventListener("change", renderRequestTable);
  elements.applyButton.addEventListener("click", applySelectedRequest);

  for (const tab of elements.tabs) {
    tab.addEventListener("click", () => {
      activeDetailView = tab.dataset.view;
      updateTabs();
      renderDetailContent();
    });
  }

  chrome.devtools.network.onRequestFinished.addListener((entry) => {
    addEntry(entry);
    renderRequestTable();
  });

  loadCurrentHar();
}

function loadCurrentHar() {
  elements.captureState.textContent = "正在读取当前 Network 日志。";
  chrome.devtools.network.getHAR((har) => {
    const entries = har?.entries || [];
    for (const entry of entries) {
      addEntry(entry);
    }
    elements.captureState.textContent = "监听中。执行页面查询后，请求会实时加入列表。";
    renderRequestTable();
  });
}

function addEntry(entry) {
  if (!entry?.request?.url) {
    return;
  }

  const id = getEntryId(entry);
  records.set(id, {
    id,
    entry,
    addedAt: Date.now()
  });

  while (records.size > MAX_RECORDS) {
    records.delete(records.keys().next().value);
  }
}

function getEntryId(entry) {
  if (entry._requestId) {
    return entry._requestId;
  }
  return [
    entry.startedDateTime || "",
    entry.request?.method || "",
    entry.request?.url || "",
    entry.response?.status || ""
  ].join("|");
}

function renderRequestTable() {
  const filtered = getFilteredRecords();
  elements.tableBody.replaceChildren();
  elements.requestCount.textContent = `${filtered.length} 个请求`;
  elements.emptyState.hidden = filtered.length > 0;

  const fragment = document.createDocumentFragment();
  for (const record of filtered.slice(0, MAX_RENDERED_ROWS)) {
    const entry = record.entry;
    const row = document.createElement("tr");
    row.tabIndex = 0;
    row.classList.toggle("is-selected", record.id === selectedId);
    row.addEventListener("click", () => selectRecord(record.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectRecord(record.id);
      }
    });

    row.append(
      createTextCell(entry.request.method, `method method-${entry.request.method.toLowerCase()}`),
      createTextCell(String(entry.response?.status || "-"), statusClass(entry.response?.status)),
      createUrlCell(entry.request.url),
      createTypeCell(normalizeResourceType(entry)),
      createTextCell(formatBytes(getResponseSize(entry)), "numeric"),
      createTextCell(formatDuration(entry.time), "numeric")
    );
    fragment.append(row);
  }

  elements.tableBody.append(fragment);
  if (filtered.length > MAX_RENDERED_ROWS) {
    elements.captureState.textContent = `当前显示前 ${MAX_RENDERED_ROWS} 条，请使用 URL 过滤缩小范围。`;
  }
}

function getFilteredRecords() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const typeFilter = elements.typeFilter.value;
  const hideOptions = elements.hideOptions.checked;

  return [...records.values()]
    .filter(({ entry }) => {
      const method = String(entry.request?.method || "").toUpperCase();
      if (hideOptions && method === "OPTIONS") {
        return false;
      }

      const url = String(entry.request?.url || "");
      if (query && !url.toLowerCase().includes(query)) {
        return false;
      }

      const type = normalizeResourceType(entry);
      if (typeFilter === "api") {
        return ["xhr", "fetch", "json"].includes(type);
      }
      if (typeFilter !== "all") {
        return type === typeFilter;
      }
      return true;
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.entry.startedDateTime || "") || a.addedAt;
      const bTime = Date.parse(b.entry.startedDateTime || "") || b.addedAt;
      return bTime - aTime;
    });
}

function selectRecord(id) {
  const record = records.get(id);
  if (!record) {
    return;
  }

  selectedId = id;
  selectedRecord = record;
  activeDetailView = "request";
  inferredCapture = null;
  elements.applyState.textContent = "";
  updateTabs();
  renderRequestTable();
  renderDetail();

  ensureResponseContent(record).then(() => {
    if (selectedId === id) {
      renderDetailContent();
    }
  });
}

function renderDetail() {
  const entry = selectedRecord?.entry;
  elements.detailMeta.replaceChildren();

  if (!entry) {
    elements.detailTitle.textContent = "尚未选择请求";
    elements.detailBadge.className = "badge badge-muted";
    elements.detailBadge.textContent = "未选择";
    elements.applyButton.disabled = true;
    elements.detailContent.textContent = "请选择一条请求。";
    return;
  }

  const status = entry.response?.status;
  elements.detailTitle.textContent = `${entry.request.method} ${getPathname(entry.request.url)}`;
  elements.detailBadge.className = `badge ${status >= 200 && status < 400 ? "badge-ok" : "badge-error"}`;
  elements.detailBadge.textContent = String(status || "无响应");
  elements.applyButton.disabled = false;

  appendMeta("URL", entry.request.url);
  appendMeta("Method", entry.request.method);
  appendMeta("Type", normalizeResourceType(entry));
  appendMeta("MIME", entry.response?.content?.mimeType || "-");
  appendMeta("Status", String(status || "-"));
  appendMeta("Size", formatBytes(getResponseSize(entry)));
  appendMeta("Duration", formatDuration(entry.time));

  renderDetailContent();
}

function appendMeta(label, value) {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.title = String(value);
  dd.textContent = String(value);
  elements.detailMeta.append(dt, dd);
}

function renderDetailContent() {
  if (!selectedRecord) {
    elements.detailContent.textContent = "请选择一条请求。";
    return;
  }

  const { entry } = selectedRecord;
  if (activeDetailView === "request") {
    const requestBody = getRequestBody(entry.request.postData);
    elements.detailContent.textContent = stringifyForDisplay({
      url: entry.request.url,
      method: entry.request.method,
      headers: getReplayHeaders(entry.request.headers),
      bodyMode: requestBody.mode,
      body: requestBody.text
    });
    return;
  }

  if (activeDetailView === "response") {
    if (!selectedRecord.responseLoaded) {
      elements.detailContent.textContent = "正在读取响应内容...";
      return;
    }
    const responseText = selectedRecord.responseText || "";
    elements.detailContent.textContent = formatResponseForDisplay(responseText);
    return;
  }

  if (!selectedRecord.responseLoaded) {
    elements.detailContent.textContent = "正在分析响应内容...";
    return;
  }

  inferredCapture = buildCapture(selectedRecord, selectedRecord.responseText || "");
  elements.detailContent.textContent = stringifyForDisplay(inferredCapture.pagination);
}

async function ensureResponseContent(record) {
  if (record.responseLoaded) {
    return record.responseText;
  }
  if (record.responsePromise) {
    return record.responsePromise;
  }

  record.responsePromise = new Promise((resolve) => {
    if (typeof record.entry.getContent !== "function") {
      record.responseLoaded = true;
      record.responseText = "";
      resolve("");
      return;
    }

    record.entry.getContent((content, encoding) => {
      record.responseLoaded = true;
      record.responseEncoding = encoding || "";
      record.responseText = content || "";
      resolve(record.responseText);
    });
  });

  return record.responsePromise;
}

async function applySelectedRequest() {
  if (!selectedRecord) {
    return;
  }

  elements.applyButton.disabled = true;
  elements.applyState.textContent = "正在解析并发送到侧边栏...";

  try {
    const responseText = await ensureResponseContent(selectedRecord);
    const capture = buildCapture(selectedRecord, responseText || "");
    inferredCapture = capture;

    await chrome.storage.local.set({
      [STORAGE_KEYS.capturedRequest]: capture,
      [STORAGE_KEYS.lastAppliedCaptureId]: null
    });

    try {
      await chrome.runtime.sendMessage({
        type: "NETWORK_CAPTURE_SELECTED",
        capture
      });
    } catch {
      // The side panel may be closed. The capture is already stored for next open.
    }

    elements.applyState.textContent = "已保存，侧边栏会载入这条配置。";
    activeDetailView = "inferred";
    updateTabs();
    renderDetailContent();
    showToast("请求已填入侧边栏配置。若侧边栏未打开，下次打开会自动载入。");
  } catch (error) {
    elements.applyState.textContent = `处理失败：${error.message}`;
  } finally {
    elements.applyButton.disabled = false;
  }
}

function buildCapture(record, responseText) {
  const { entry } = record;
  const requestHeaders = getReplayHeaders(entry.request.headers);
  const requestBody = getRequestBody(entry.request.postData);
  const responseJson = parseJson(responseText);
  const bodyObject = requestBody.mode === "json" ? parseJson(requestBody.text) : null;
  const urlObject = safeUrl(entry.request.url);

  const pagination = inferPagination({
    urlObject,
    requestHeaders,
    bodyObject,
    responseJson
  });

  return {
    id: createId("capture"),
    createdAt: Date.now(),
    name: suggestConfigName(entry.request.url),
    request: {
      method: entry.request.method,
      url: entry.request.url,
      context: "tab",
      headersText: JSON.stringify(requestHeaders, null, 2),
      bodyMode: requestBody.mode,
      bodyText: requestBody.text
    },
    pagination,
    responsePreview: responseText.slice(0, 2000),
    source: {
      startedDateTime: entry.startedDateTime,
      status: entry.response?.status,
      mimeType: entry.response?.content?.mimeType || "",
      resourceType: normalizeResourceType(entry)
    }
  };
}

function inferPagination({ urlObject, requestHeaders, bodyObject, responseJson }) {
  const defaults = createDefaultConfig().pagination;
  const body = bodyObject && typeof bodyObject === "object" ? bodyObject : {};
  const query = urlObject ? Object.fromEntries(urlObject.searchParams.entries()) : {};
  const containers = [
    { target: "query", data: query },
    { target: "body", data: body },
    { target: "header", data: requestHeaders }
  ];

  const pageCandidate = findField(containers, [
    "pagenum",
    "pageindex",
    "pageno",
    "page",
    "currentpage",
    "current"
  ], "number");
  const offsetCandidate = findField(containers, [
    "offset",
    "start",
    "skip"
  ], "number");
  const cursorCandidate = findField(containers, [
    "nextcursor",
    "nexttoken",
    "continuationtoken",
    "pagetoken",
    "cursor"
  ], "string");
  const sizeCandidate = findField(containers, [
    "pagesize",
    "page_size",
    "perpage",
    "per_page",
    "limit",
    "size",
    "rows"
  ], "number");

  let type = "page";
  let selectedCandidate = pageCandidate;
  if (cursorCandidate) {
    type = "cursor";
    selectedCandidate = cursorCandidate;
  } else if (offsetCandidate && sizeCandidate) {
    type = "offset";
    selectedCandidate = offsetCandidate;
  } else if (!pageCandidate) {
    type = "page";
    selectedCandidate = null;
  }

  const shape = inferResponseShape(responseJson);
  const target = selectedCandidate?.target || sizeCandidate?.target || defaults.target;
  const pageSize = sizeCandidate?.numericValue || defaults.pageSize;
  const enabled = Boolean(selectedCandidate);

  return {
    ...defaults,
    enabled,
    type,
    target,
    pageParam: type === "offset"
      ? (offsetCandidate?.key || "offset")
      : (pageCandidate?.key || defaults.pageParam),
    sizeParam: sizeCandidate?.key || defaults.sizeParam,
    cursorParam: cursorCandidate?.key || defaults.cursorParam,
    pageSize,
    startPage: pageCandidate?.numericValue ?? defaults.startPage,
    startOffset: offsetCandidate?.numericValue ?? defaults.startOffset,
    initialCursor: cursorCandidate?.stringValue || "",
    dataPath: shape.dataPath,
    totalPath: shape.totalPath,
    pageCountPath: shape.pageCountPath,
    hasNextPath: shape.hasNextPath,
    nextCursorPath: shape.nextCursorPath,
    dedupePath: shape.dedupePath,
    stopOnShortPage: true
  };
}

function inferResponseShape(value) {
  const arrays = [];
  const scalars = [];
  let visited = 0;

  function walk(node, path, depth, parentKey) {
    if (visited > 5000 || depth > 7 || node === null || node === undefined) {
      return;
    }
    visited += 1;

    if (Array.isArray(node)) {
      arrays.push({
        path,
        key: parentKey,
        length: node.length,
        depth
      });
      return;
    }

    if (typeof node !== "object") {
      scalars.push({
        path,
        key: parentKey,
        value: node,
        depth
      });
      return;
    }

    for (const [key, item] of Object.entries(node)) {
      walk(item, joinPath(path, key), depth + 1, key);
    }
  }

  walk(value, "", 0, "");

  const arrayScoring = {
    rows: 110,
    list: 105,
    records: 100,
    items: 98,
    results: 96,
    content: 94,
    datalist: 92,
    data: 85
  };
  arrays.sort((a, b) => {
    const scoreA = (arrayScoring[String(a.key).toLowerCase()] || 0) - a.depth;
    const scoreB = (arrayScoring[String(b.key).toLowerCase()] || 0) - b.depth;
    return scoreB - scoreA;
  });

  const bestArray = arrays[0];
  const firstRow = bestArray && findArrayByPath(value, bestArray.path)?.[0];

  return {
    dataPath: bestArray?.path || "",
    totalPath: findScalarPath(scalars, ["total", "totalcount", "totalelements", "totalrecords"]),
    pageCountPath: findScalarPath(scalars, ["totalpages", "pagecount", "totalpage"]),
    hasNextPath: findScalarPath(scalars, ["hasnext", "hasmore", "more"], "boolean"),
    nextCursorPath: findScalarPath(scalars, ["nextcursor", "nexttoken", "continuationtoken", "pagetoken", "cursor"]),
    dedupePath: inferDedupePath(firstRow)
  };
}

function findField(containers, names, expectedType) {
  const normalizedNames = names.map((name) => name.toLowerCase());

  for (const container of containers) {
    for (const [key, value] of Object.entries(container.data || {})) {
      const normalizedKey = key.toLowerCase();
      const nameIndex = normalizedNames.indexOf(normalizedKey);
      if (nameIndex < 0 || value === undefined || value === null || value === "") {
        continue;
      }

      if (expectedType === "number") {
        const number = Number(value);
        if (!Number.isFinite(number)) {
          continue;
        }
        return {
          ...container,
          key,
          value,
          numericValue: number
        };
      }

      if (expectedType === "string" && typeof value !== "string") {
        continue;
      }

      return {
        ...container,
        key,
        value,
        stringValue: String(value)
      };
    }
  }

  return null;
}

function findScalarPath(scalars, names, expectedType) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const candidates = scalars
    .filter((item) => {
      const nameIndex = normalizedNames.indexOf(String(item.key).toLowerCase());
      if (nameIndex < 0) {
        return false;
      }
      if (expectedType === "boolean" && typeof item.value !== "boolean") {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const indexA = normalizedNames.indexOf(String(a.key).toLowerCase());
      const indexB = normalizedNames.indexOf(String(b.key).toLowerCase());
      return indexA - indexB || a.depth - b.depth;
    });

  return candidates[0]?.path || "";
}

function inferDedupePath(firstRow) {
  if (!firstRow || typeof firstRow !== "object" || Array.isArray(firstRow)) {
    return "";
  }

  const keys = Object.keys(firstRow);
  const exact = ["id", "uuid", "key", "code"];
  for (const candidate of exact) {
    const match = keys.find((key) => key.toLowerCase() === candidate);
    if (match) {
      return match;
    }
  }

  const suffixMatch = keys.find((key) => key.toLowerCase().endsWith("id"));
  return suffixMatch || "";
}

function findArrayByPath(source, path) {
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

function getReplayHeaders(headers = []) {
  const blocked = new Set([
    "accept-encoding",
    "connection",
    "content-length",
    "cookie",
    "host",
    "origin",
    "referer",
    "user-agent"
  ]);
  const result = {};

  for (const header of headers) {
    const name = String(header.name || "");
    const normalizedName = name.toLowerCase();
    if (
      !name
      || normalizedName.startsWith(":")
      || normalizedName.startsWith("sec-")
      || normalizedName.startsWith("x-devtools")
      || blocked.has(normalizedName)
    ) {
      continue;
    }
    result[name] = String(header.value ?? "");
  }

  return result;
}

function getRequestBody(postData) {
  if (!postData) {
    return { mode: "none", text: "" };
  }

  if (postData.text) {
    const parsed = parseJson(postData.text);
    if (parsed !== null && typeof parsed === "object") {
      return {
        mode: "json",
        text: JSON.stringify(parsed, null, 2)
      };
    }
    return {
      mode: "text",
      text: postData.text
    };
  }

  if (Array.isArray(postData.params) && postData.params.length) {
    const encoded = postData.params
      .map((param) => {
        const name = encodeURIComponent(param.name || "");
        const value = encodeURIComponent(param.value ?? "");
        return `${name}=${value}`;
      })
      .join("&");
    return {
      mode: "text",
      text: encoded
    };
  }

  return { mode: "none", text: "" };
}

function normalizeResourceType(entry) {
  const resourceType = String(entry._resourceType || "").toLowerCase();
  if (resourceType) {
    return resourceType === "xmlhttprequest" ? "xhr" : resourceType;
  }

  const mimeType = String(entry.response?.content?.mimeType || "").toLowerCase();
  return mimeType.includes("json") ? "json" : "other";
}

function getResponseSize(entry) {
  const contentSize = Number(entry.response?.content?.size);
  if (Number.isFinite(contentSize) && contentSize >= 0) {
    return contentSize;
  }
  const bodySize = Number(entry.response?.bodySize);
  return Number.isFinite(bodySize) && bodySize >= 0 ? bodySize : -1;
}

function getPathname(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "-";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(milliseconds) {
  const value = Number(milliseconds);
  if (!Number.isFinite(value)) {
    return "-";
  }
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`;
}

function formatResponseForDisplay(responseText) {
  const parsed = parseJson(responseText);
  const display = parsed === null ? responseText : JSON.stringify(parsed, null, 2);
  if (display.length <= MAX_DETAIL_CHARS) {
    return display || "(空响应)";
  }
  return `${display.slice(0, MAX_DETAIL_CHARS)}\n\n... 已截断，共 ${display.length} 个字符 ...`;
}

function stringifyForDisplay(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseJson(text) {
  if (typeof text !== "string" || !text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function suggestConfigName(url) {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname
      .split("/")
      .filter(Boolean)
      .filter((part) => !/^v\d+$/i.test(part))
      .at(-1);
    return segment ? `接口 ${segment}` : `接口 ${parsed.hostname}`;
  } catch {
    return "捕获的接口";
  }
}

function createTextCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) {
    cell.className = className;
  }
  return cell;
}

function createUrlCell(url) {
  const cell = document.createElement("td");
  cell.textContent = getPathname(url);
  cell.title = url;
  return cell;
}

function createTypeCell(type) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = "type-badge";
  badge.textContent = type;
  cell.append(badge);
  return cell;
}

function statusClass(status) {
  if (!status) {
    return "";
  }
  return status >= 200 && status < 400 ? "status-ok" : "status-error";
}

function clearRecords() {
  records.clear();
  selectedId = null;
  selectedRecord = null;
  inferredCapture = null;
  renderRequestTable();
  renderDetail();
  elements.captureState.textContent = "列表已清空，仍会继续监听新的请求。";
}

function updateTabs() {
  for (const tab of elements.tabs) {
    tab.classList.toggle("is-active", tab.dataset.view === activeDetailView);
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}
