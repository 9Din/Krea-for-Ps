/* ============================================================================
 * api.js — Krea 官方 API 客户端
 *   文档/规格：https://www.krea.ai/docs/developers/introduction
 *              https://api.krea.ai/openapi.json
 *
 * 覆盖的端点：
 *   POST /generate/image/{model}          图像生成 / 编辑（35 个模型，见 models.js）
 *   POST /generate/enhance/{model}        放大 / 增强（9 个图像模型）
 *   POST /node-apps/{id}/execute          运行工作区 / 公开 App（自定义工作流）
 *   GET  /node-apps                       列出可运行的 App（含 input_openapi_schema）
 *   GET  /node-apps/{id}                  取单个 App 定义（含 schema）
 *   POST /assets                          上传图片（Agent 附件必须先变成可访问 URL）
 *   POST /agent/send-message              新建 / 继续 Agent 会话（可指定 LLM）
 *   POST /agent/wait-for-session          等待 Agent 本轮完成
 *   GET  /jobs/{id}                       任务状态与结果
 *   GET  /jobs                            生成历史（游标分页、状态过滤）
 *   DELETE /jobs/{id}                     删除生成历史
 * ========================================================================== */
window.KREA_API = (function () {
  "use strict";

  var BASE = "https://api.krea.ai";
  var DEFAULT_TIMEOUT = 300000;   // 5 分钟
  var POLL_TIMEOUT = 30000;       // 单次轮询
  var TERMINAL = { completed: 1, failed: 1, cancelled: 1 };
  var RUNNING = {
    backlogged: 1, queued: 1, scheduled: 1, processing: 1, sampling: 1, "intermediate-complete": 1
  };

  var token = null;
  function setToken(t) { token = t || null; }
  function hasToken() { return !!token; }

  /* ------------------------------------------------------------ 错误与请求 */
  function ApiError(message, status, code) {
    var e = new Error(message);
    e.name = "KreaApiError";
    e.status = status || 0;
    e.code = code || "api_error";
    return e;
  }

  function isAuthError(e) {
    return !!e && (e.status === 401 || e.code === "no_token");
  }

  /* Krea 的错误页是 HTML（<title> 里才是真正的原因），这里抽出来当消息 */
  function cleanBody(text) {
    var s = String(text || "");
    if (/^\s*</.test(s)) {
      var m = /<title>([^<]*)<\/title>/i.exec(s);
      if (m && m[1]) return m[1].trim().slice(0, 300);
      return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    }
    return s;
  }

  function bodyToMessage(status, text) {
    var raw = cleanBody(text);
    var msg = raw || ("HTTP " + status);
    try {
      var j = JSON.parse(text);
      if (j) {
        var det = j.details || j.errors || (j.error && j.error.details);
        var base = (j.error && (j.error.message || j.error)) || j.message || msg;
        if (typeof base !== "string") base = JSON.stringify(base);
        if (Array.isArray(det)) {
          var parts = [];
          det.forEach(function (d) {
            if (typeof d === "string") { parts.push(d); return; }
            if (d && typeof d === "object") {
              var f = d.field || (d.loc && d.loc.length ? d.loc[d.loc.length - 1] : null) || d.param;
              parts.push((f ? f + ": " : "") + (d.msg || d.message || JSON.stringify(d)));
            }
          });
          if (parts.length) base += " — " + parts.join("; ");
        } else if (det && typeof det === "object") {
          base += " — " + JSON.stringify(det);
        }
        msg = base;
      }
    } catch (e) { /* keep raw text */ }
    return String(msg).slice(0, 600);
  }

  async function request(path, opts, timeoutMs) {
    opts = opts || {};
    if (!token) throw ApiError("尚未配置 Krea API Token", 0, "no_token");

    var ac = new AbortController();
    var ms = timeoutMs || DEFAULT_TIMEOUT;
    var timedOut = false;
    // 定时器要覆盖到响应体读完：只等响应头会让卡住的响应一直挂着。
    var timer = setTimeout(function () { timedOut = true; ac.abort(); }, ms);
    var headers = { Authorization: "Bearer " + token };
    if (opts.body) headers["Content-Type"] = "application/json";

    var res;
    try {
      res = await fetch(BASE + path, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: ac.signal
      });
    } catch (e) {
      clearTimeout(timer);
      if (timedOut || (e && (e.name === "AbortError" || /abort/i.test(String(e.message))))) {
        throw ApiError("Krea API 请求超时（" + Math.round(ms / 1000) + "s）", 0, "timeout");
      }
      throw ApiError("网络请求失败：" + (e && e.message ? e.message : String(e)), 0, "network");
    }

    var text = "";
    try {
      text = await res.text();
    } catch (e) {
      if (timedOut) {
        throw ApiError("Krea API 请求超时（" + Math.round(ms / 1000) + "s）", 0, "timeout");
      }
      throw ApiError("读取 Krea API 响应失败：" + (e && e.message ? e.message : String(e)), 0, "network");
    } finally {
      clearTimeout(timer);
    }
    if (timedOut) {
      throw ApiError("Krea API 请求超时（" + Math.round(ms / 1000) + "s）", 0, "timeout");
    }
    if (!res.ok) {
      var code = res.status === 401 ? "unauthorized" : res.status === 429 ? "rate_limited" : "http_" + res.status;
      var apiErr = ApiError("Krea API " + res.status + "：" + bodyToMessage(res.status, text), res.status, code);
      // Agent 在 403 时会返回 allowedModels，用它把“套餐不包含该 LLM”变成可操作提示。
      try {
        var detail = JSON.parse(text);
        if (detail && Array.isArray(detail.allowedModels)) apiErr.allowedModels = detail.allowedModels.slice();
        if (detail && typeof detail.code === "string") apiErr.apiCode = detail.code;
        if (detail && typeof detail.error === "string") apiErr.apiMessage = detail.error;
      } catch (e2) { /* 非 JSON 错误页 */ }
      throw apiErr;
    }
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) { return text; }
  }

  /* ------------------------------------------------------- 生成 / 执行 / 轮询 */
  function extractJobId(payload) {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload[0] && (payload[0].job_id || payload[0].id);
    return payload.job_id || payload.id || null;
  }

  async function generate(modelId, body) {
    var models = window.KREA_MODELS.models;
    var m = models[modelId];
    if (!m) throw ApiError("未知模型：" + modelId, 0, "bad_model");
    var out = await request(m.endpoint, { method: "POST", body: body }, DEFAULT_TIMEOUT);
    var id = extractJobId(out);
    if (!id) throw ApiError("Krea 未返回 job_id", 0, "no_job");
    return id;
  }

  /**
   * 运行 Node App。
   * OpenAPI 说明「Execute a node app by version ID」，列表里同时给出 id 与
   * node_app_version_id，因此先按 id 调用，404/400 时用版本 ID 重试一次。
   */
  async function executeApp(appId, body, versionId) {
    var tryOnce = async function (target) {
      var out = await request("/node-apps/" + encodeURIComponent(target) + "/execute", { method: "POST", body: body || {} }, DEFAULT_TIMEOUT);
      var id = extractJobId(out);
      if (!id) throw ApiError("App 未返回 job_id", 0, "no_job");
      return id;
    };
    try {
      return await tryOnce(appId);
    } catch (e) {
      if (versionId && versionId !== appId && (e.status === 404 || e.status === 400 || e.status === 422)) {
        return await tryOnce(versionId);
      }
      throw e;
    }
  }

  async function getJob(jobId) {
    return await request("/jobs/" + encodeURIComponent(jobId), {}, POLL_TIMEOUT);
  }

  /* ------------------------------------------------------- 生成历史 / 素材 */

  /**
   * 生成历史列表。
   *
   * GET /jobs 的 cursor 是 date-time 字符串（不是数字偏移），原样回传即可；
   * status 只接受 OpenAPI 声明的单个枚举值，因此「进行中」需要在客户端
   * 过滤多个运行态，不能拼成逗号列表。
   *
   * @param opts {limit, cursor, status, types}
   * @returns {Promise<{items:Array, next_cursor:string|null}>}
   */
  async function listJobs(opts) {
    opts = opts || {};
    var qs = ["limit=" + encodeURIComponent(opts.limit || 30)];
    if (opts.cursor) qs.push("cursor=" + encodeURIComponent(opts.cursor));
    if (opts.status) qs.push("status=" + encodeURIComponent(opts.status));
    if (opts.types) qs.push("types=" + encodeURIComponent(opts.types));
    var out = await request("/jobs?" + qs.join("&"), {}, 60000);
    return out || { items: [], next_cursor: null };
  }

  /** 删除一条生成历史。接口成功时可能返回空响应，因此不解析返回值。 */
  async function deleteJob(jobId) {
    await request("/jobs/" + encodeURIComponent(jobId), { method: "DELETE" }, 30000);
    return true;
  }

  /* 结果 URL 归一化：string[] | [{type,url}] | {k:url}
   * type:"model" 是原图，type:"preview" 是缩略图；生成历史页优先用 preview，
   * 这样下载到内存的 data URL 更小。 */
  function pickResultUrls(result) {
    if (!result || !result.urls) return { model: null, preview: null };
    var urls = result.urls;
    var model = null;
    var preview = null;

    if (Array.isArray(urls)) {
      for (var i = 0; i < urls.length; i++) {
        var u = urls[i];
        if (typeof u === "string") {
          if (!model) model = u;
        } else if (u && u.url) {
          if (u.type === "preview") {
            if (!preview) preview = u.url;
          } else if (!model) {
            model = u.url;
          }
        }
      }
    } else if (typeof urls === "object") {
      var keys = Object.keys(urls);
      if (urls.preview) preview = urls.preview;
      if (urls.model) model = urls.model;
      else if (keys.length) {
        for (var k = 0; k < keys.length; k++) {
          if (keys[k] !== "preview" && urls[keys[k]]) { model = urls[keys[k]]; break; }
        }
      }
    }

    return { model: model || preview, preview: preview };
  }

  function pickResultUrl(result) {
    return pickResultUrls(result).model;
  }

  /**
   * 轮询任务直到终态。
   * @param jobId
   * @param opts {intervalMs, timeoutMs, onTick(status, progress, elapsedMs), isCancelled()}
   * @returns {Promise<{urls:string[], raw:object}>}
   */
  async function waitForJob(jobId, opts) {
    opts = opts || {};
    var interval = opts.intervalMs || 2500;
    var deadline = Date.now() + (opts.timeoutMs || DEFAULT_TIMEOUT);
    var started = Date.now();
    for (;;) {
      if (opts.isCancelled && opts.isCancelled()) throw ApiError("已取消", 0, "cancelled");
      if (Date.now() > deadline) throw ApiError("任务超时，请重试", 0, "timeout");
      await new Promise(function (r) { setTimeout(r, interval); });
      var job = await getJob(jobId);
      var status = (job && job.status) || "unknown";
      if (opts.onTick) opts.onTick(status, job && job.progress, Date.now() - started);
      if (status === "completed") {
        var url = pickResultUrl(job.result);
        if (!url) throw ApiError("任务已完成但未返回图片地址", 0, "no_result");
        return { urls: collectUrls(job.result), primary: url, raw: job };
      }
      if (status === "failed" || status === "cancelled") {
        var err = (job.result && job.result.error) || job.error || {};
        var m = err.message || (typeof err === "string" ? err : "") || status;
        throw ApiError("任务 " + status + "：" + m, 0, "job_" + status);
      }
      if (!TERMINAL[status] && !RUNNING[status]) {
        // 未知状态：继续轮询，但放慢节奏
        interval = Math.min(interval * 2, 10000);
      }
    }
  }

  function collectUrls(result) {
    if (!result || !result.urls) return [];
    var urls = result.urls;
    if (Array.isArray(urls)) {
      return urls.map(function (u) { return typeof u === "string" ? u : (u && u.url); }).filter(Boolean);
    }
    if (typeof urls === "object") return Object.keys(urls).map(function (k) { return urls[k]; }).filter(Boolean);
    return [];
  }

  /* ----------------------------------------------------------- 结果下载 */
  var DOWNLOAD_ATTEMPTS = 3;

  /**
   * 下载结果图片。
   *
   * Krea 的任务结果放在对象存储上，网络抖动、连接被重置、5xx 都很常见；
   * 任务本身已经成功，不能因为一次 fetch 失败就让用户重跑（会重复扣费）。
   * 这里对可恢复错误做指数退避重试；4xx（签名过期 / 无权限）不重试。
   *
   * @param url
   * @param timeoutMs 单次尝试超时
   * @param opts {attempts, retryDelayMs}（测试或特殊场景可覆盖）
   */
  async function downloadBase64(url, timeoutMs, opts) {
    opts = opts || {};
    var attempts = Math.max(1, opts.attempts || DOWNLOAD_ATTEMPTS);
    var baseDelay = typeof opts.retryDelayMs === "number" ? opts.retryDelayMs : 800;
    var perTry = timeoutMs || 60000;
    var last = null;

    for (var attempt = 1; attempt <= attempts; attempt++) {
      var ac = new AbortController();
      var timer = setTimeout(function () { ac.abort(); }, perTry);
      try {
        var res = await fetch(url, { signal: ac.signal });
        if (!res.ok) {
          var httpErr = ApiError("下载生成结果失败：" + res.status, res.status, "download");
          httpErr.retryable = res.status === 408 || res.status === 425 ||
            res.status === 429 || res.status >= 500;
          throw httpErr;
        }
        var buf = await res.arrayBuffer();
        var bytes = new Uint8Array(buf);
        if (!bytes.length) throw ApiError("下载生成结果失败：服务器返回空文件", 0, "download");
        var s = "";
        for (var i = 0; i < bytes.length; i += 8192) {
          s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length)));
        }
        return btoa(s);
      } catch (e) {
        var err;
        if (e && e.name === "KreaApiError") {
          err = e;
        } else if (e && (e.name === "AbortError" || /abort/i.test(String(e.message)))) {
          err = ApiError("下载生成结果超时（" + Math.round(perTry / 1000) + "s）", 0, "download");
        } else {
          err = ApiError("下载生成结果失败：" + (e && e.message ? e.message : String(e)), 0, "download");
        }
        if (typeof err.retryable === "undefined") err.retryable = true;
        last = err;
        if (!err.retryable || attempt >= attempts) {
          last.attempts = attempt;
          last.url = url;
          throw last;
        }
      } finally {
        clearTimeout(timer);
      }
      await new Promise(function (r) {
        setTimeout(r, Math.min(baseDelay * Math.pow(2, attempt - 1), 5000));
      });
    }
    throw last || ApiError("下载生成结果失败", 0, "download");
  }

  /**
   * Token 验证探针。
   * 用 /node-apps（任何有效 Key 都返回 200，且是插件功能本身需要的端点），
   * 不要用 /usage —— 它受套餐限制，会把有效 Key 误判为无效。
   */
  async function verifyToken() {
    var page = await request("/node-apps?limit=1", {}, 30000);
    return !!(page && Array.isArray(page.items));
  }

  /* -------------------------------------------------------------- App */
  async function listApps(opts) {
    opts = opts || {};
    var qs = [];
    qs.push("limit=" + (opts.limit || 100));
    if (opts.owner) qs.push("owner=" + encodeURIComponent(opts.owner));
    if (opts.cursor) qs.push("cursor=" + encodeURIComponent(opts.cursor));
    var out = await request("/node-apps?" + qs.join("&"), {}, 60000);
    return out || { items: [], next_cursor: null };
  }

  async function getApp(id) {
    return await request("/node-apps/" + encodeURIComponent(id), {}, 30000);
  }

  /* -------------------------------------------------------------- 资产上传
   * Agent 的 attachments 只接受可访问的 HTTP(S) URL 或 Krea 文件 URI，
   * 不能直接放本地 base64。这里用原生 multipart 请求把 PS 选区/上传图
   * 传到 /assets，拿回 image_url 后再作为附件发给 Agent。
   *
   * 不依赖 FormData / Blob：旧版 UXP 对这两个构造器的支持并不完整。
   */
  function base64ToBytes(base64) {
    var clean = String(base64 || "").replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
    if (!clean) return new Uint8Array(0);
    var bin = atob(clean);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function asciiBytes(text) {
    var s = String(text || "");
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
    return out;
  }

  function extensionForMime(mime) {
    var m = String(mime || "").toLowerCase();
    if (m.indexOf("jpeg") >= 0 || m.indexOf("jpg") >= 0) return "jpg";
    if (m.indexOf("webp") >= 0) return "webp";
    if (m.indexOf("gif") >= 0) return "gif";
    return "png";
  }

  function safeFileName(name, mime) {
    var ext = extensionForMime(mime);
    var raw = String(name || "image").replace(/\.[a-z0-9]+$/i, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
    if (!raw) raw = "image";
    return raw.slice(0, 80) + "." + ext;
  }

  async function uploadAsset(base64, mime, filename) {
    if (!token) throw ApiError("尚未配置 Krea API Token", 0, "no_token");
    var bytes = base64ToBytes(base64);
    if (!bytes.length) throw ApiError("图片为空，无法上传", 0, "empty_upload");
    var contentType = String(mime || "image/jpeg").toLowerCase();
    if (!/^image\//.test(contentType)) contentType = "image/jpeg";
    var boundary = "----KreaForPs" + Date.now().toString(16) + Math.random().toString(16).slice(2);
    var head = "--" + boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"file\"; filename=\"" + safeFileName(filename, contentType) + "\"\r\n" +
      "Content-Type: " + contentType + "\r\n\r\n";
    var tail = "\r\n--" + boundary + "--\r\n";
    var headBytes = asciiBytes(head);
    var tailBytes = asciiBytes(tail);
    var body = new Uint8Array(headBytes.length + bytes.length + tailBytes.length);
    body.set(headBytes, 0);
    body.set(bytes, headBytes.length);
    body.set(tailBytes, headBytes.length + bytes.length);

    var ac = new AbortController();
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; ac.abort(); }, 120000);
    var res;
    try {
      res = await fetch(BASE + "/assets", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "multipart/form-data; boundary=" + boundary
        },
        body: body.buffer,
        signal: ac.signal
      });
    } catch (e) {
      clearTimeout(timer);
      if (timedOut || (e && (e.name === "AbortError" || /abort/i.test(String(e.message))))) {
        throw ApiError("图片上传超时（120s）", 0, "timeout");
      }
      throw ApiError("图片上传失败：" + (e && e.message ? e.message : String(e)), 0, "network");
    }

    var text = "";
    try { text = await res.text(); } finally { clearTimeout(timer); }
    if (!res.ok) {
      var upErr = ApiError("图片上传失败（" + res.status + "）：" + bodyToMessage(res.status, text), res.status, "upload");
      throw upErr;
    }
    var out = null;
    try { out = text ? JSON.parse(text) : null; } catch (e) { out = null; }
    if (!out || !out.image_url) throw ApiError("图片上传成功但未返回可用链接", 0, "upload_no_url");
    return out;
  }

  /* -------------------------------------------------------------- Agent
   * Agent API 是会话 + 轮次模型：send-message 立即返回 sessionId/runId，
   * 再用 wait-for-session 等到本轮结束，从 text / media 读取结果。
   */
  async function sendAgentMessage(body) {
    return await request("/agent/send-message", { method: "POST", body: body || {} }, 180000);
  }

  async function waitForAgentSession(sessionId, runId, timeoutSeconds) {
    var seconds = Math.max(1, Math.min(300, Number(timeoutSeconds) || 60));
    var body = { sessionId: sessionId, timeoutSeconds: seconds };
    if (runId) body.runId = runId;
    // HTTP 超时必须比服务端等待时间长，否则会先被本地 AbortController 中断。
    return await request("/agent/wait-for-session", { method: "POST", body: body }, (seconds + 45) * 1000);
  }

  return {
    BASE: BASE,
    setToken: setToken,
    hasToken: hasToken,
    isAuthError: isAuthError,
    verifyToken: verifyToken,
    request: request,
    generate: generate,
    executeApp: executeApp,
    getJob: getJob,
    listJobs: listJobs,
    deleteJob: deleteJob,
    waitForJob: waitForJob,
    pickResultUrl: pickResultUrl,
    pickResultUrls: pickResultUrls,
    collectUrls: collectUrls,
    downloadBase64: downloadBase64,
    listApps: listApps,
    getApp: getApp,
    uploadAsset: uploadAsset,
    sendAgentMessage: sendAgentMessage,
    waitForAgentSession: waitForAgentSession,
    ApiError: ApiError
  };
})();
