export const STORAGE_KEYS = {
  profiles: "ssoDataBridge.profiles",
  activeProfileId: "ssoDataBridge.activeProfileId",
  draft: "ssoDataBridge.draft",
  jobState: "ssoDataBridge.jobState",
  capturedRequest: "ssoDataBridge.capturedRequest",
  lastAppliedCaptureId: "ssoDataBridge.lastAppliedCaptureId",
  reportTemplates: "ssoDataBridge.reportTemplates",
  reportUiState: "ssoDataBridge.reportUiState",
  commonFilters: "ssoDataBridge.commonFilters",
  chartThemes: "ssoDataBridge.chartThemes"
};

export function createId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDefaultConfig() {
  return {
    id: createId("profile"),
    name: "新建接口",
    request: {
      method: "POST",
      url: "",
      context: "tab",
      headersText: '{\n  "Content-Type": "application/json"\n}',
      bodyMode: "json",
      bodyText: "{}"
    },
    pagination: {
      enabled: true,
      type: "page",
      target: "body",
      pageParam: "pageNum",
      sizeParam: "pageSize",
      cursorParam: "cursor",
      pageSize: 50,
      startPage: 1,
      step: 1,
      startOffset: 0,
      initialCursor: "",
      maxPages: 100,
      dataPath: "",
      totalPath: "",
      pageCountPath: "",
      hasNextPath: "",
      nextCursorPath: "",
      dedupePath: "",
      stopOnShortPage: true
    },
    run: {
      intervalMs: 250,
      timeoutMs: 30000
    }
  };
}

export function normalizeConfig(input = {}) {
  const defaults = createDefaultConfig();
  const request = input.request || {};
  const pagination = input.pagination || {};
  const run = input.run || {};

  return {
    id: String(input.id || defaults.id),
    name: String(input.name || defaults.name),
    request: {
      method: String(request.method || defaults.request.method).toUpperCase(),
      url: String(request.url || ""),
      context: request.context === "background" ? "background" : "tab",
      headersText: String(request.headersText ?? defaults.request.headersText),
      bodyMode: ["json", "text", "none"].includes(request.bodyMode)
        ? request.bodyMode
        : defaults.request.bodyMode,
      bodyText: String(request.bodyText ?? defaults.request.bodyText)
    },
    pagination: {
      enabled: pagination.enabled !== false,
      type: ["page", "offset", "cursor"].includes(pagination.type)
        ? pagination.type
        : defaults.pagination.type,
      target: ["body", "query", "header"].includes(pagination.target)
        ? pagination.target
        : defaults.pagination.target,
      pageParam: String(pagination.pageParam ?? defaults.pagination.pageParam),
      sizeParam: String(pagination.sizeParam ?? defaults.pagination.sizeParam),
      cursorParam: String(pagination.cursorParam ?? defaults.pagination.cursorParam),
      pageSize: positiveInteger(pagination.pageSize, defaults.pagination.pageSize),
      startPage: finiteInteger(pagination.startPage, defaults.pagination.startPage),
      step: nonzeroInteger(pagination.step, defaults.pagination.step),
      startOffset: finiteInteger(pagination.startOffset, defaults.pagination.startOffset),
      initialCursor: String(pagination.initialCursor ?? ""),
      maxPages: positiveInteger(pagination.maxPages, defaults.pagination.maxPages),
      dataPath: String(pagination.dataPath || ""),
      totalPath: String(pagination.totalPath || ""),
      pageCountPath: String(pagination.pageCountPath || ""),
      hasNextPath: String(pagination.hasNextPath || ""),
      nextCursorPath: String(pagination.nextCursorPath || ""),
      dedupePath: String(pagination.dedupePath || ""),
      stopOnShortPage: pagination.stopOnShortPage !== false
    },
    run: {
      intervalMs: nonnegativeInteger(run.intervalMs, defaults.run.intervalMs),
      timeoutMs: positiveInteger(run.timeoutMs, defaults.run.timeoutMs)
    }
  };
}

export function validateConfig(input) {
  const config = normalizeConfig(input);
  const errors = [];

  if (!config.name.trim()) {
    errors.push("配置名称不能为空。");
  }

  const absoluteUrl = /^https?:\/\//i.test(config.request.url);
  const relativeUrl = /^(\/|\.\/|\.\.\/)/.test(config.request.url);
  if (!absoluteUrl && !(relativeUrl && config.request.context === "tab")) {
    errors.push("接口 URL 必须是完整的 http(s) 地址；当前页面模式也支持以 / 开头的相对路径。");
  }

  try {
    const headers = parseJsonObject(config.request.headersText, "请求头", true);
    for (const [name, value] of Object.entries(headers)) {
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        errors.push(`请求头 ${name} 的值必须是字符串、数字或布尔值。`);
      }
      if (name.toLowerCase() === "cookie") {
        errors.push("不要在请求头中手工填写 Cookie，浏览器会通过当前页面或扩展会话自动携带。");
      }
    }
  } catch (error) {
    errors.push(error.message);
  }

  if (config.request.bodyMode === "json" && config.request.bodyText.trim()) {
    try {
      JSON.parse(config.request.bodyText);
    } catch (error) {
      errors.push(`请求体不是合法 JSON：${error.message}`);
    }
  }

  if (config.pagination.enabled) {
    if (config.pagination.type === "page" && !config.pagination.pageParam.trim()) {
      errors.push("页码参数名不能为空。");
    }
    if (config.pagination.type !== "cursor" && !config.pagination.sizeParam.trim()) {
      errors.push("每页条数参数名不能为空。");
    }
    if (config.pagination.type === "cursor" && !config.pagination.cursorParam.trim()) {
      errors.push("cursor 参数名不能为空。");
    }
    if (config.pagination.type === "cursor" && !config.pagination.nextCursorPath.trim()) {
      errors.push("cursor 模式下必须填写响应 cursor 路径。");
    }
    if (config.pagination.target === "body" && config.request.method === "GET") {
      errors.push("GET 请求不能把分页参数写入 JSON body，请改为 query 或 header。");
    }
    if (config.pagination.target === "body" && config.request.bodyMode !== "json") {
      errors.push("分页参数写入 body 时，请求体类型必须选择 JSON。");
    }
  }

  return { config, errors };
}

export function parseJsonObject(text, label = "JSON", allowEmpty = false) {
  const source = String(text ?? "").trim();
  if (!source && allowEmpty) {
    return {};
  }
  const value = JSON.parse(source);
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${label}必须是 JSON 对象。`);
  }
  return value;
}

function finiteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function positiveInteger(value, fallback) {
  const number = finiteInteger(value, fallback);
  return number > 0 ? number : fallback;
}

function nonnegativeInteger(value, fallback) {
  const number = finiteInteger(value, fallback);
  return number >= 0 ? number : fallback;
}

function nonzeroInteger(value, fallback) {
  const number = finiteInteger(value, fallback);
  return number !== 0 ? number : fallback;
}
