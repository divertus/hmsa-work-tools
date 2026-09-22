import { normalizeConfig, STORAGE_KEYS } from "./lib/config.js";
import { appendChunk, createDataset, updateDataset } from "./lib/storage.js";

let activeJob = null;
let keepAliveTimer = null;
const recoveryPromise = recoverInterruptedJob();

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false;
  }

  if (message.type === "START_JOB") {
    startJob(message.config, message.tabId)
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "STOP_JOB") {
    stopJob()
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "GET_JOB_STATE") {
    getJobState()
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "OPEN_ANALYZER") {
    openAnalyzer(message.datasetId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "OPEN_REPORT") {
    openReport(message.datasetId, message.templateId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function startJob(inputConfig, sourceTabId) {
  await recoveryPromise;

  if (activeJob && !activeJob.finished) {
    throw new Error("已有抓取任务正在运行。");
  }

  const config = normalizeConfig(inputConfig);
  const datasetId = createRuntimeId("dataset");
  const jobId = createRuntimeId("job");
  let tabId = null;
  if (config.request.context === "tab") {
    tabId = await resolveSourceTabId(sourceTabId);
    if (!tabId) {
      throw new Error("没有找到用于发送请求的目标标签页。");
    }
    const tab = await chrome.tabs.get(tabId);
    if (/^(\/|\.\/|\.\.\/)/.test(config.request.url)) {
      config.request.url = new URL(config.request.url, tab.url).toString();
    }
  }

  activeJob = {
    id: jobId,
    datasetId,
    config,
    tabId,
    cancelled: false,
    controller: null,
    finished: false,
    promise: null
  };

  const initialState = {
    jobId,
    datasetId,
    name: config.name,
    status: "running",
    page: 0,
    maxPages: config.pagination.enabled ? config.pagination.maxPages : 1,
    rowCount: 0,
    apiRowCount: 0,
    pageCount: 0,
    total: null,
    startedAt: Date.now(),
    finishedAt: null,
    message: "正在准备请求。",
    error: null
  };
  await saveJobState(initialState);

  await createDataset({
    id: datasetId,
    name: config.name,
    request: publicRequest(config.request, tabId),
    requestConfig: config,
    sourceProfileId: config.id,
    pagination: config.pagination
  });
  broadcast({ type: "DATASET_UPDATED", datasetId, status: "running" });

  activeJob.promise = executeJob(activeJob).catch((error) => {
    console.error("SSO Data Bridge job failed", error);
  });

  return initialState;
}

async function stopJob() {
  if (!activeJob || activeJob.finished) {
    const state = await getJobState();
    return state;
  }

  activeJob.cancelled = true;
  activeJob.controller?.abort();
  const state = await getJobState();
  const nextState = {
    ...state,
    status: "stopping",
    message: "正在停止任务。"
  };
  await saveJobState(nextState);
  return nextState;
}

async function executeJob(job) {
  const { config, datasetId } = job;
  const state = await getJobState();
  const seenKeys = new Set();
  let pageIndex = 0;
  let cursor = config.pagination.initialCursor || null;
  let apiRowCount = 0;
  let rowCount = 0;
  let lastPageCount = null;
  let lastTotal = null;
  let lastHasNext = null;

  startKeepAlive();

  try {
    while (true) {
      if (job.cancelled) {
        throw new JobStoppedError();
      }

      const pageLabel = pageIndex + 1;
      const startedAt = Date.now();
      const request = buildRequest(config, pageIndex, cursor);
      await saveJobState({
        ...state,
        page: pageLabel,
        pageCount: pageIndex,
        rowCount,
        apiRowCount,
        total: lastTotal,
        message: `正在请求第 ${pageLabel} 页。`
      });

      const response = await executeRequest(request, config, job);
      const durationMs = Date.now() - startedAt;

      if (response.aborted) {
        throw new JobStoppedError();
      }

      if (!response.ok) {
        const responsePreview = String(response.body || "").trim().slice(0, 300);
        const details = response.error
          || `HTTP ${response.status || "未知"} ${response.statusText || ""}${responsePreview ? `：${responsePreview}` : ""}`.trim();
        throw new Error(details);
      }

      let responseJson;
      try {
        responseJson = JSON.parse(response.body);
      } catch (error) {
        if (looksLikeLoginPage(response)) {
          throw new Error("响应看起来是登录页，当前 SSO 会话可能已经过期。请重新登录目标网站后再运行。");
        }
        throw new Error(`响应不是合法 JSON：${error.message}`);
      }

      const extractedRows = extractRows(responseJson, config.pagination.dataPath);
      const nextCursor = getByPathSafely(responseJson, config.pagination.nextCursorPath);
      const total = toNullableNumber(getByPathSafely(responseJson, config.pagination.totalPath));
      const pageCount = toNullableNumber(getByPathSafely(responseJson, config.pagination.pageCountPath));
      const hasNext = toNullableBoolean(getByPathSafely(responseJson, config.pagination.hasNextPath));
      const acceptedRows = dedupeRows(extractedRows, config.pagination.dedupePath, seenKeys);

      const pageMetadata = {
        index: pageIndex,
        requestPage: getRequestPageValue(config.pagination, pageIndex),
        cursorUsed: cursor,
        url: response.url || request.url,
        status: response.status,
        durationMs,
        receivedCount: extractedRows.length,
        acceptedCount: acceptedRows.length,
        total,
        pageCount,
        hasNext,
        nextCursor: nextCursor ?? null
      };

      await appendChunk(datasetId, acceptedRows, pageMetadata, responseJson);
      apiRowCount += extractedRows.length;
      rowCount += acceptedRows.length;
      lastPageCount = pageCount;
      lastTotal = total;
      lastHasNext = hasNext;

      await saveJobState({
        ...state,
        page: pageLabel,
        pageCount: pageLabel,
        rowCount,
        apiRowCount,
        total,
        message: `已获取第 ${pageLabel} 页，共 ${acceptedRows.length} 条。`
      });
      broadcast({
        type: "DATASET_UPDATED",
        datasetId,
        status: "running",
        page: pageLabel,
        rowCount,
        pageCount: pageLabel
      });

      if (!config.pagination.enabled) {
        break;
      }

      const stopReason = getStopReason({
        pagination: config.pagination,
        pageIndex,
        receivedCount: extractedRows.length,
        accumulatedApiRows: apiRowCount,
        total,
        pageCount,
        hasNext,
        nextCursor
      });

      if (stopReason) {
        break;
      }

      if (config.pagination.type === "cursor") {
        cursor = nextCursor;
      }

      pageIndex += 1;
      await delay(config.run.intervalMs);
    }

    await updateDataset(datasetId, {
      status: "complete",
      error: null
    });
    const finalState = {
      ...(await getJobState()),
      status: "complete",
      rowCount,
      apiRowCount,
      total: lastTotal,
      finishedAt: Date.now(),
      message: `抓取完成，共保存 ${rowCount} 条数据。`,
      error: null
    };
    await saveJobState(finalState);
    broadcast({ type: "DATASET_COMPLETE", datasetId, state: finalState });
  } catch (error) {
    const stopped = error instanceof JobStoppedError || job.cancelled;
    const errorMessage = stopped ? "任务已手动停止。" : error.message;
    const status = stopped ? "stopped" : "error";

    await updateDataset(datasetId, {
      status,
      error: stopped ? null : errorMessage
    });

    const finalState = {
      ...(await getJobState()),
      status,
      rowCount,
      apiRowCount,
      total: lastTotal,
      finishedAt: Date.now(),
      message: errorMessage,
      error: stopped ? null : errorMessage
    };
    await saveJobState(finalState);
    broadcast({ type: "DATASET_COMPLETE", datasetId, state: finalState });
  } finally {
    stopKeepAlive();
    if (activeJob?.id === job.id) {
      activeJob.finished = true;
      activeJob = null;
    }
  }
}

function buildRequest(config, pageIndex, cursor) {
  const method = config.request.method.toUpperCase();
  const urlResult = protectUrlTokens(config.request.url);
  const url = new URL(urlResult.text);
  const headers = JSON.parse(config.request.headersText || "{}");
  let body;

  if (config.request.bodyMode === "json") {
    body = JSON.parse(config.request.bodyText || "{}");
  } else if (config.request.bodyMode === "text") {
    body = config.request.bodyText;
  }

  if (config.request.bodyMode === "json" && !hasHeader(headers, "Content-Type")) {
    headers["Content-Type"] = "application/json";
  }
  if (!hasHeader(headers, "Accept")) {
    headers.Accept = "application/json, text/plain, */*";
  }

  const pagination = config.pagination;
  if (pagination.enabled) {
    if (pagination.type === "page") {
      const pageValue = pagination.startPage + pageIndex * pagination.step;
      applyParameter({
        target: pagination.target,
        name: pagination.pageParam,
        value: pageValue,
        url,
        headers,
        body
      });
      applySizeParameter(pagination, url, headers, body);
    } else if (pagination.type === "offset") {
      const offset = pagination.startOffset + pageIndex * pagination.pageSize;
      applyParameter({
        target: pagination.target,
        name: pagination.pageParam,
        value: offset,
        url,
        headers,
        body
      });
      applySizeParameter(pagination, url, headers, body);
    } else if (pagination.type === "cursor") {
      if (cursor !== null && cursor !== undefined && cursor !== "") {
        applyParameter({
          target: pagination.target,
          name: pagination.cursorParam,
          value: cursor,
          url,
          headers,
          body
        });
      }
      applySizeParameter(pagination, url, headers, body);
    }
  }

  const finalUrl = urlResult.restore(url.toString());

  return {
    url: finalUrl,
    method,
    headers,
    bodyMode: config.request.bodyMode,
    body,
    credentials: "include",
    timeoutMs: config.run.timeoutMs
  };
}

function applySizeParameter(pagination, url, headers, body) {
  if (!pagination.sizeParam) {
    return;
  }
  applyParameter({
    target: pagination.target,
    name: pagination.sizeParam,
    value: pagination.pageSize,
    url,
    headers,
    body
  });
}

function applyParameter({ target, name, value, url, headers, body }) {
  if (!name) {
    return;
  }

  if (target === "query") {
    url.searchParams.set(name, String(value));
    return;
  }

  if (target === "header") {
    headers[name] = String(value);
    return;
  }

  if (body === undefined || body === null) {
    throw new Error(`分页参数 ${name} 需要写入 body，但当前请求没有 JSON body。`);
  }
  setByPath(body, name, value);
}

async function executeRequest(request, config, job) {
  if (config.request.context === "background") {
    return executeBackgroundRequest(request, job);
  }
  return executeRequestInTab(request, job.tabId);
}

async function executeBackgroundRequest(request, job) {
  const controller = new AbortController();
  job.controller = controller;
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);

  try {
    const resolvedRequest = resolveBackgroundRequest(request);
    const fetchOptions = {
      method: resolvedRequest.method,
      headers: resolvedRequest.headers,
      credentials: resolvedRequest.credentials,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal
    };

    if (!["GET", "HEAD"].includes(resolvedRequest.method) && resolvedRequest.body !== undefined) {
      fetchOptions.body = resolvedRequest.bodyMode === "json"
        ? JSON.stringify(resolvedRequest.body)
        : String(resolvedRequest.body);
    }

    const response = await fetch(resolvedRequest.url, fetchOptions);
    const body = await response.text();
    const responseHeaders = Object.fromEntries(response.headers.entries());
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: responseHeaders,
      body
    };
  } catch (error) {
    if (error.name === "AbortError") {
      return { ok: false, aborted: true, error: "请求被中止。" };
    }
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timer);
    if (job.controller === controller) {
      job.controller = null;
    }
  }
}

async function executeRequestInTab(request, tabId) {
  if (!tabId) {
    return { ok: false, error: "没有找到用于发送请求的目标标签页。" };
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: fetchFromPageContext,
      args: [request]
    });
    return results?.[0]?.result || { ok: false, error: "页面请求没有返回结果。" };
  } catch (error) {
    return {
      ok: false,
      error: `无法在当前页面执行请求：${error.message}`
    };
  }
}

async function fetchFromPageContext(request) {
  const getPath = (source, path) => {
    if (!path) {
      return source;
    }
    const parts = String(path)
      .replace(/\[(\w+)\]/g, ".$1")
      .split(".")
      .filter(Boolean);

    let current = source;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  };

  const getCookie = (name) => {
    const prefix = `${name}=`;
    const entry = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : "";
  };

  const queryDeep = (selector) => {
    const queue = [document];
    while (queue.length) {
      const root = queue.shift();
      const directMatch = root.querySelector?.(selector);
      if (directMatch) {
        return directMatch;
      }
      for (const element of root.querySelectorAll?.("*") || []) {
        if (element.shadowRoot) {
          queue.push(element.shadowRoot);
        }
      }
    }
    return null;
  };

  const getInputValue = (name) => {
    const escapedName = globalThis.CSS?.escape ? CSS.escape(name) : name.replace(/"/g, '\\"');
    const input = queryDeep(`input[name="${escapedName}"]`)
      || queryDeep(`[name="${escapedName}"]`);
    return input?.value ?? input?.textContent ?? "";
  };

  const resolveKnownToken = (expression) => {
    const separatorIndex = expression.indexOf(":");
    const kind = separatorIndex >= 0 ? expression.slice(0, separatorIndex).trim() : expression.trim();
    const argument = separatorIndex >= 0 ? expression.slice(separatorIndex + 1).trim() : "";

    if (kind === "timestamp") {
      return String(Date.now());
    }
    if (kind === "uuid") {
      return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    if (kind === "isoDate") {
      return new Date().toISOString();
    }
    if (kind === "date") {
      const date = new Date();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${date.getFullYear()}-${month}-${day}`;
    }
    if (kind === "meta") {
      const escapedName = globalThis.CSS?.escape ? CSS.escape(argument) : argument.replace(/"/g, '\\"');
      return document.querySelector(`meta[name="${escapedName}"]`)?.content || "";
    }
    if (kind === "input" || kind === "hidden") {
      return getInputValue(argument);
    }
    if (kind === "cookie") {
      return getCookie(argument);
    }
    if (kind === "localStorage") {
      return localStorage.getItem(argument) || "";
    }
    if (kind === "sessionStorage") {
      return sessionStorage.getItem(argument) || "";
    }
    if (kind === "global") {
      return getPath(globalThis, argument);
    }
    throw new Error(`页面模式不支持变量 {{${expression}}}。`);
  };

  const resolveString = (value) => {
    return value.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, expression) => {
      const resolved = resolveKnownToken(expression);
      if (resolved === undefined || resolved === null) {
        throw new Error(`变量 ${match} 没有取到值。`);
      }
      return String(resolved);
    });
  };

  const resolveValue = (value) => {
    if (typeof value === "string") {
      return resolveString(value);
    }
    if (Array.isArray(value)) {
      return value.map(resolveValue);
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, resolveValue(item)])
      );
    }
    return value;
  };

  try {
    const resolvedUrl = resolveString(request.url);
    const resolvedHeaders = Object.fromEntries(
      Object.entries(request.headers || {}).map(([key, value]) => [key, String(resolveValue(value))])
    );
    const resolvedBody = request.body === undefined ? undefined : resolveValue(request.body);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);

    const options = {
      method: request.method,
      headers: resolvedHeaders,
      credentials: "include",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal
    };

    if (!["GET", "HEAD"].includes(request.method) && resolvedBody !== undefined) {
      options.body = request.bodyMode === "json" ? JSON.stringify(resolvedBody) : String(resolvedBody);
    }

    let response;
    try {
      response = await globalThis.fetch(resolvedUrl, options);
    } finally {
      clearTimeout(timer);
    }

    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      body
    };
  } catch (error) {
    if (error.name === "AbortError") {
      return { ok: false, aborted: true, error: "请求被中止。" };
    }
    return { ok: false, error: error.message };
  }
}

function resolveBackgroundRequest(request) {
  return {
    ...request,
    url: resolveBackgroundValue(request.url),
    headers: resolveBackgroundValue(request.headers),
    body: resolveBackgroundValue(request.body)
  };
}

function resolveBackgroundValue(value) {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, expression) => {
      const normalized = expression.trim();
      if (normalized === "timestamp") {
        return String(Date.now());
      }
      if (normalized === "uuid") {
        return createRuntimeId("value");
      }
      if (normalized === "isoDate") {
        return new Date().toISOString();
      }
      if (normalized === "date") {
        return formatLocalDate(new Date());
      }
      throw new Error(`后台模式无法访问页面变量 ${match}。请把请求上下文切换为“当前页面”。`);
    });
  }
  if (Array.isArray(value)) {
    return value.map(resolveBackgroundValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveBackgroundValue(item)])
    );
  }
  return value;
}

function extractRows(responseJson, dataPath) {
  let value = dataPath ? getByPathSafely(responseJson, dataPath) : findPreferredArray(responseJson);

  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const nested = findPreferredArray(value);
    if (Array.isArray(nested)) {
      return nested;
    }
  }

  if (!dataPath && Array.isArray(responseJson)) {
    return responseJson;
  }

  const preview = JSON.stringify(responseJson).slice(0, 300);
  throw new Error(
    dataPath
      ? `响应路径 ${dataPath} 没有指向数组。响应片段：${preview}`
      : `无法自动识别响应中的数据数组，请在“响应数据路径”中填写实际路径。响应片段：${preview}`
  );
}

function findPreferredArray(value, depth = 0) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value || typeof value !== "object" || depth >= 3) {
    return undefined;
  }

  const preferredNames = [
    "rows",
    "list",
    "records",
    "items",
    "results",
    "content",
    "dataList",
    "data"
  ];

  for (const name of preferredNames) {
    if (Array.isArray(value[name])) {
      return value[name];
    }
    const nested = findPreferredArray(value[name], depth + 1);
    if (Array.isArray(nested)) {
      return nested;
    }
  }

  for (const item of Object.values(value)) {
    if (Array.isArray(item)) {
      return item;
    }
    const nested = findPreferredArray(item, depth + 1);
    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return undefined;
}

function dedupeRows(rows, path, seenKeys) {
  if (!path) {
    return rows;
  }

  const accepted = [];
  for (const row of rows) {
    const key = getByPathSafely(row, path);
    if (key === undefined || key === null || key === "") {
      accepted.push(row);
      continue;
    }
    const normalizedKey = `${typeof key}:${String(key)}`;
    if (seenKeys.has(normalizedKey)) {
      continue;
    }
    seenKeys.add(normalizedKey);
    accepted.push(row);
  }
  return accepted;
}

function getStopReason({
  pagination,
  pageIndex,
  receivedCount,
  accumulatedApiRows,
  total,
  pageCount,
  hasNext,
  nextCursor
}) {
  if (pageIndex + 1 >= pagination.maxPages) {
    return "max-pages";
  }
  if (receivedCount === 0) {
    return "empty-page";
  }
  if (hasNext === false) {
    return "has-next-false";
  }
  if (pagination.type === "cursor" && (nextCursor === null || nextCursor === undefined || nextCursor === "")) {
    return "cursor-ended";
  }
  if (total !== null && total !== undefined && accumulatedApiRows >= total) {
    return "total-reached";
  }
  if (
    pageCount !== null &&
    pageCount !== undefined &&
    pageIndex + 1 >= pageCount
  ) {
    return "page-count-reached";
  }
  if (
    pagination.type !== "cursor" &&
    pagination.stopOnShortPage &&
    hasNext === null &&
    receivedCount < pagination.pageSize
  ) {
    return "short-page";
  }
  return "";
}

function getByPathSafely(source, path) {
  if (!path || !source || typeof source !== "object") {
    return undefined;
  }

  const parts = String(path)
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  let current = source;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function setByPath(target, path, value) {
  const parts = String(path)
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    throw new Error("分页参数路径不能为空。");
  }

  let current = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts.at(-1)] = value;
}

function getRequestPageValue(pagination, pageIndex) {
  if (pagination.type === "page") {
    return pagination.startPage + pageIndex * pagination.step;
  }
  if (pagination.type === "offset") {
    return pagination.startOffset + pageIndex * pagination.pageSize;
  }
  return pageIndex + 1;
}

function protectUrlTokens(url) {
  const tokens = [];
  const text = String(url).replace(/\{\{[^{}]+?\}\}/g, (match) => {
    const index = tokens.push(match) - 1;
    return `__SSODB_TOKEN_${index}__`;
  });

  return {
    text,
    restore(value) {
      return value.replace(/__SSODB_TOKEN_(\d+)__/g, (match, index) => tokens[Number(index)] ?? match);
    }
  };
}

function hasHeader(headers, headerName) {
  const normalized = headerName.toLowerCase();
  return Object.keys(headers).some((name) => name.toLowerCase() === normalized);
}

function looksLikeLoginPage(response) {
  const contentType = response.headers?.["content-type"] || response.headers?.["Content-Type"] || "";
  const body = String(response.body || "").slice(0, 1000).toLowerCase();
  return contentType.includes("text/html")
    || body.includes("<form")
    || body.includes("login")
    || body.includes("sign in")
    || body.includes("登录");
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNullableBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }
  return null;
}

async function resolveSourceTabId(preferredTabId) {
  if (preferredTabId) {
    const numericTabId = Number(preferredTabId);
    if (Number.isInteger(numericTabId)) {
      return numericTabId;
    }
  }
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id || null;
}

function publicRequest(request, tabId) {
  return {
    method: request.method,
    url: request.url,
    context: request.context,
    bodyMode: request.bodyMode,
    tabId
  };
}

async function saveJobState(state) {
  await chrome.storage.session.set({ [STORAGE_KEYS.jobState]: state });
  broadcast({ type: "JOB_STATE", state });
  return state;
}

async function getJobState() {
  if (activeJob) {
    const stored = await chrome.storage.session.get(STORAGE_KEYS.jobState);
    return stored[STORAGE_KEYS.jobState] || null;
  }
  const stored = await chrome.storage.session.get(STORAGE_KEYS.jobState);
  return stored[STORAGE_KEYS.jobState] || null;
}

async function recoverInterruptedJob() {
  const stored = await chrome.storage.session.get(STORAGE_KEYS.jobState);
  const state = stored[STORAGE_KEYS.jobState];
  if (state && ["running", "stopping"].includes(state.status)) {
    const errorMessage = "扩展后台曾重新启动，任务已中断。请检查结果或重新运行。";
    const recovered = {
      ...state,
      status: "interrupted",
      message: errorMessage,
      error: errorMessage,
      finishedAt: Date.now()
    };
    await chrome.storage.session.set({ [STORAGE_KEYS.jobState]: recovered });
    if (state.datasetId) {
      try {
        await updateDataset(state.datasetId, {
          status: "interrupted",
          error: errorMessage
        });
      } catch {
        // The job may have been interrupted before its dataset was created.
      }
    }
  }
}

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

async function openAnalyzer(datasetId) {
  const analyzerUrl = chrome.runtime.getURL("analyzer.html");
  let existingTabs = [];
  try {
    existingTabs = await chrome.tabs.query({ url: `${analyzerUrl}*` });
  } catch {
    existingTabs = [];
  }

  if (existingTabs.length) {
    const tab = existingTabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({
      url: datasetId
        ? `${analyzerUrl}?datasetId=${encodeURIComponent(datasetId)}`
        : analyzerUrl
    });
  }

  if (datasetId) {
    setTimeout(() => {
      broadcast({ type: "SELECT_DATASET", datasetId });
    }, 150);
  }
}

async function openReport(datasetId, templateId) {
  const reportUrl = chrome.runtime.getURL("report.html");
  const query = new URLSearchParams();
  if (datasetId) {
    query.set("datasetId", datasetId);
  }
  if (templateId) {
    query.set("templateId", templateId);
  }
  const targetUrl = query.size ? `${reportUrl}?${query}` : reportUrl;
  let existingTabs = [];
  try {
    existingTabs = await chrome.tabs.query({ url: `${reportUrl}*` });
  } catch {
    existingTabs = [];
  }

  if (existingTabs.length) {
    const tab = existingTabs[0];
    await chrome.tabs.update(tab.id, { active: true, url: targetUrl });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: targetUrl });
  }

  setTimeout(() => {
    broadcast({
      type: "OPEN_REPORT_CONTEXT",
      datasetId: datasetId || null,
      templateId: templateId || null
    });
  }, 150);
}

function createRuntimeId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatLocalDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function delay(milliseconds) {
  if (!milliseconds) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function startKeepAlive() {
  stopKeepAlive();
  keepAliveTimer = setInterval(() => {
    chrome.runtime.getPlatformInfo().catch(() => {});
  }, 20000);
}

function stopKeepAlive() {
  if (keepAliveTimer !== null) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

class JobStoppedError extends Error {
  constructor() {
    super("任务已手动停止。");
    this.name = "JobStoppedError";
  }
}
