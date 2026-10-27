/* ============================================================================
 * main.js — Krea for Ps 面板控制器
 *
 * 要点
 *   · Apps 优先：主界面列出 Krea 的 Node Apps，表单由 GET /node-apps 返回的
 *     input_openapi_schema 自动生成。
 *   · 生成页直连模型：模型列表来自官方 OpenAPI（models.js），参数交给 Krea 智能填充。
 *   · 统一的「输入 → 提交 → 轮询 → 置入图层」管线。
 *   · Token 只由 KREA_STORE 管理（系统钥匙串 + 本地加密/混淆备份），本文件不落盘任何凭据。
 *   · UI 约束（踩过的坑，改代码前先读）：
 *       - 图标只能用 PNG <img>（icons/ui/**）。UXP 的 SVG 渲染器不可靠，
 *         内联 <svg> 在面板里会完全不显示。
 *       - 不要用 <select> / sp-picker 做选择器：原生 select 弹不出列表，
 *         sp-picker 对运行期添加的选项不生效。一律用 openPicker()（浮层 + div）。
 *       - 不要给「已插入 DOM」的 Spectrum 组件设置 innerHTML（不会重新渲染）；
 *         运行期新建的按钮在 append 之前设 innerHTML 是可以的。
 *       - 事件绑定必须在任何 await 之前完成（boot() 里先 bindEvents 再 loadData）。
 * ========================================================================== */
(function () {
  "use strict";

  var UXP = require("uxp");
  var shell = UXP.shell;
  var I18N = window.KREA_I18N;
  var T = I18N.t;
  var S = window.KREA_STORE;
  var API = window.KREA_API;
  var PS = window.KREA_PS;
  var MODELS = window.KREA_MODELS;

  var VERSION = "2.3.9";
  var TOKEN_PAGE = "https://krea.ai/settings/api-tokens";
  /* 关于页「联系我们」通过 Teams 深链打开作者对话，不需要额外权限。 */
  var AUTHOR_TEAMS_EMAIL = "zhiwei.feng@hba.com";
  var AUTHOR_TEAMS_CHAT_URL = "https://teams.microsoft.com/l/chat/0/0";
  /* 已保存 Token 在输入框里的固定掩码（30 个星号），不把真实值回填到 DOM。 */
  var TOKEN_MASK = "******************************";
  var KREA_ASSETS = "https://www.krea.ai/assets";
  /* 更新检查：仓库 main 分支的静态 update.json + GitHub Releases，不依赖服务器。
   * fetch 域名需同步写进 manifest.json 的 network.domains。 */
  var REPO_URL = "https://github.com/9Din/Krea-for-Ps";
  var RELEASES_URL = REPO_URL + "/releases";
  var UPDATE_URL = "https://raw.githubusercontent.com/9Din/Krea-for-Ps/main/update.json";
  var UPDATE_TIMEOUT = 8000;
  /* 官网精选 Apps 清单：仓库 main 分支的静态 JSON，官网新增/下架 App 时只需更新
   * 这个文件，不必重新发 .ccx。清单只包含数据，不执行任何远端代码。
   * 6 小时内复用本地缓存；手动点刷新则始终强制拉取最新版本。 */
  var FEATURED_APPS_URL = "https://raw.githubusercontent.com/9Din/Krea-for-Ps/main/featured-apps.json";
  var FEATURED_CACHE = "apps-featured.json";
  var FEATURED_TIMEOUT = 8000;
  var FEATURED_TTL = 6 * 60 * 60 * 1000;
  var APPS_CACHE = "apps-cache.json";
  var HISTORY_FILE = "history.json";
  var LIBRARY_FILE = "library.json";
  var HISTORY_LIMIT = 30;

  /* 运行框左侧的动态加载图：由 临时存放/loading.gif 提取的 8 帧（每帧 130ms）。
   * 不直接用 GIF，是因为 UXP 各版本对 GIF 动画的支持不一致；逐帧 PNG 最稳。 */
  var PROGRESS_GIF_FRAMES = [
    "./assets/loading/loading-0.png",
    "./assets/loading/loading-1.png",
    "./assets/loading/loading-2.png",
    "./assets/loading/loading-3.png",
    "./assets/loading/loading-4.png",
    "./assets/loading/loading-5.png",
    "./assets/loading/loading-6.png",
    "./assets/loading/loading-7.png"
  ];
  var PROGRESS_GIF_DELAY = 130;

  /*
   * 对话 Tab（chat）现在只承载 Krea Agent。
   * 图像生成统一放在「生成」Tab，使用完整的模型选择器；
   * Agent 模型列表见下方 AGENT_MODEL_GROUPS。
   */
  /* 兼容老用户配置里残留的 "image" / "banana" tab */
  var LEGACY_TAB_ALIAS = { image: "chat", banana: "chat" };

  /* Agent API 的 LLM 列表（2026-10 官方文档枚举）。
   * 这里只用于下拉框；服务端才是最终权限来源。若套餐不包含所选模型，
   * 403 会返回 allowedModels，主流程会提示并切回「自动选择」。 */
  var AGENT_MODEL_GROUPS = [
    { label: "OpenAI", items: [
      { id: "openai/gpt-6-astra", label: "GPT-6 Astra" },
      { id: "openai/gpt-6.1-sol", label: "GPT-6.1 Sol" },
      { id: "openai/gpt-6-sol", label: "GPT-6 Sol" },
      { id: "openai/gpt-6-luna", label: "GPT-6 Luna" },
      { id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol" },
      { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra" },
      { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna" },
      { id: "openai/gpt-5.5", label: "GPT-5.5" }
    ] },
    { label: "Anthropic", items: [
      { id: "anthropic/claude-opus-5.5", label: "Claude Opus 5.5" },
      { id: "anthropic/claude-opus-5", label: "Claude Opus 5" },
      { id: "anthropic/claude-fable-5.1", label: "Claude Fable 5.1" },
      { id: "anthropic/claude-fable-5", label: "Claude Fable 5" },
      { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8" },
      { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5" },
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
      { id: "anthropic/claude-opus-4.5", label: "Claude Opus 4.5" }
    ] },
    { label: "Google", items: [
      { id: "google/gemini-4-argon", label: "Gemini 4 Argon" },
      { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash" },
      { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
      { id: "google/gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
      { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
      { id: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
      { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" }
    ] },
    { label: "xAI / Others", items: [
      { id: "xai/grok-4.5", label: "Grok 4.5" },
      { id: "zai/glm-5.2", label: "GLM 5.2" },
      { id: "moonshotai/kimi-k3", label: "Kimi K3" }
    ] }
  ];
  var AGENT_MODEL_LABELS = {};
  AGENT_MODEL_GROUPS.forEach(function (g) {
    g.items.forEach(function (it) { AGENT_MODEL_LABELS[it.id] = it.label; });
  });
  var AGENT_SESSION_NAME = "Krea for Ps";
  var AGENT_WAIT_SECONDS = 60;
  var AGENT_MAX_WAIT_MS = 10 * 60 * 1000;

  /* ============================== st ============================== */
  var st = {
    prefs: null,
    screen: "setup",
    tab: "apps",
    model: MODELS.defaultModel,
    apps: [],
    customApps: [],
    appsFetchedAt: 0,
    appsError: null,
    appsCursor: null,
    appsHasMore: false,
    appsOffline: false,
    appsSource: "builtin",      // builtin | cache | remote | workspace
    appsManifestUpdatedAt: 0,
    appFilter: "all",           // all | fav | workspace
    hideAppsAll: false,         // true = 隐藏 Apps 的「全部」筛选
    hideAppsFav: false,         // true = 隐藏 Apps 的「收藏夹」筛选
    pendingPrompt: null,
    appQuery: "",
    currentApp: null,
    appForm: null,
    source: null,        // {base64,name}|{url,name,remote:true}
    refs: [],
    /* Krea Agent：sessionId 只在本次面板会话内保留；清空对话会结束这段上下文。 */
    agentModel: "",      // "" = Auto
    agentAllowed: null,  // 403 allowedModels 返回的白名单
    agentHistory: [],    // [{role:"user"|"assistant"|"error", text, model, ts, pending}]
    agentSessionId: null,
    agentRunId: null,
    /* 资产页：只展示 GET /jobs 的生成历史。
       缩略图先 fetch 成 data URL 再交给 <img>；thumbCache 只存在内存里，
       不发额外 API 请求，也不会写入磁盘。刷新面板 / 重启 PS / 重置全部数据
       都会释放它。 */
    assets: {
      items: [],
      cursor: null,
      hasMore: false,
      loading: false,
      loaded: false,
      // 本地任务失败但列表里没有对应卡片时置 true；下次进入做一次静默刷新。
      stale: false,
      error: "",
      seq: 0,            // 递增请求序号：丢弃重置前发出的过期响应
      thumbCache: {},    // "job:id" -> data:image/...;base64,...
      thumbFailed: {},
      thumbQueue: [],
      thumbQueued: {},
      thumbActive: 0,
      thumbEpoch: 0      // 清缓存时递增，旧请求完成后不得写回
    },
    history: [],
    library: {},
    libEditing: null,
    lastExportPath: "",  // 最近一次词库导出的完整路径，供“打开文件夹”使用
    genAgain: false,     // 生成成功后复用上一次抓图；按钮文案始终为「生成」
    lastSnapshot: null,  // 结果落位使用的文档 / 选区快照
    lastGenShot: null,   // 上一次实际送入模型的抓图（再次生成时复用，避免把结果层当输入）
    lastGenSelection: null,
    busy: false,
    cancelFlag: false,
    progressTimer: null,
    progressStartedAt: null,
    progressBase: "",
    progressGifTimer: null,
    progressGifFrame: 0,
    appRecovery: null
  };

  function $(id) { return document.getElementById(id); }

  /* ============================== 运行环境探测 ==============================
   */
  var HAS_SPECTRUM = false;
  try {
    HAS_SPECTRUM = !!(typeof customElements !== "undefined" && customElements.get && customElements.get("sp-button"));
  } catch (e) { HAS_SPECTRUM = false; }

  var NATIVE_MAP = {
    "sp-button": "button",
    "sp-action-button": "button",
    "sp-textfield": "input",
    "sp-textarea": "textarea",
    "sp-checkbox": "input",
    "sp-radio": "input",
    "sp-radio-group": "div",
    "sp-slider": "input",
    "sp-picker": "select",
    "sp-menu": "div",
    "sp-menu-item": "option",
    "sp-heading": "h3",
    "sp-body": "p",
    "sp-label": "span",
    "sp-field-label": "label",
    "sp-progress-circle": "div",
    "sp-progressbar": "div",
    "sp-divider": "div"
  };

  function nativeTag(tag) {
    if (HAS_SPECTRUM) return tag;
    return NATIVE_MAP[tag] || tag;
  }

  /*
   */
  function fatal(message) {
    try {
      var el = $("fatalBanner");
      if (!el) return;
      el.textContent = String(message || "").slice(0, 500);
      el.classList.remove("hidden");
    } catch (e) { /* ignore */ }
    console.error("[Krea for Ps]", message);
  }

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("error", function (ev) {
      fatal(T("boot.failed", { msg: (ev && (ev.message || ev.error)) ? String(ev.message || ev.error) : "unknown" }));
    });
    window.addEventListener("unhandledrejection", function (ev) {
      var r = ev && ev.reason;
      fatal(T("boot.failed", { msg: r && r.message ? r.message : String(r) }));
    });
  }

  /* 给可能挂起的 UXP 存储调用加超时，避免整个面板卡在启动阶段 */
  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error("timeout: " + (label || "storage")));
      }, ms || 8000);
      Promise.resolve(promise).then(function (v) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(v);
      }, function (e) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  /* ============================== DOM 工具 ============================== */
  function mk(tag, opts, children) {
    var el = document.createElement(nativeTag(tag));
    if (!HAS_SPECTRUM) {
if (tag === "sp-checkbox" || tag === "sp-radio") el.setAttribute("type", tag === "sp-radio" ? "radio" : "checkbox");
      else if (tag === "sp-slider") el.setAttribute("type", "range");
      else if (tag === "sp-textfield") el.setAttribute("type", (opts && opts.type) || "text");
      else if (tag === "sp-progress-circle") el.className = "k-spinner";
    }
    if (opts) {
      for (var k in opts) {
        if (!Object.prototype.hasOwnProperty.call(opts, k)) continue;
        var v = opts[k];
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "html") el.innerHTML = v;
        else if (k === "style") el.setAttribute("style", v);
        else if (k === "on") { for (var ev in v) el.addEventListener(ev, v[ev]); }
        else if (k === "props") { for (var p in v) el[p] = v[p]; }
        else if (k === "children") { /* handled below */ }
        else el.setAttribute(k, v);
      }
    }
    var kids = children || (opts && opts.children) || null;
    if (kids) {
      for (var i = 0; i < kids.length; i++) if (kids[i]) el.appendChild(kids[i]);
    }
    return el;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function collectByTag(tag) {
    var out = [];
    try {
      var list = document.getElementsByTagName(tag);
      for (var i = 0; i < list.length; i++) out.push(list[i]);
    } catch (e) { /* ignore */ }
    return out;
  }

  function copyAttrs(from, to, skip) {
    try {
      var attrs = from.attributes;
      for (var i = 0; i < attrs.length; i++) {
        var a = attrs[i];
        if (skip && skip.indexOf(a.name) >= 0) continue;
        try { to.setAttribute(a.name, a.value); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }

  function upgradeStaticDom() {
    if (HAS_SPECTRUM) return true;
    try { document.documentElement.classList.add("no-spectrum"); } catch (e) { /* ignore */ }

    var SKIP = ["selected", "checked", "value", "indeterminate", "quiet", "variant", "size"];

    collectByTag("sp-picker").forEach(function (node) {
      var sel = document.createElement("select");
      copyAttrs(node, sel, SKIP);
      sel.className = (node.className || "") + " k-select";
      var items = collectByTag("sp-menu-item");
      items.forEach(function (item) {
        var p = item.parentNode;
        var owned = false;
        while (p) { if (p === node) { owned = true; break; } p = p.parentNode; }
        if (!owned) return;
        var opt = document.createElement("option");
        opt.value = item.getAttribute("value") !== null ? item.getAttribute("value") : String(item.textContent || "").trim();
        opt.textContent = String(item.textContent || "").trim();
        if (item.hasAttribute("selected")) opt.selected = true;
        if (item.hasAttribute("disabled")) opt.disabled = true;
        sel.appendChild(opt);
      });
      if (node.parentNode) node.parentNode.replaceChild(sel, node);
    });

    collectByTag("sp-radio-group").forEach(function (node) {
      var wrap = document.createElement("div");
      wrap.className = "k-radio-group";
      copyAttrs(node, wrap, SKIP);
      var groupName = "kg-" + (node.id || ("g" + Math.floor(Math.random() * 1e6)));
      var items = collectByTag("sp-radio");
      items.forEach(function (item) {
        var owned = false;
        var p = item.parentNode;
        while (p) { if (p === node) { owned = true; break; } p = p.parentNode; }
        if (!owned) return;
        var label = document.createElement("label");
        label.className = "k-check";
        var input = document.createElement("input");
        input.setAttribute("type", "radio");
        input.setAttribute("name", groupName);
        input.setAttribute("value", item.getAttribute("value") || String(item.textContent || "").trim());
        if (item.hasAttribute("checked") || item.checked || item.getAttribute("selected") !== null) input.checked = true;
        var span = document.createElement("span");
        span.textContent = String(item.textContent || "").trim();
        var key = item.getAttribute("data-i18n");
        if (key) span.setAttribute("data-i18n", key);
        label.appendChild(input);
        label.appendChild(span);
        wrap.appendChild(label);
      });
      if (node.parentNode) node.parentNode.replaceChild(wrap, node);
    });

    collectByTag("sp-checkbox").forEach(function (node) {
      var wrap = document.createElement("label");
      wrap.className = "k-check";
      var input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      copyAttrs(node, input, SKIP);
      if (node.hasAttribute("checked") || node.checked) input.checked = true;
      var span = document.createElement("span");
      span.textContent = String(node.textContent || "").trim();
      var i18nKey = node.getAttribute && node.getAttribute("data-i18n");
      if (i18nKey) span.setAttribute("data-i18n", i18nKey);
      wrap.appendChild(input);
      wrap.appendChild(span);
      if (node.parentNode) node.parentNode.replaceChild(wrap, node);
    });

    collectByTag("sp-slider").forEach(function (node) {
      var input = document.createElement("input");
      input.setAttribute("type", "range");
      copyAttrs(node, input, SKIP);
      input.min = node.getAttribute("min") || "0";
      input.max = node.getAttribute("max") || "100";
      input.step = node.getAttribute("step") || "1";
      input.value = node.getAttribute("value") || "0";
      input.className = "k-range";
      if (node.parentNode) node.parentNode.replaceChild(input, node);
    });

    // textfield / textarea / button / heading / body / label / progress
    [["sp-textfield", "input"], ["sp-textarea", "textarea"], ["sp-button", "button"],
    ["sp-action-button", "button"], ["sp-heading", "h3"], ["sp-body", "p"],
    ["sp-label", "span"], ["sp-field-label", "label"], ["sp-progress-circle", "div"]].forEach(function (pair) {
      collectByTag(pair[0]).forEach(function (node) {
        var el = document.createElement(pair[1]);
        copyAttrs(node, el, SKIP);
        if (pair[1] === "input") el.setAttribute("type", node.getAttribute("type") || "text");
        // 把原有子节点搬过去：内联 <svg> 图标和文本都在这里，丢了就会变成空白按钮
        var hadChild = !!node.firstChild;
        while (node.firstChild) el.appendChild(node.firstChild);
        if (!hadChild && (pair[1] === "button")) {
          el.textContent = node.getAttribute("title") || node.getAttribute("aria-label") || "•";
        }
        if (pair[0] === "sp-progress-circle") el.className = "k-spinner";
        if (node.parentNode) node.parentNode.replaceChild(el, node);
      });
    });
    return true;
  }

  /* */
  function radioValue(host) {
    if (!host) return "";
    // 先读真正被选中的控件。setRadio 会把 value 写到组元素上，但用户
    // 手动点击后 UXP 不保证同步更新组元素的 value/selected，因此不能先读它。
    try {
      var inputs = host.querySelectorAll("input[type=radio]") || [];
      for (var i = 0; i < inputs.length; i++) if (inputs[i].checked) return inputs[i].value;
    } catch (e) { /* ignore */ }
    var kids = host.children || [];
    for (var j = 0; j < kids.length; j++) {
      var v = kids[j].getAttribute && kids[j].getAttribute("value");
      if (v && (kids[j].checked || kids[j].hasAttribute("checked"))) return v;
      var inner = kids[j].querySelector && kids[j].querySelector("input[type=radio]");
      if (inner && inner.checked) return inner.value;
    }
    // 最后才回退到组元素的 selected / value（部分 UXP 版本只暴露这两个）。
    try {
      if (typeof host.selected === "string" && host.selected) return host.selected;
      var selected = host.getAttribute && host.getAttribute("selected");
      if (selected) return selected;
      if (typeof host.value === "string" && host.value) return host.value;
    } catch (e2) { /* ignore */ }
    return "";
  }

  function setRadio(host, value) {
    if (!host) return;
    // 同时更新组元素和子项，兼容 Spectrum UXP 组件与 HTML 降级实现。
    try { host.selected = value; } catch (e) { /* ignore */ }
    try { if (host.setAttribute) host.setAttribute("selected", value); } catch (e2) { /* ignore */ }
    try { host.value = value; } catch (e3) { /* ignore */ }
    try {
      var inputs = host.querySelectorAll("input[type=radio]") || [];
      for (var i = 0; i < inputs.length; i++) inputs[i].checked = (inputs[i].value === value);
    } catch (e4) { /* ignore */ }
    var kids = host.children || [];
    for (var j = 0; j < kids.length; j++) {
      var v = kids[j].getAttribute && kids[j].getAttribute("value");
      if (v) {
        var on = v === value;
        if (on) kids[j].setAttribute("checked", "");
        else kids[j].removeAttribute("checked");
        try { kids[j].checked = on; } catch (e5) { /* ignore */ }
      }
    }
  }

  function textBtn(label, onClick, opts) {
    opts = opts || {};
    return mk("sp-button", {
      size: opts.size || "s",
      variant: opts.variant || "secondary",
      text: label,
      style: opts.style || "",
      on: { click: onClick }
    });
  }

  /** 纯文字入口：用于生成页页脚的「关于」，避免再多一个按钮 */
  function textLink(label, onClick) {
    var el = mk("span", {
      class: "footer-link",
      role: "link",
      tabindex: "0",
      text: label
    });
    var activate = function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      onClick();
    };
    el.addEventListener("click", activate);
    el.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") activate(ev);
    });
    return el;
  }

  /* ------------------------------------------------------------ 图标按钮
   */
  function iconSrc(name, theme) {
    return theme === "light" ? ("./icons/ui/light/" + name + ".png") : ("./icons/ui/dark/" + name + ".png");
  }

  var ICON_PX = 12;   // 面板内图标的统一显示尺寸（源图 24×24 = 2 倍图，必须显式缩放）

  function iconImgEl(name, size) {
    size = size || ICON_PX;
    return mk("img", {
      class: "k-icon i-" + name,
      "data-icon": name,
      src: iconSrc(name, isLightTheme() ? "light" : "dark"),
      // 只保留 HTML 属性作为兜底；实际显示尺寸统一由 app.css 的 img.k-icon 控制。
      width: String(size),
      height: String(size),
      alt: ""
    });
  }

  /**
   * 面板是否浅色主题。
   *
   * 不能只信 matchMedia：UXP 并不保证支持 prefers-color-scheme，
   * 有些版本会返回一个恒为 false 的 MediaQueryList；直接 return 会让
   * 浅色面板一直使用 dark（白色）图标。这里先读 UXP/Spectrum 暴露的
   * 背景色变量和实际计算背景，最后才用 matchMedia 兜底。
   */
  function isLightTheme() {
    function colorLum(value) {
      var s = String(value || "").trim();
      if (!s || s === "transparent") return null;
      var m = s.match(/^rgba?\(([^)]+)\)$/i);
      if (m) {
        var p = m[1].split(/[,\s\/]+/);
        var r = parseFloat(p[0]);
        var g = parseFloat(p[1]);
        var b = parseFloat(p[2]);
        var a = p.length > 3 ? parseFloat(p[3]) : 1;
        if (isNaN(r) || isNaN(g) || isNaN(b) || !(a > 0)) return null;
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }
      var h = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (h) {
        var x = h[1];
        if (x.length === 3) {
          x = x.charAt(0) + x.charAt(0) + x.charAt(1) + x.charAt(1) + x.charAt(2) + x.charAt(2);
        }
        return (0.299 * parseInt(x.slice(0, 2), 16) +
          0.587 * parseInt(x.slice(2, 4), 16) +
          0.114 * parseInt(x.slice(4, 6), 16)) / 255;
      }
      return null;
    }

    // UXP 官方主题变量优先；Spectrum 变量用于兼容旧版面板。
    try {
      var cs = window.getComputedStyle(document.documentElement);
      var bgVars = [
        "--uxp-host-background-color",
        "--spectrum-alias-background-color-default"
      ];
      for (var i = 0; i < bgVars.length; i++) {
        var bgLum = colorLum(cs.getPropertyValue(bgVars[i]));
        if (bgLum !== null) return bgLum > 0.55;
      }
      // 有些 PS 版本只暴露文字色：浅色主题是深色文字。
      var textVars = [
        "--uxp-host-text-color",
        "--spectrum-alias-text-color"
      ];
      for (var ti = 0; ti < textVars.length; ti++) {
        var varTextLum = colorLum(cs.getPropertyValue(textVars[ti]));
        if (varTextLum !== null) return varTextLum < 0.45;
      }
    } catch (e) { /* ignore */ }

    // 部分 UXP 版本支持 prefers-color-scheme，但变量和计算背景都拿不到。
    // 放在计算背景之前，避免我们自己写的深色兜底把结果锁死为 dark。
    try {
      if (window.matchMedia) {
        var mq = window.matchMedia("(prefers-color-scheme: light)");
        if (mq && typeof mq.matches === "boolean" &&
          String(mq.media || "").indexOf("not all") < 0) {
          return mq.matches;
        }
      }
    } catch (e4) { /* ignore */ }

    // 个别版本不返回主题变量，改读实际背景色。
    var nodes = [
      document.body,
      $("app"),
      document.querySelector ? document.querySelector(".header") : null,
      document.documentElement
    ];
    for (var j = 0; j < nodes.length; j++) {
      if (!nodes[j]) continue;
      try {
        var nodeLum = colorLum(window.getComputedStyle(nodes[j]).backgroundColor);
        if (nodeLum !== null) return nodeLum > 0.55;
      } catch (e2) { /* ignore */ }
    }

    // 背景全透明时（少见）用文字颜色再判断一次：
    // 浅色主题是深色文字，深色主题是浅色文字。
    for (var t = 0; t < nodes.length; t++) {
      if (!nodes[t]) continue;
      try {
        var textLum = colorLum(window.getComputedStyle(nodes[t]).color);
        if (textLum !== null && textLum < 0.45) return true;
        if (textLum !== null && textLum > 0.65) return false;
      } catch (e3) { /* ignore */ }
    }

    return false;
  }

  /**
   * 按当前主题刷新所有 PNG 图标。
   * 图标尺寸只由 app.css 的 img.k-icon 控制，这里不再写内联宽高。
   * 注意：不要用 CSS 的 `content: url()` 换图——UXP 的 CSS 支持列表里没有 content，
   * 部分版本会把替换后的图片按原始像素（96×96）画出来，正是「图标巨大」的元凶。
   */
  function applyIconTheme() {
    var theme = isLightTheme() ? "light" : "dark";
    var seen = [];

    // CSS 变量和图标共用同一套主题判断：浅色 PS 下整套面板变量会切到浅色值。
    try { document.documentElement.setAttribute("data-theme", theme); } catch (e0) { /* ignore */ }

    // 顶栏品牌图跟 manifest 的 PS 主题图标一致：浅色用 light.png，深色用 dark.png。
    var brand = $("brandIcon");
    if (brand) {
      var brandSrc = theme === "light" ? "icons/light.png" : "icons/dark.png";
      if (brand.getAttribute("src") !== brandSrc) {
        brand.setAttribute("src", brandSrc);
        try { brand.src = brandSrc; } catch (e1) { /* ignore */ }
      }
    }

    function applyOne(img) {
      if (!img || seen.indexOf(img) >= 0) return;
      seen.push(img);
      var cls = String(img.className || "");
      var isIcon = cls.indexOf("k-icon") >= 0;
      var name = img.getAttribute && img.getAttribute("data-icon");
      // 影子树里的副本可能只复制了 src、没有 data-icon；从路径反推图标名。
      if (!name && img.getAttribute) {
        var m = String(img.getAttribute("src") || "").match(/icons\/ui\/(?:dark|light)\/([^\/]+)\.png/i);
        if (m) {
          name = m[1];
          isIcon = true;
        }
      }
      if (!name || !isIcon) return;

      var src = iconSrc(name, theme);
      if (img.getAttribute("src") !== src) {
        img.setAttribute("src", src);
        // UXP 某些版本只监听 src property，不监听 attribute；两者都写一次。
        try { img.src = src; } catch (e) { /* ignore */ }
      }
    }

    function walk(root) {
      if (!root) return;
      var imgs = [];
      try { imgs = root.getElementsByTagName ? root.getElementsByTagName("img") : []; } catch (e) { imgs = []; }
      for (var i = 0; i < imgs.length; i++) applyOne(imgs[i]);

      // Spectrum 组件可能把图标放进开放影子树；普通 getElementsByTagName
      // 不会跨影子边界，这里递归补一遍（closed shadow root 无法访问）。
      var all = [];
      try { all = root.getElementsByTagName ? root.getElementsByTagName("*") : []; } catch (e2) { all = []; }
      for (var j = 0; j < all.length; j++) {
        var el = all[j];
        if (el && el.shadowRoot) walk(el.shadowRoot);
      }
    }

    walk(document);

    // 兜底：如果某个 action button 完全没有可访问的 <img>，按它的 data-icon 补一个。
    var btns = [];
    try { btns = document.getElementsByTagName("sp-action-button"); } catch (e3) { btns = []; }
    for (var b = 0; b < btns.length; b++) {
      var btn = btns[b];
      var iconName = btn.getAttribute && btn.getAttribute("data-icon");
      if (!iconName) continue;
      var hasIcon = false;
      try {
        var kids = btn.getElementsByTagName("img");
        for (var k = 0; k < kids.length; k++) {
          if (String(kids[k].className || "").indexOf("k-icon") >= 0) {
            hasIcon = true;
            applyOne(kids[k]);
            break;
          }
        }
      } catch (e4) { /* ignore */ }
      if (!hasIcon && !btn.firstChild) {
        try {
          var fresh = iconImgEl(iconName, ICON_PX);
          btn.appendChild(fresh);
          applyOne(fresh);
        } catch (e5) { /* ignore */ }
      }
    }
  }

  /* */
  function iconBtn(icon, title, onClick, opts) {
    opts = opts || {};
    var btn = mk("sp-action-button", {
      quiet: opts.quiet === false ? null : "",
      title: title,
      style: opts.style || "",
      on: { click: onClick }
    });
    if (opts.quiet === false) btn.removeAttribute("quiet");
    if (opts.variant) btn.setAttribute("variant", opts.variant);
    btn.appendChild(iconImgEl(icon, opts.size || ICON_PX));
    return btn;
  }

  /**
   * 无外框图标按钮：模仿 tab 栏的图标入口，只有图标，不绘制 Spectrum 按钮边框。
   * 注意这里用 <div role="button">：UXP 的原生 <button> 会吞掉内部 <img>。
   */
  function ghostIcon(icon, title, onClick, opts) {
    opts = opts || {};
    var btn = mk("div", {
      class: "icon-ghost" + (opts.className ? " " + opts.className : ""),
      role: "button",
      tabindex: "0",
      title: title || ""
    });
    btn.appendChild(iconImgEl(icon, opts.size || ICON_PX));
    var activate = function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      if (typeof onClick === "function") onClick(ev);
    };
    btn.addEventListener("click", activate);
    btn.addEventListener("keydown", function (ev) {
      if (ev && (ev.key === "Enter" || ev.key === " " || ev.keyCode === 13 || ev.keyCode === 32)) activate(ev);
    });
    return btn;
  }

  /* */

  /**
   */
  function toast(message, kind) {
    var host = $("toastHost");
    if (!host) return;
    var el = mk("div", { class: "toast" + (kind ? " " + kind : ""), text: message });
    host.appendChild(el);
    setTimeout(function () {
      try { host.removeChild(el); } catch (e) { /* ignore */ }
    }, 4000);
  }

  /* ============================== 浮层 ============================== */
  function elapsedSeconds(startedAt) {
    if (!startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  }

  /**
   * 状态文案 + 已等待秒数。
   * 秒数只在这里根据 startedAt 现算，绝不把上一次的 UI 文本再读回来，
   * 否则每次状态刷新都会把「已等待 Ns」覆盖掉，出现读秒停顿 / 重复。
   */
  function withElapsed(base, startedAt) {
    var text = String(base || "");
    if (!startedAt) return text;
    var wait = T("gen.waiting", { s: elapsedSeconds(startedAt) });
    return text ? text + " · " + wait : wait;
  }

  function renderProgressDetail() {
    var el = $("progressDetail");
    if (!el) return;
    var elapsedOn = !!(st.progressStartedAt && st.progressTimer);
    el.textContent = elapsedOn
      ? withElapsed(st.progressBase, st.progressStartedAt)
      : String(st.progressBase || "");
  }

  function setProgressGifFrame(index) {
    var img = $("progressGif");
    if (!img || !PROGRESS_GIF_FRAMES.length) return;
    st.progressGifFrame = ((index % PROGRESS_GIF_FRAMES.length) + PROGRESS_GIF_FRAMES.length) % PROGRESS_GIF_FRAMES.length;
    img.setAttribute("src", PROGRESS_GIF_FRAMES[st.progressGifFrame]);
  }

  function startProgressGif() {
    if (st.progressGifTimer) return;
    setProgressGifFrame(0);
    st.progressGifTimer = setInterval(function () {
      setProgressGifFrame(st.progressGifFrame + 1);
    }, PROGRESS_GIF_DELAY);
  }

  function stopProgressGif() {
    if (st.progressGifTimer) { clearInterval(st.progressGifTimer); st.progressGifTimer = null; }
    setProgressGifFrame(0);
  }

  /** 预加载 8 帧，避免第一次显示时因读盘出现跳帧。 */
  function preloadProgressGif() {
    if (!document.body || !document.createElement) return;
    var host = document.createElement("div");
    host.id = "progressGifPreload";
    host.style.display = "none";
    host.setAttribute("aria-hidden", "true");
    PROGRESS_GIF_FRAMES.forEach(function (src) {
      var img = document.createElement("img");
      img.src = src;
      img.width = 1;
      img.height = 1;
      host.appendChild(img);
    });
    document.body.appendChild(host);
  }

  function showProgress(label, detail, cancellable) {
    $("progressLabel").textContent = label || T("common.loading");
    st.progressBase = detail || "";
    st.progressStartedAt = Date.now();
    renderProgressDetail();
    $("btnProgressCancel").disabled = false;
    $("btnProgressCancel").textContent = T("common.cancel");
    $("btnProgressCancel").classList.toggle("hidden", !cancellable);
    $("overlayProgress").classList.remove("hidden");
    startProgressGif();
    // 运行框会压缩内容区高度；对话页需要重新计算消息列表的可滚动高度。
    if (st.screen === "screenChat") fitChatStream();
  }

  function setProgress(label, detail) {
    if (label) $("progressLabel").textContent = label;
    if (typeof detail !== "undefined") st.progressBase = detail || "";
    renderProgressDetail();
    if (st.screen === "screenChat") fitChatStream();
  }

  function hideProgress() {
    $("overlayProgress").classList.add("hidden");
    stopProgressGif();
    stopProgressTimer();
    st.progressStartedAt = null;
    st.progressBase = "";
    renderProgressDetail();
    if (st.screen === "screenChat") fitChatStream();
  }

  function startProgressTimer() {
    stopProgressTimer();
    if (!st.progressStartedAt) st.progressStartedAt = Date.now();
    // 先创建 interval 再渲染：renderProgressDetail 以 progressTimer 作为“读秒已开启”标志。
    st.progressTimer = setInterval(renderProgressDetail, 1000);
    renderProgressDetail();
  }

  function stopProgressTimer() {
    if (st.progressTimer) { clearInterval(st.progressTimer); st.progressTimer = null; }
  }

  /**
   * 内联选择器（替代原生 select / sp-picker / 浮层）。
   *
   * 为什么内联而不是浮层：UXP **不支持 position: fixed**，浮层会被排到面板内容
   * 之后（或直接看不见），表现就是「点了没反应」。
   * 这里直接在触发按钮后面插入一个普通区块（普通文档流），纯 div + click，
   * 任何 PS 版本都可靠。
   *
   * @param {object} opts {title, groups:[{label, items:[{value,label}]}], selected, anchor, mount}
   *        mount: 可选的“插入点元素”；面板会插到它后面。生成页用它把列表放到
   *        整个模型行下方，而不是只挂在触发器下面（避免把标签和工具按钮挤到中间）。
   * @returns Promise<value|null>
   */
  function closePicker() {
    var old = document.getElementById("inlinePicker");
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  function openPicker(opts) {
    return new Promise(function (resolve) {
      closePicker();
      var anchor = opts.anchor || null;
      var panel = mk("div", { class: "picker-inline", id: "inlinePicker" });

      var head = mk("div", { class: "picker-head" });
      head.appendChild(mk("span", { class: "grow", text: opts.title || T("common.choose") }));
      head.appendChild(mk("button", {
        class: "picker-close", title: T("common.cancel"), text: "\u00d7",
        on: { click: function () { closePicker(); resolve(null); } }
      }));
      panel.appendChild(head);

      var list = mk("div", { class: "picker-list" });
      var groups = opts.groups || [];
      groups.forEach(function (g) {
        if (g.label) list.appendChild(mk("div", { class: "picker-group", text: g.label }));
        (g.items || []).forEach(function (it) {
          var isSel = String(it.value) === String(opts.selected);
          list.appendChild(mk("button", {
            class: "picker-item" + (isSel ? " sel" : ""),
            "data-value": String(it.value),
            on: { click: function () { closePicker(); resolve(it.value); } }
          }, [
            mk("span", { class: "grow", text: it.label }),
            isSel ? mk("span", { class: "badge ok", text: "\u2713" }) : null
          ]));
        });
      });
      if (!groups.length) list.appendChild(mk("div", { class: "empty", text: T("common.na") }));
      panel.appendChild(list);

      var mount = (opts.mount && opts.mount.parentNode) ? opts.mount : anchor;
      // 生成页模型选择器需要贴在下拉框正下方（左右宽度一致），直接挂进
      // .model-field 这个纵向容器，而不是插到整行之后。
      if (opts.inside && mount) {
        mount.appendChild(panel);
        return;
      }
      var host = (mount && mount.parentNode) ? mount.parentNode : $("body");
      if (mount && mount.nextSibling) host.insertBefore(panel, mount.nextSibling);
      else host.appendChild(panel);
    });
  }

  function sheet(title, message, buttons) {
    return new Promise(function (resolve) {
      $("confirmTitle").textContent = title || "";
      $("confirmMessage").textContent = message || "";
      var host = $("confirmButtons");
      clear(host);
      var done = function (value) {
        $("overlayConfirm").classList.add("hidden");
        resolve(value);
      };
      (buttons || []).forEach(function (b) {
        host.appendChild(mk("sp-button", {
          size: "s",
          variant: b.variant || "secondary",
          text: b.label,
          style: "width:100%;",
          on: { click: function () { done(b.value); } }
        }));
      });
      $("overlayConfirm").classList.remove("hidden");
    });
  }

  function confirmSheet(message) {
    return sheet(T("common.confirm"), message, [
      { label: T("common.cancel"), value: false },
      { label: T("common.ok"), value: true, variant: "cta" }
    ]);
  }

  /** 文本输入浮层 */
  function inputSheet(title, placeholder, initial) {    return new Promise(function (resolve) {
      $("confirmTitle").textContent = title || "";
      $("confirmMessage").textContent = "";
      var host = $("confirmButtons");
      clear(host);
      var field = mk("input", { class: "k-input", type: "text", placeholder: placeholder || "", style: "width:100%;" });
      if (initial) field.value = initial;
      host.appendChild(field);
      var finish = function (value) {
        $("overlayConfirm").classList.add("hidden");
        resolve(value);
      };
      host.appendChild(mk("sp-button", {
        size: "s", variant: "cta", text: T("common.ok"), style: "width:100%;",
        on: { click: function () { finish(String(field.value || "").trim() || null); } }
      }));
      host.appendChild(mk("sp-button", {
        size: "s", variant: "secondary", text: T("common.cancel"), style: "width:100%;",
        on: { click: function () { finish(null); } }
      }));
      $("overlayConfirm").classList.remove("hidden");
      setTimeout(function () { try { field.focus(); } catch (e) { /* ignore */ } }, 30);
    });
  }

  /* ============================== 路由 ============================== */
  var SCREEN_IDS = [
    "screenSetup", "screenApps", "screenAppRun",
    "screenGenerate", "screenChat", "screenAssets", "screenHistory", "screenLibrary", "screenPromptEdit", "screenSettings",
    "screenAbout"
  ];

  /** 从哪个页面打开「关于」；返回时回到这个页面 */
  var aboutReturn = "screenGenerate";

  function openAbout() {
    if (st.screen !== "screenAbout") aboutReturn = st.screen || "screenGenerate";
    renderAbout();
    show("screenAbout");
  }

  function closeAbout() {
    show(aboutReturn || "screenGenerate");
  }

  function show(name) {
    var previous = st.screen;
    st.screen = name;
    // 离开任何页面时收起内联选择器，避免它跟着隐藏页面一起被带到下一次打开。
    closePicker();
    var categoryTrigger = $("categoryTrigger");
    if (categoryTrigger) categoryTrigger.setAttribute("aria-expanded", "false");
    SCREEN_IDS.forEach(function (id) {
      var el = $(id);
      if (el) el.hidden = (id !== name);
    });
    // 只有对话页需要独占内容区高度；离开时恢复普通滚动页面，避免影响其他 screen。
    $("body").classList.toggle("chat-body", name === "screenChat");
    var isAbout = name === "screenAbout";
    // 从「连接 API」页打开关于时不要突然露出 tab；从其他页面打开则保留当前 tab。
    var isSetup = name === "screenSetup" || (isAbout && aboutReturn === "screenSetup");
    $("tabBar").classList.toggle("hidden", isSetup);
    var activeApps = name === "screenApps" || name === "screenAppRun" ||
      (isAbout && st.tab === "apps");
    var activeGen = name === "screenGenerate" && st.tab === "generate" || (isAbout && st.tab === "generate");
    var activeChat = (name === "screenChat" && st.tab === "chat") ||
                     (isAbout && st.tab === "chat");
    var activeAssets = (name === "screenAssets" && st.tab === "assets") ||
                       (isAbout && st.tab === "assets");
    $("tabApps").classList.toggle("active", activeApps);
    $("tabGenerate").classList.toggle("active", activeGen);
    if ($("tabBanana")) $("tabBanana").classList.toggle("active", activeChat);
    if ($("tabAssets")) $("tabAssets").classList.toggle("active", activeAssets);
    // tab 现在是 <div role="tab">，手动同步 aria-selected
    try {
      $("tabApps").setAttribute("aria-selected", activeApps ? "true" : "false");
      $("tabGenerate").setAttribute("aria-selected", activeGen ? "true" : "false");
      if ($("tabBanana")) $("tabBanana").setAttribute("aria-selected", activeChat ? "true" : "false");
      if ($("tabAssets")) $("tabAssets").setAttribute("aria-selected", activeAssets ? "true" : "false");
    } catch (e) { /* ignore */ }
    renderFooter();
    if (name === "screenSetup") {
      updateSetupBadge();
      // 从其他页面进入「更换 Token」时显示掩码；用户已输入的草稿不覆盖。
      if (previous !== "screenSetup") syncTokenField();
    }
    if (name === "screenChat") setTimeout(fitChatStream, 0);
    else resetChatStreamHeight();
    // 导出结果只在词库页有效，离开时收起，避免浮在其它页面顶部。
    if (name !== "screenLibrary") hideExportResult();
    $("body").scrollTop = 0;
  }

  function showTab(tab) {
    // 兼容老用户配置里残留的 "image" / "banana"
    if (LEGACY_TAB_ALIAS[tab]) tab = LEGACY_TAB_ALIAS[tab];
    st.tab = tab;
    S.setPrefs({ tab: tab });
    if (tab === "apps") {
      show("screenApps");
      return;
    }
    if (tab === "generate") {
      show("screenGenerate");
      onEnterGenerate();
      return;
    }
    if (tab === "assets") {
      show("screenAssets");
      onEnterAssets();
      return;
    }
    // chat：Krea Agent 对话（screenChat）
    show("screenChat");
    onEnterChat();
  }

  function renderFooter() {
    var hint = "";
    var btns = [];
    var back = function () {
      return ghostIcon("back", T("common.back"), function () { showTab(st.tab); },
        { className: "footer-back" });
    };
    switch (st.screen) {
      case "screenSetup":
        // 从设置页进入「更换 Token」时提供返回；首次启动没有上一页则不显示。
        // 检测 API / 保存已经放到 Token 卡片内（获取 / 粘贴按钮下方）。
        if (setupCanReturn) btns.push(ghostIcon("back", T("common.back"), exitSetup, { className: "footer-back" }));
        break;
      case "screenApps":
        hint = "";
        break;
      case "screenAppRun":
        // 运行按钮已经放在 App 表单末尾，页脚只保留返回。
        btns.push(back());
        hint = st.currentApp ? st.currentApp.name : "";
        break;
      case "screenGenerate":
        hint = "";
        break;
      case "screenHistory":
        hint = T("history.title");
        break;
      case "screenLibrary":
        // 词库页脚只保留「关于 + 返回」，不再重复显示标题文字。
        btns.push(back());
        break;
      case "screenPromptEdit":
        // 保存按钮已经放到页面内容末尾，页脚只保留「关于 + 返回」。
        btns.push(ghostIcon("back", T("common.back"), function () { show("screenLibrary"); },
          { className: "footer-back" }));
        break;
      case "screenSettings":
        btns.push(back());
        break;
      case "screenAbout":
        btns.push(ghostIcon("back", T("common.back"), closeAbout, { className: "footer-back" }));
        hint = "Krea for Ps v" + VERSION;
        break;
      default:
        break;
    }

    // 页脚「关于」统一放在最左侧；关于页自身不重复，App 运行页也不需要。
    var showAbout = st.screen !== "screenAbout" && st.screen !== "screenAppRun";
    var aboutHost = $("footerAbout");
    clear(aboutHost);
    aboutHost.classList.toggle("hidden", !showAbout);
    if (showAbout) aboutHost.appendChild(textLink(T("about.title"), openAbout));

    $("footerHint").textContent = hint;
    var host = $("footerActions");
    clear(host);
    btns.forEach(function (b) { host.appendChild(b); });
    $("footerBar").classList.toggle("hidden", !aboutHost.children.length && !btns.length && !hint);
  }

  /** 从「更换 Token」返回进入前的页面；没有记录时回到当前 tab。 */
  var setupReturn = "screenSettings";
  /** 只有从设置页点「更换 Token」进来时才显示返回；首次启动不显示。 */
  var setupCanReturn = false;
  function exitSetup() {
    var target = setupReturn;
    if (!target || target === "screenSetup") {
      showTab(st.tab || "apps");
      return;
    }
    if (target === "screenApps" || target === "screenGenerate" || target === "screenChat" ||
        target === "screenAssets") {
      showTab(target === "screenApps" ? "apps" : target === "screenChat" ? "chat" :
        target === "screenAssets" ? "assets" : "generate");
      return;
    }
    show(target);
  }

  /**
   * 已保存 Token 时，输入框显示固定掩码而不是空白或真实值。
   * 只在进入「更换 Token」页时调用，避免覆盖用户正在输入的草稿。
   */
  function syncTokenField() {
    var input = $("tokenInput");
    if (!input) return;
    var configured = API.hasToken();
    input.value = configured ? TOKEN_MASK : "";
    input.placeholder = configured ? "" : "krea_...";
  }

  /** 读取 Token 输入框；若仍是掩码，则视为“使用当前已保存的 Token”。 */
  function tokenFieldValue() {
    var input = $("tokenInput");
    var value = String(input && input.value || "").trim();
    if (value === TOKEN_MASK) return String(st.token || "").trim();
    return value;
  }

  async function onPasteToken() {
    var text = String(await readClipboardText() || "").trim();
    if (!text) { toast(T("setup.pasteEmpty"), "error"); return; }
    $("tokenInput").value = text;
    setSetupNotice(T("setup.notTested"), "muted");
  }

  /* ============================== modelLabel ============================== */
  function modelLabel(id) {
    var m = MODELS.models[id];
    if (!m) return id;
    if (typeof I18N.modelLabel === "function") return I18N.modelLabel(id, m);
    return m.label[I18N.lang()] || m.label.en || id;
  }

  /*
   * 从 base64 头判断图片格式。
   * UXP 的 imaging.encodeImageData() 默认输出 JPEG，但之前的代码一律按 PNG
   * 拼 data URL；MIME 与字节内容不一致时，UXP 的 <img> 可能渲染成纯黑。
   */
  function mimeOfBase64(base64) {
    var b = String(base64 || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    if (/^iVBORw0KGgo/.test(b)) return "image/png";
    if (/^\/9j\//.test(b)) return "image/jpeg";
    if (/^UklGR/.test(b)) return "image/webp";
    if (/^R0lGOD/.test(b)) return "image/gif";
    // 未知格式交给调用方决定（文件扩展名 / 默认 PNG）。
    return null;
  }

  function uriOf(item) {
    if (!item) return null;
    if (item.url) return item.url;
    if (item.base64) {
      var raw = String(item.base64);
      if (/^data:image\//i.test(raw)) return raw;
      var b64 = raw.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
      // 文件头最可靠；其次才是扩展名 / 调用方给的 mime；最后按旧约定用 PNG。
      var mime = mimeOfBase64(b64) || item.mime || "image/png";
      return "data:" + mime + ";base64," + b64;
    }
    return null;
  }

  function normType(t) {
    if (Array.isArray(t)) {
      for (var i = 0; i < t.length; i++) if (t[i] !== "null") return t[i];
      return "string";
    }
    return t;
  }

  function errMsg(e) {
    if (!e) return "unknown";
    return e.message || String(e);
  }

  /**
   * UXP 的 shell.openExternal 返回 Promise；不接住拒绝会触发全局
   * unhandledrejection，面板会误显示“插件初始化失败”。
   * 这里统一吞掉异常并返回布尔值，由调用方决定提示方式。
   */
  function tryOpenExternal(url) {
    return new Promise(function (resolve) {
      try {
        if (!shell || typeof shell.openExternal !== "function") { resolve(false); return; }
        var result = shell.openExternal(url);
        if (result && typeof result.then === "function") {
          result.then(function (value) { resolve(value !== false); }, function () { resolve(false); });
          return;
        }
        resolve(result !== false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function openExternal(url, okMessage) {
    return tryOpenExternal(url).then(function (ok) {
      if (ok) {
        if (okMessage) toast(okMessage, "ok");
      } else {
        toast(T("common.openFailed"), "error");
      }
      return ok;
    });
  }

  function handleError(e, where) {
    console.error("[Krea for Ps]" + (where ? " " + where : ""), e);
    if (API.isAuthError(e)) {
      toast(T("err.auth"), "error");
      show("screenSetup");
      return;
    }
    toast(T("err.generic", { msg: errMsg(e) }), "error");
  }

  /* ============================== 表单引擎 ============================== */
  /**
   * opts:   {hideRoles:[...], hideNames:[...], advancedAfter: n, values:{}}
   */
  function buildForm(host, fields, opts) {
    opts = opts || {};
    clear(host);
    var hideRoles = opts.hideRoles || [];
    var hideNames = opts.hideNames || [];
    var values = opts.values || {};
    var images = {};
    var getters = {};

    var advancedHost = null;

    function makeRow(f) {
      var wrap = mk("div", { class: "field" });
      var lbl = mk("div", { class: "flabel" });
      lbl.appendChild(mk("span", { text: I18N.fieldLabel(f.name, f.label) }));
      if (f.required) lbl.appendChild(mk("span", { class: "req", text: "*" }));
      wrap.appendChild(lbl);
      if (f.desc) wrap.appendChild(mk("div", { class: "fdesc wrap", text: f.desc }));
      return wrap;
    }

    function num(v, fallback) {
      var n = parseFloat(v);
      return isNaN(n) ? fallback : n;
    }

    function renderControl(f, row) {
      var ui = f.ui || "text";
      var name = f.name;
      var initial = Object.prototype.hasOwnProperty.call(values, name) ? values[name] : f.default;

      if (ui === "textarea") {
        var ta = mk("textarea", { class: "k-textarea", style: "width:100%;min-height:60px;" });
        if (initial) ta.value = String(initial);
        row.appendChild(ta);
        getters[name] = function () { return String(ta.value || "").trim(); };
        return;
      }
      if (ui === "text") {
        var tf = mk("input", { class: "k-input", type: "text", style: "width:100%;" });
        if (initial !== undefined && initial !== null) tf.value = String(initial);
        row.appendChild(tf);
        getters[name] = function () { return String(tf.value || "").trim(); };
        return;
      }
      if (ui === "url") {
        var uf = mk("input", { class: "k-input", type: "text", style: "width:100%;", placeholder: "https://…" });
        if (initial !== undefined && initial !== null) uf.value = String(initial);
        row.appendChild(uf);
        row.appendChild(mk("div", {
          class: "fdesc wrap",
          text: f.wireType === "audio" ? T("field.audioHint") : T("field.videoHint")
        }));
        getters[name] = function () { return String(uf.value || "").trim(); };
        return;
      }
      if (ui === "number") {
        var nf = mk("input", { class: "k-input", type: "text", style: "width:100%;" });
        if (initial !== undefined && initial !== null) nf.value = String(initial);
        row.appendChild(nf);
        getters[name] = function () {
          var raw = String(nf.value || "").trim();
          if (!raw) return undefined;
          var v = parseFloat(raw);
          if (isNaN(v)) return undefined;
          if (typeof f.min === "number") v = Math.max(f.min, v);
          if (typeof f.max === "number") v = Math.min(f.max, v);
          if (f.type === "integer") v = Math.round(v);
          return v;
        };
        return;
      }
      if (ui === "slider") {
        var min = typeof f.min === "number" ? f.min : 0;
        var max = typeof f.max === "number" ? f.max : 1;
        if (max < min) max = min;
        var step = f.step || (f.type === "integer" ? 1 : (max - min) <= 2 ? 0.01 : (max - min) <= 20 ? 0.1 : 1);
        var cur = initial === undefined || initial === null ? (f.type === "integer" ? Math.round((min + max) / 2) : min) : initial;
        cur = Math.min(max, Math.max(min, num(cur, min)));
        var stepText = String(step);
        var dot = stepText.indexOf(".");
        var decimals = dot >= 0 ? Math.min(4, stepText.length - dot - 1) : 0;

        function clampSliderValue(v, fallback) {
          var n = parseFloat(v);
          if (isNaN(n)) n = fallback;
          n = Math.min(max, Math.max(min, n));
          if (f.type === "integer") n = Math.round(n);
          return parseFloat(n.toFixed(decimals));
        }
        function sliderText(v) { return String(parseFloat(Number(v).toFixed(decimals))); }

        var wrapRow = mk("div", { class: "control" });
        /*
         * 不用 sp-slider，也不用原生 input[type=range]：
         * 在部分 Photoshop / UXP 版本里两者的拖动都不可靠（只落两端或完全不动）。
         * 这里用普通 div 自绘轨道，mousedown + document.mousemove 计算位置，
         * 不依赖任何原生滑杆控件的内部实现。右侧数字框仍可直接精确输入。
         */
        var track = mk("div", {
          class: "k-slider",
          tabindex: "0",
          "aria-label": I18N.fieldLabel(f.name, f.label),
          "aria-valuemin": sliderText(min),
          "aria-valuemax": sliderText(max),
          /*
           * 关键尺寸直接内联：部分 UXP 版本会给 [role=slider] 或带 aria 的元素
           * 套用内置滑杆外观，导致整行被撑成几十像素高。这里只用普通 div。
           */
          style: "position:relative;flex:1 1 auto;width:auto;min-width:60px;" +
            "height:18px;min-height:18px;max-height:18px;margin:0;padding:0;"
        });
        var rail = mk("div", {
          class: "k-slider-rail",
          style: "position:absolute;left:0;right:0;top:7px;height:4px;max-height:4px;" +
            "margin:0;padding:0;border:0;background:var(--k-border-2);" +
            "pointer-events:none;"
        });
        var fill = mk("div", {
          class: "k-slider-fill",
          style: "position:absolute;left:0;top:7px;width:0;height:4px;max-height:4px;" +
            "margin:0;padding:0;border:0;background:var(--k-blue);" +
            "pointer-events:none;"
        });
        var knob = mk("div", {
          class: "k-slider-knob",
          style: "position:absolute;top:3px;left:0;width:12px;height:12px;margin-left:-6px;" +
            "padding:0;background:var(--k-blue);border:2px solid var(--k-bg-2);" +
            "border-radius:50%;box-sizing:border-box;pointer-events:none;"
        });
        track.appendChild(rail);
        track.appendChild(fill);
        track.appendChild(knob);

        var val = mk("input", {
          class: "k-input k-range-val",
          type: "text",
          style: "flex:0 0 52px;width:52px;min-width:52px;height:22px;min-height:22px;" +
            "max-height:22px;padding:0 4px;text-align:right;"
        });
        val.value = sliderText(cur);
        var sliderValue = cur;

        function paintSlider(v) {
          var pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
          pct = Math.min(100, Math.max(0, pct));
          fill.style.width = pct + "%";
          knob.style.left = pct + "%";
          track.setAttribute("aria-valuenow", sliderText(v));
        }
        function commitSlider(v, writeBox) {
          sliderValue = clampSliderValue(v, sliderValue);
          paintSlider(sliderValue);
          if (writeBox) val.value = sliderText(sliderValue);
        }
        function valueFromX(x) {
          var rect = track.getBoundingClientRect ? track.getBoundingClientRect() : null;
          var width = rect && rect.width ? rect.width : (track.clientWidth || track.offsetWidth || 0);
          if (width <= 0 || max <= min) return sliderValue;
          var ratio = Math.min(1, Math.max(0, (x - (rect ? rect.left : 0)) / width));
          var raw = min + ratio * (max - min);
          if (step > 0) raw = min + Math.round((raw - min) / step) * step;
          return clampSliderValue(raw, sliderValue);
        }
        function valueFromEvent(ev) {
          if (!ev) return sliderValue;
          if (typeof ev.clientX === "number") return valueFromX(ev.clientX);
          // 有些 UXP 版本只给 offsetX（相对轨道），换算成坐标后一样可用。
          if (typeof ev.offsetX === "number") {
            var rect = track.getBoundingClientRect ? track.getBoundingClientRect() : null;
            return valueFromX((rect ? rect.left : 0) + ev.offsetX);
          }
          return sliderValue;
        }

        var dragging = false;
        var lastClientX = null;
        function onSliderMove(ev) {
          if (!dragging) return;
          var x = ev && typeof ev.clientX === "number" ? ev.clientX : null;
          // document / window / track 可能对同一次移动各派发一遍，坐标相同时跳过。
          if (x !== null && x === lastClientX) return;
          lastClientX = x;
          commitSlider(valueFromEvent(ev), true);
          if (ev.preventDefault) ev.preventDefault();
        }
        function addDragListeners() {
          document.addEventListener("mousemove", onSliderMove);
          document.addEventListener("mouseup", stopSliderDrag);
          try {
            if (typeof window !== "undefined" && window.addEventListener) {
              window.addEventListener("mousemove", onSliderMove);
              window.addEventListener("mouseup", stopSliderDrag);
            }
          } catch (e3) { /* ignore */ }
        }
        function removeDragListeners() {
          document.removeEventListener("mousemove", onSliderMove);
          document.removeEventListener("mouseup", stopSliderDrag);
          try {
            if (typeof window !== "undefined" && window.removeEventListener) {
              window.removeEventListener("mousemove", onSliderMove);
              window.removeEventListener("mouseup", stopSliderDrag);
            }
          } catch (e4) { /* ignore */ }
        }
        function stopSliderDrag() {
          if (!dragging) return;
          dragging = false;
          lastClientX = null;
          removeDragListeners();
        }
        function onSliderDown(ev) {
          if (ev && typeof ev.button === "number" && ev.button !== 0) return;
          stopSliderDrag();
          dragging = true;
          lastClientX = null;
          commitSlider(valueFromEvent(ev), true);
          addDragListeners();
          if (ev.preventDefault) ev.preventDefault();
          try { track.focus(); } catch (e2) { /* ignore */ }
        }
        track.addEventListener("mousedown", onSliderDown);
        // 即使 UXP 的 document/window 不派发移动事件，只要指针还在轨道上也能拖动。
        track.addEventListener("mousemove", onSliderMove);
        track.addEventListener("mouseup", stopSliderDrag);
        // 兜底：某些 UXP 版本只稳定派发 click。没有坐标时不动，避免误跳到最小值。
        track.addEventListener("click", function (ev) {
          if (!ev || (typeof ev.clientX !== "number" && typeof ev.offsetX !== "number")) return;
          commitSlider(valueFromEvent(ev), true);
        });
        track.addEventListener("keydown", function (ev) {
          var key = ev && ev.key;
          if (key === "ArrowLeft" || key === "ArrowDown") commitSlider(sliderValue - step, true);
          else if (key === "ArrowRight" || key === "ArrowUp") commitSlider(sliderValue + step, true);
          else if (key === "Home") commitSlider(min, true);
          else if (key === "End") commitSlider(max, true);
          else return;
          if (ev.preventDefault) ev.preventDefault();
        });

        function syncFromNumber() {
          commitSlider(clampSliderValue(val.value, sliderValue), true);
        }
        function previewFromNumber() {
          // 输入过程中只同步滑杆，不回写输入框，否则用户无法先清空再输入。
          var n = parseFloat(val.value);
          if (isNaN(n)) return;
          sliderValue = clampSliderValue(n, sliderValue);
          paintSlider(sliderValue);
        }
        val.addEventListener("input", previewFromNumber);
        val.addEventListener("change", syncFromNumber);
        val.addEventListener("blur", syncFromNumber);
        paintSlider(cur);
        wrapRow.appendChild(track);
        wrapRow.appendChild(val);
        row.appendChild(wrapRow);
        getters[name] = function () {
          return clampSliderValue(val.value, sliderValue);
        };
        return;
      }
      if (ui === "select") {
        var list = f.enum || [];
        var chosen = initial !== undefined && initial !== null ? String(initial) : String(list[0] === undefined ? "" : list[0]);
        var value = chosen;
        var triggerLabel = mk("span", { class: "grow", text: chosen });
        var trigger = mk("button", {
          class: "dd-trigger",
          style: "width:100%;",
          on: {
            click: function () {
              openPicker({
                title: I18N.fieldLabel(f.name, f.label),
                groups: [{ items: list.map(function (v) { return { value: String(v), label: String(v) }; }) }],
                selected: value,
                anchor: trigger
              }).then(function (v) {
                if (v === null) return;
                value = String(v);
                triggerLabel.textContent = value;
              });
            }
          }
        });
        trigger.appendChild(triggerLabel);
        trigger.appendChild(mk("span", { class: "dd-caret", text: "▾" }));
        row.appendChild(trigger);
        getters[name] = function () { return value; };
        return;
      }
      if (ui === "boolean") {
        var cb = mk("sp-checkbox", {});
        cb.checked = !!initial;
        row.appendChild(cb);
        getters[name] = function () { return !!cb.checked; };
        return;
      }
      if (ui === "list") {
        var la = mk("textarea", { class: "k-textarea", style: "width:100%;min-height:52px;", placeholder: T("field.listHint") });
        if (Array.isArray(initial)) la.value = initial.join("\n");
        row.appendChild(la);
        getters[name] = function () {
          var lines = String(la.value || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
          return lines.length ? lines : undefined;
        };
        return;
      }
      if (ui === "style_ids") {
        var sa = mk("textarea", { class: "k-textarea", style: "width:100%;min-height:52px;", placeholder: T("field.styleIdsHint") });
        if (Array.isArray(initial)) {
          sa.value = initial.map(function (x) { return typeof x === "string" ? x : (x && x.id); }).filter(Boolean).join("\n");
        }
        row.appendChild(sa);
        getters[name] = function () {
          var lines = String(sa.value || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
          if (!lines.length) return undefined;
          return lines.map(function (id) { return { id: id, strength: 1 }; });
        };
        return;
      }
      if (ui === "json") {
        var ja = mk("textarea", { class: "k-textarea", style: "width:100%;min-height:52px;", placeholder: "JSON" });
        if (initial !== undefined && initial !== null) {
          try { ja.value = typeof initial === "string" ? initial : JSON.stringify(initial); } catch (e) { /* ignore */ }
        }
        row.appendChild(ja);
        getters[name] = function () {
          var raw = String(ja.value || "").trim();
          if (!raw) return undefined;
          try { return JSON.parse(raw); } catch (e) { throw new Error(name + ": " + T("field.jsonInvalid")); }
        };
        return;
      }
      if (ui === "image" || ui === "images") {
        var ctrl = makeImageControl(f, ui === "images");
        row.appendChild(ctrl.el);
        getters[name] = function () { return ctrl.typed(f); };
        images[name] = ctrl;
        return;
      }
      // fallback
      var fb = mk("input", { class: "k-input", type: "text", style: "width:100%;" });
      if (initial !== undefined && initial !== null) fb.value = String(initial);
      row.appendChild(fb);
      getters[name] = function () { return String(fb.value || "").trim(); };
    }

    var visible = fields.filter(function (f) {
      if (hideNames.indexOf(f.name) >= 0) return false;
      if (hideRoles.indexOf(f.role) >= 0) return false;
      return true;
    });

    var advancedAfter = typeof opts.advancedAfter === "number" ? opts.advancedAfter : -1;

    visible.forEach(function (f, idx) {
      if (advancedAfter >= 0 && idx >= advancedAfter) {
        if (!advancedHost) {
          var toggle = mk("div", {
            class: "adv-toggle",
            on: {
              click: function () {
                var open = !advancedHost.classList.contains("hidden");
                advancedHost.classList.toggle("hidden", open);
                toggle.querySelector("span").textContent = (open ? "▸ " : "▾ ") + T("gen.advanced");
              }
            }
          });
          toggle.appendChild(mk("span", { text: "▸ " + T("gen.advanced") }));
          toggle.appendChild(mk("span", { class: "tiny muted", text: String(visible.length - advancedAfter) }));
          host.appendChild(toggle);
          advancedHost = mk("div", { class: "stack hidden" });
          host.appendChild(advancedHost);
        }
        var arow = makeRow(f);
        renderControl(f, arow);
        advancedHost.appendChild(arow);
        return;
      }
      var row = makeRow(f);
      renderControl(f, row);
      host.appendChild(row);
    });

    return {
      host: host,
      fields: visible,
      read: function () {
        var out = {};
        visible.forEach(function (f) {
          var g = getters[f.name];
          if (!g) return;
          var v;
          try { v = g(); } catch (e) { throw e; }
          if (v === undefined || v === null || v === "" ) return;
          if (Array.isArray(v) && !v.length) return;
          out[f.name] = v;
        });
        return out;
      },
      setImages: function (name, items) { if (images[name]) images[name].set(items); }
    };
  }

  /* 图片输入控件：缩略图 + 选区/文件/URL 三种来源 */
  function makeImageControl(f, multiple) {
    var items = [];
    var strip = mk("div", { class: "thumb-strip" });
    var btns = mk("div", { class: "row wrap-row", style: "margin-top:6px;" });

    function renderStrip() {
      clear(strip);
      items.forEach(function (it, idx) {
        var cell = mk("div", { class: "thumb-cell" });
        var img = mk("img", { alt: it.name || "ref" });
        img.src = uriOf(it);
        cell.appendChild(img);
        if (multiple) {
          cell.appendChild(mk("button", {
            class: "x", text: "×", title: T("common.delete"),
            on: { click: function () { items.splice(idx, 1); renderStrip(); } }
          }));
        } else {
          cell.appendChild(mk("button", {
            class: "x", text: "×", title: T("common.delete"),
            on: { click: function () { items = []; renderStrip(); } }
          }));
        }
        if (it.name) cell.appendChild(mk("div", { class: "tag", text: String(it.name).slice(0, 10) }));
        strip.appendChild(cell);
      });
    }

    var btnSel = textBtn(T("gen.capture"), function () {
      captureForField().then(function (item) {
        if (!item) return;
        if (multiple) items.push(item); else items = [item];
        renderStrip();
      });
    });
    var btnFile = textBtn(T("gen.pick"), function () {
      PS.pickImageFiles(multiple).then(function (files) {
        var chain = Promise.resolve();
        files.forEach(function (file) {
          chain = chain.then(function () {
            return PS.fileToBase64(file).then(function (res) {
              if (!res) return;
              if (multiple) items.push({ base64: res.base64, mime: res.mime, name: res.name });
              else items = [{ base64: res.base64, mime: res.mime, name: res.name }];
              renderStrip();
            });
          });
        });
        chain.catch(function (e) { toast(T("gen.captureFailed", { msg: errMsg(e) }), "error"); });
      });
    });
    var btnUrl = textBtn("URL", function () {
      inputSheet("图片 URL", "https://...", "").then(function (url) {
        if (!url) return;
        var it = { url: url, name: "url" };
        if (multiple) items.push(it); else items = [it];
        renderStrip();
      });
    });

    btns.appendChild(btnSel);
    btns.appendChild(btnFile);
    btns.appendChild(btnUrl);

    return {
      el: (function () {
        var box = mk("div");
        box.appendChild(strip);
        box.appendChild(btns);
        return box;
      })(),
      set: function (next) { items = next || []; renderStrip(); },
      typed: function (field) {
        if (!items.length) return undefined;
        var uris = items.map(uriOf).filter(Boolean);
        if (!uris.length) return undefined;
        var wrap = field.wrap || (multiple ? "plain" : "single");
        if (wrap === "single") return uris[0];
        if (wrap === "strength") return uris.map(function (u) { return { url: u, strength: 1 }; });
        if (wrap === "tag") {
          return items.map(function (it, i) { return { url: uriOf(it), tag: String(it.name || ("ref" + (i + 1))).slice(0, 40) }; });
        }
        return uris;
      }
    };
  }

  async function captureForField() {
    try {
      var shot = await PS.capture({ sampling: st.prefs.sampling });
      if (!shot || !shot.base64) {
        toast(T("gen.sourceNone"), "error");
        return null;
      }
      return {
        base64: shot.base64,
        mime: mimeOfBase64(shot.base64) || shot.mime || "image/png",
        name: shot.source === "selection" ? "selection" : "canvas"
      };
    } catch (e) {
      toast(T("gen.captureFailed", { msg: errMsg(e) }), "error");
      return null;
    }
  }

  /* ============================== buildModelPicker ============================== */
  function openModelPickerFor(anchor) {
    var first = ["krea", "google", "openai"];
    var rank = function (id) {
      if (id === "enhance") return 99;
      var i = first.indexOf(id);
      return i >= 0 ? i : 10;
    };
    var ordered = MODELS.groups.slice().sort(function (a, b) { return rank(a.id) - rank(b.id); });
    var groups = ordered.map(function (g) {
      return {
        label: "— " + (g.label[I18N.lang()] || g.label.en) + " —",
        items: g.models.map(function (id) { return { value: id, label: modelLabel(id) }; })
      };
    });
    return openPicker({
      title: T("gen.model"),
      groups: groups,
      selected: st.model,
      anchor: anchor,
      // 模型列表挂在 .model-field 内部：左边缘与下拉框对齐，宽度也一致。
      mount: (anchor && anchor.id === "modelTrigger") ? ($("modelField") || $("modelRow")) : null,
      inside: !!(anchor && anchor.id === "modelTrigger")
    }).then(function (v) {
      if (!v || v === st.model) return;
      st.model = v;
      resetGenerateButtonMode();
      S.setPrefs({ model: v });
      buildModelPicker();
      renderModelForm();
      setGenerateButtonMode(false);
      updateHeader();
    });
  }

  function llmLabel(id) {
    if (!id) return T("chat.agentAuto");
    return AGENT_MODEL_LABELS[id] || id;
  }

  function updateChatModelLabel() {
    var label = $("chatModelLabel");
    if (label) label.textContent = llmLabel(st.agentModel);
    var btn = $("chatModelTrigger");
    if (btn) btn.title = T("chat.agentModel");
  }

  function openAgentModelPicker(anchor) {
    var groups = [{
      label: T("chat.agentModel"),
      items: [{ value: "", label: T("chat.agentAuto") }]
    }];
    var allowed = null;
    if (Array.isArray(st.agentAllowed) && st.agentAllowed.length) {
      allowed = {};
      st.agentAllowed.forEach(function (id) { allowed[id] = 1; });
    }
    AGENT_MODEL_GROUPS.forEach(function (g) {
      var items = g.items.filter(function (it) { return !allowed || allowed[it.id]; });
      if (!items.length) return;
      groups.push({
        label: "— " + g.label + " —",
        items: items.map(function (it) { return { value: it.id, label: it.label }; })
      });
    });
    return openPicker({
      title: T("chat.agentModel"),
      groups: groups,
      selected: st.agentModel,
      anchor: anchor
    }).then(function (v) {
      if (v === null) return;
      st.agentModel = v || "";
      st.agentAllowed = null;
      S.setPrefs({ agentModel: st.agentModel });
      updateChatModelLabel();
    });
  }

  function openChatModelPicker(anchor) {
    return openAgentModelPicker(anchor);
  }

  function buildModelPicker() {
    var label = $("modelTriggerLabel");
    if (label) label.textContent = modelLabel(st.model);
    var btn = $("modelTrigger");
    if (btn && !btn.__kreaBound) {
      btn.__kreaBound = true;
      btn.addEventListener("click", function () { openModelPickerFor(btn); });
    }
    var cbtn = $("chatModelTrigger");
    if (cbtn && !cbtn.__kreaBound) {
      cbtn.__kreaBound = true;
      cbtn.addEventListener("click", function () { openChatModelPicker(cbtn); });
    }
    updateChatModelLabel();
  }

  /**
   * 原版生成页不展示模型说明 / 参数表单；这里只负责把历史 / 词库选中的
   * 提示词放进输入框，并同步模型按钮和生成按钮的文案。
   */
  function renderModelForm() {
    buildModelPicker();
    setGenerateButtonMode(!!st.genAgain);

    if (st.pendingPrompt) {
      var input = $("promptInput");
      if (input) input.value = st.pendingPrompt;
      st.pendingPrompt = null;
    }
  }

  /* ============================== 生成页参考图 ============================== */
  function renderGenerateRefs() {
    var list = $("refImagePreviewList");
    var container = $("refImageContainer");
    var clearBtn = $("clearRefImagesBtn");
    var warning = $("refImageWarning");
    var hasRefs = st.refs.length > 0;

    if (list) {
      clear(list);
      st.refs.forEach(function (it, idx) {
        var card = mk("div", { class: "image-preview-item" });
        card.appendChild(mk("sp-action-button", {
          class: "remove-btn",
          quiet: "",
          size: "s",
          title: T("gen.removeRef", { name: it.name || ("ref" + (idx + 1)) }),
          text: "×",
          on: { click: function () { st.refs.splice(idx, 1); renderGenerateRefs(); } }
        }));
        var img = mk("img", { alt: it.name || "ref" });
        img.src = uriOf(it);
        card.appendChild(img);
        var name = mk("sp-body", { class: "ref-name", text: it.name || ("ref" + (idx + 1)) });
        card.appendChild(name);
        list.appendChild(card);
      });
    }
    if (container) container.classList.toggle("hidden", !hasRefs);
    if (clearBtn) clearBtn.classList.toggle("hidden", !hasRefs);
    // 原版在参考图超过 1 张时提示。
    if (warning) warning.classList.toggle("hidden", st.refs.length <= 1);
  }

  /** 把一次 PS.capture() 的结果标准化成 source。 */
  function sourceFromShot(shot) {
    return {
      base64: shot.base64,
      mime: mimeOfBase64(shot.base64) || shot.mime || "image/png",
      name: shot.source === "selection" ? "selection" : "canvas",
      width: shot.width,
      height: shot.height,
      kind: shot.blank ? "blank" : shot.source,
      blank: !!shot.blank,
      // 记录抓图时到底有没有选区。有选区但 blank=true 表示像素读取失败。
      hasSelection: !!shot.hasSelection,
      // 选区边界用于结果精确落位；不要等生成结束后再读一次选区。
      bounds: shot.bounds || null
    };
  }

  /**
   * 生成页 / 对话页共用的选区抓取：
   * 点击发送时实时读取当前选区并抓取像素。没有选区就中止，
   * 不退化成整幅画布生成。
   */
  async function captureSelectionForGenerate(knownDoc, knownSelection) {
    var doc = knownDoc || PS.activeDoc();
    if (!doc) throw new Error(T("gen.needDoc"));
    var selection = knownSelection || await PS.getSelection(doc);
    if (!selection) throw new Error(T("gen.needSelection"));

    var shot = await PS.capture({
      doc: doc,
      sampling: st.prefs.sampling,
      selection: selection,
      requireSelection: true
    });
    if (!shot || !shot.base64 || shot.blank) {
      // PS.capture() 只在所有捕获路径都失败时才返回 blank。此时绝不能继续：
      // 继续会把一张占位图上传到 Krea，后台看到的就会是一张黑图。
      if (shot && shot.reason) console.error("[Krea] capture diagnostics:", shot.reason);
      var detail = shot && shot.reason
        ? "\n" + T("gen.captureDebug", { reason: String(shot.reason).slice(0, 300) })
        : "";
      throw new Error(T("gen.captureBlankHint") + detail);
    }
    console.log("[Krea] capture before generate", {
      sampling: st.prefs.sampling,
      source: shot.source,
      blank: !!shot.blank,
      hasSelection: !!shot.hasSelection,
      mime: shot.mime,
      width: shot.width,
      height: shot.height
    });
    st.source = sourceFromShot(shot);
    return { docId: doc.id, selection: selection, shot: shot };
  }

  /**
   * 生成页参考图：对齐原版，文件较大时缩放到最长边 1024 再发送。
   * 阈值用 1.4 × 1024² 字节，避免对普通小图做一次无谓的临时文档往返。
   */
  async function addGenerateRefs() {
    var files = await PS.pickImageFiles(true);
    var added = 0;
    var maxPx = 1024;
    var threshold = 1.4 * maxPx * maxPx;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      try {
        var res = await PS.fileToBase64(file);
        if (res && res.size > threshold) {
          var resized = await PS.resizeReference(file, maxPx);
          if (!resized) throw new Error("无法缩放参考图");
          st.refs.push({ base64: resized, mime: "image/png", name: res.name });
          added++;
        } else if (res) {
          st.refs.push({ base64: res.base64, mime: res.mime, name: res.name });
          added++;
        }
      } catch (e) {
        // fileToBase64 对 >8MB 会直接拒绝；此时仍尝试让 Photoshop 缩放一次。
        try {
          var fallback = await PS.resizeReference(file, maxPx);
          if (!fallback) throw new Error("无法缩放参考图");
          st.refs.push({ base64: fallback, mime: "image/png", name: file.name });
          added++;
        } catch (e2) {
          toast(T("gen.captureFailed", { msg: errMsg(e2 || e) }), "error");
        }
      }
    }
    renderGenerateRefs();
    if (added) toast(T("gen.refsAdded", { n: added }), "ok");
  }

  /* ============================== 生成 ============================== */
  function ratioEnum(field, w, h) {
    if (!field || !field.enum || !field.enum.length) return undefined;
    if (!w || !h) return field.enum[0];
    var presets = [];
    field.enum.forEach(function (s) {
      var p = String(s).split(":");
      var a = parseFloat(p[0]), b = parseFloat(p[1]);
      if (a && b) presets.push({ s: s, r: a / b });
    });
    var target = w / h;
    var best = presets[0] ? presets[0].s : field.enum[0];
    var bestD = Infinity;
    presets.forEach(function (p) {
      var d = Math.abs(p.r - target);
      if (d < bestD) { bestD = d; best = p.s; }
    });
    return best;
  }

  /**
   * 按模型声明的 resolution 枚举挑选输出档位。
   * 例如选区/画布是 3840×2160 时：nano-banana 选 4K、krea-3 选 2K、
   * krea-2 只有 1K 则保持 1K；不再对所有模型硬编码 1K。
   */
  function resolutionEnum(field, w, h) {
    if (!field || !field.enum || !field.enum.length) return undefined;
    var levels = [];
    field.enum.forEach(function (raw) {
      var m = String(raw).match(/(\d+(?:\.\d+)?)\s*K/i);
      if (m) levels.push({ value: raw, px: parseFloat(m[1]) * 1024 });
    });
    levels.sort(function (a, b) { return a.px - b.px; });
    if (!levels.length) {
      return field.default !== undefined && field.enum.indexOf(field.default) >= 0
        ? field.default : field.enum[0];
    }
    if (!w || !h) {
      if (field.default !== undefined && field.enum.indexOf(field.default) >= 0) return field.default;
      for (var j = 0; j < levels.length; j++) {
        if (levels[j].px >= 1024) return levels[j].value;
      }
      return levels[0].value;
    }
    // 以输入图/选区的最长边为目标：优先选不低于它的最小档位，
    // 超过模型最大档位时退回最大档（例如 8K 输入 + 4K 模型 -> 4K）。
    var target = Math.max(w, h);
    for (var i = 0; i < levels.length; i++) {
      if (levels[i].px >= target) return levels[i].value;
    }
    return levels[levels.length - 1].value;
  }

  /** 没有 resolution 枚举、改用 width/height 的模型：按输入比例放大到允许上限。 */
  function fitSizeFields(widthField, heightField, w, h) {
    var maxW = (widthField && typeof widthField.max === "number") ? widthField.max : Infinity;
    var maxH = (heightField && typeof heightField.max === "number") ? heightField.max : Infinity;
    // 没有声明上限时最多送到 4K，避免 8K 画布触发后台尺寸校验。
    var hardCap = 4096;
    var scale = Math.min(1, hardCap / Math.max(w, h), maxW / w, maxH / h);
    return {
      width: clampDim(widthField || {}, Math.max(1, Math.round(w * scale))),
      height: clampDim(heightField || {}, Math.max(1, Math.round(h * scale)))
    };
  }

  /**
   */
  function buildGenerateBody(opts) {
    opts = opts || {};
    var model = MODELS.models[st.model];
    var body = {};
    var findField = function (name) {
      for (var i = 0; i < model.fields.length; i++) if (model.fields[i].name === name) return model.fields[i];
      return null;
    };

    // 生成页在点击「生成」时实时抓图；对话页仍使用 st.source / st.refs。
    // 允许调用方显式传入这两项，避免为了构造请求去改全局状态。
    var refs = (Array.isArray(opts.refs) ? opts.refs : (st.refs || []));
    var source = Object.prototype.hasOwnProperty.call(opts, "source") ? opts.source : st.source;
    // 过滤掉没有 base64 / url 的坏条目，避免把 null 发进请求体。
    refs = refs.filter(function (it) { return !!uriOf(it); });

    var promptField = model.roles.prompt ? findField(model.roles.prompt) : null;
    var prompt = String(opts.promptOverride != null ? opts.promptOverride
      : ($("promptInput") && $("promptInput").value) || "").trim();
    /* 生成页 / 对话页都只发送用户输入本身：
       不加前缀、不加英文后缀、不追加比例 / 边缘 / 空像素约束。
       用户输入什么，后台提示词就是什么。 */
    var isChatScreen = st.screen === "screenChat" || (opts && opts.fromChat);
    if (promptField && prompt) {
      body[promptField.name] = prompt;
    }

    var srcField = model.roles.source ? findField(model.roles.source) : null;
    var refFields = (model.roles.refs || []).slice();

    if (srcField) {
      // 空白选区不发送占位图，只通过 width / height 提供比例。
      var effSource = (source && !source.blank && uriOf(source)) ? source : null;
      if (srcField.ui === "image") {
        if (effSource) body[srcField.name] = uriOf(effSource);
      } else {
        var arr = [];
        if (effSource) arr.push(effSource);
        arr = arr.concat(refs);
        if (arr.length) body[srcField.name] = arr.map(uriOf);
      }
      refFields = refFields.filter(function (n) { return n !== srcField.name; });
    } else if (refFields.length && (source || refs.length)) {
      var first = findField(refFields[0]);
      var list = (source && !source.blank && uriOf(source) ? [source] : []).concat(refs);
      var uris = list.map(uriOf);
      if (first.wrap === "tag") body[first.name] = list.map(function (it, i) { return { url: uriOf(it), tag: String(it.name || ("ref" + (i + 1))).slice(0, 40) }; });
      else if (first.wrap === "strength") body[first.name] = uris.map(function (u) { return { url: u, strength: 0.5 }; });
      else body[first.name] = uris;
      refFields = refFields.slice(1);
    }

    refFields.forEach(function (name) {
      var f = findField(name);
      if (!f || !refs.length) return;
      var uris = refs.map(uriOf);
      if (f.wrap === "strength") body[name] = uris.map(function (u) { return { url: u, strength: 0.5 }; });
      else if (f.wrap === "tag") body[name] = refs.map(function (it, i) { return { url: uriOf(it), tag: String(it.name || ("ref" + (i + 1))).slice(0, 40) }; });
      else body[name] = uris;
    });

    var w = (typeof opts.width === "number" && opts.width) ? opts.width : (source ? source.width : 0);
    var h = (typeof opts.height === "number" && opts.height) ? opts.height : (source ? source.height : 0);

    /* 尺寸参数统一按「输入图/选区的实际像素」推断：
        · 支持 aspect_ratio 的模型发送最接近的比例；
        · 支持 resolution 的模型按模型枚举选档（4K 画布不再被压成 1K）；
        · 只有 width/height 的模型按比例放大到模型允许的上限；
        · 纯文生图（没有输入图）仍使用模型默认值，避免无意中把每张图都升到 4K。 */
    if (w && h) {
      var aspectField = findField("aspect_ratio");
      if (aspectField && aspectField.enum && body[aspectField.name] === undefined) {
        body[aspectField.name] = ratioEnum(aspectField, w, h);
      }

      var resolutionField = findField("resolution");
      if (resolutionField && resolutionField.enum && body[resolutionField.name] === undefined) {
        body[resolutionField.name] = resolutionEnum(resolutionField, w, h);
      }

      var widthField = findField("width");
      var heightField = findField("height");
      var hasAspect = !!(aspectField && body[aspectField.name] !== undefined);
      var hasResolution = !!(resolutionField && body[resolutionField.name] !== undefined);
      if (!hasAspect && !hasResolution && widthField && heightField &&
          body[widthField.name] === undefined && body[heightField.name] === undefined) {
        var fit = fitSizeFields(widthField, heightField, w, h);
        body[widthField.name] = fit.width;
        body[heightField.name] = fit.height;
      }
    }

    /* 图生图固定使用原版 Krea 面板的经验值：
     *   strength = 0.5 ——保留一半原图像素，边缘/光影更连续；
     *   creativity = raw ——关闭提示词扩展，避免编辑时被扩写出无关内容。
     * 只对声明了 hasStrength 的模型生效，纯文生图不受影响。
     */
    var editSource = !!(source && !source.blank &&
      (source.kind === "selection" || source.kind === "file" ||
       source.kind === "remote" || source.kind === "ref" || source.remote));
    if (editSource && model.roles.hasStrength) {
      var strengthField = findField("strength");
      if (strengthField && body[strengthField.name] === undefined) {
        body[strengthField.name] = 0.5;
      }
      var creativityField = findField("creativity");
      if (creativityField && body[creativityField.name] === undefined) {
        body[creativityField.name] = "raw";
      }
    }

    model.fields.forEach(function (f) {
      if (!f.required) return;
      if (body[f.name] !== undefined) return;
      if (f.role === "source" || f.role === "refs" || f.role === "media") return;
      if (f.role === "prompt") return;

      if (f.name === "aspect_ratio" && f.enum) {
        body[f.name] = ratioEnum(f, w, h);
        return;
      }
      if (f.enum && f.enum.length) { body[f.name] = f.enum[0]; return; }
      if (f.ui === "boolean") { body[f.name] = (f.default === undefined ? false : !!f.default); return; }
      if (f.ui === "slider" || f.ui === "number") {
        if (f.default !== undefined) { body[f.name] = f.default; return; }
        if (f.name === "width" && w) { body[f.name] = clampDim(f, w); return; }
        if (f.name === "height" && h) { body[f.name] = clampDim(f, h); return; }
        var lo = (typeof f.min === "number") ? f.min : 0;
        var hi = (typeof f.max === "number") ? f.max : lo + 1;
        body[f.name] = f.type === "integer" ? Math.round((lo + hi) / 2) : lo + (hi - lo) / 2;
        return;
      }
    });

    var pf = model.roles.prompt;
    if (!isChatScreen) {
      // 提示词保持用户输入原文：这里只记录日志，不做任何拼接或改写。
      if (pf && body[pf]) console.log("[Krea] prompt =>", body[pf]);
    }
    return body;
  }

  /** 尺寸字段按模型上下限收敛 */
  function clampDim(field, px) {
    var v = Math.round(px);
    if (typeof field.min === "number") v = Math.max(field.min, v);
    if (typeof field.max === "number") v = Math.min(field.max, v);
    return v;
  }

  /**
   */
  function validateRequired(fields, body, opts) {
    opts = opts || {};
    var missing = [];
    fields.forEach(function (f) {
      if (!f.required) return;
      if (opts.skipImageRoles && (f.role === "source" || f.role === "refs")) return;
      if (opts.skipPrompt && f.role === "prompt") return;
      var v = body[f.name];
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) {
        missing.push(I18N.fieldLabel(f.name, f.label));
      }
    });
    return missing;
  }

  /* */
  function isMediaUrl(url) {
    return /\.(mp4|webm|mov|m4v|mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/i.test(String(url || ""));
  }

  /* ------------------------------ 生成页状态 UI ------------------------------ */
  function setGenerateError(message) {
    var el = $("error-message");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("hidden", !message);
  }

  function setGenerateButtonMode(again) {
    var btn = $("generateBtn");
    if (!btn) return;
    // 按钮只保留「生成」；genAgain 仅用于内部复用上一次输入图，不再改文案。
    var key = "gen.run";
    var tip = "gen.generateTip";
    btn.setAttribute("data-i18n", key);
    btn.setAttribute("data-i18n-title", tip);
    btn.textContent = T(key);
    btn.title = T(tip);
  }

  function sameSelection(a, b) {
    if (!a || !b) return false;
    return Math.round(a.left) === Math.round(b.left) &&
      Math.round(a.top) === Math.round(b.top) &&
      Math.round(a.right) === Math.round(b.right) &&
      Math.round(a.bottom) === Math.round(b.bottom);
  }

  function resetGenerateButtonMode() {
    if (!st.genAgain) return;
    st.genAgain = false;
    st.lastGenShot = null;
    st.lastGenSelection = null;
    setGenerateButtonMode(false);
  }

  async function runPipeline(opts) {
    // 所有页面共用标签栏下方的运行框（overlayProgress），不再各画一套 loading。
    // opts: {submit: async()->jobId, title, keepOpen, preserveCancel}
    // 生成页 / 对话页在抓选区阶段就允许取消；此时不能把用户刚点的取消重置掉。
    if (!opts.preserveCancel) st.cancelFlag = false;
    if (st.cancelFlag) { toast(T("gen.cancelled")); return null; }
    var keepOpen = !!opts.keepOpen;
    var failed = false;
    showProgress(T("gen.phase.submit"), opts.title || "", true);
    startProgressTimer();
    try {
      var jobId = await opts.submit();
      setProgress(T("gen.phase.poll"), "");
      var result = await API.waitForJob(jobId, {
        intervalMs: 2500,
        isCancelled: function () { return st.cancelFlag; },
        onTick: function (status, progress) {
          var detail = T("gen.status", { status: status });
          if (typeof progress === "number" && progress > 0) detail += " · " + Math.round(progress * 100) + "%";
          setProgress(null, detail);
        }
      });
      // 任务已完成即写入本地已加载的资产列表；后续下载 / 置入失败也不影响记录。
      // 这样用户切回资产页时不需要为了新结果再拉一次 /jobs。
      noteAssetJob(result.raw, jobId);
      setProgress(T("gen.phase.download"), "");
      // 下载阶段没有可取消的轮询；隐藏失效的取消按钮。
      $("btnProgressCancel").classList.add("hidden");
      var primary = result.primary;
      // 视频 / 音频结果不下载：置入图层没有意义，交给浏览器打开
      if (isMediaUrl(primary)) {
        if (!keepOpen) hideProgress();
        return { primary: primary, base64: null };
      }
      var b64;
      try {
        b64 = await API.downloadBase64(primary);
      } catch (e) {
        // 任务已经成功，只是本地下载失败：把结果 URL / jobId 一并抛给调用方，
        // 让 UI 提供「重试下载」，而不是把整次运行判为失败、诱导用户重跑。
        if (e && !e.primary) e.primary = primary;
        if (e && !e.jobId) e.jobId = jobId;
        throw e;
      }
      if (!keepOpen) hideProgress();
      return { primary: primary, base64: b64 };
    } catch (e) {
      failed = true;
      hideProgress();
      if (e && e.code === "cancelled") { toast(T("gen.cancelled")); return null; }
      // 服务端任务失败 / 取消：同步资产页里可能存在的“进行中”卡片。
      if (e && (e.code === "job_failed" || e.code === "job_cancelled")) {
        markAssetJobFailed(jobId, e.code === "job_cancelled" ? "cancelled" : "failed");
      }
      throw e;
    } finally {
      // keepOpen 成功时把运行框留给调用方（例如生成页还要「置入图层」）。
      if (!keepOpen || failed) stopProgressTimer();
    }
  }

  /* */
  function handleMediaResult(primary) {
    // 失败时 tryOpenExternal 已经吞掉异常，不会触发全局致命横幅。
    tryOpenExternal(primary).then(function (ok) {
      toast(T(ok ? "apps.mediaResult" : "apps.mediaOpenFailed"), "error");
    });
  }

  async function placeResult(base64, title, forcedMode) {
    var snapshot = st.lastSnapshot || { docId: null, selection: null };
    // 生成页默认使用「插入为新图层 / 替换原图层」设置；
    // App 运行页显式传 newLayer，避免沿用生成页的“替换”设置造成意外覆盖。
    var mode = forcedMode || (st.prefs.outputMode === "replace" ? "replace" : "newLayer");
    try {
      var res = await PS.place({
        base64: base64,
        docId: snapshot.docId,
        selection: snapshot.selection,
        mode: mode,
        name: title || "Krea"
      });
      if (res && res.replaceSkipped) {
        // 替换失败时结果仍保留在新图层，必须明确告知用户，避免误以为原图层已被覆盖。
        toast(T(res.replaceSkipped === "locked" ? "gen.replaceLocked" : "gen.replaceFailed"), "error");
      } else {
        toast(T("gen.placed", { name: res.name }), "ok");
      }
      return res;
    } catch (e) {
      // 文档被关闭等情况：把结果留在插件数据目录，并把落盘路径告诉用户
      var savedPath = "";
      try {
        var saved = await PS.writePng(base64, "krea-result-" + Date.now() + ".png");
        savedPath = (saved && (saved.nativePath || saved.name)) || "";
      } catch (e2) { /* ignore */ }
      toast(savedPath ? T("gen.docClosed") + " → " + savedPath : T("gen.docClosed"), "error");
      return null;
    }
  }

  /**
   * 结果 URL 可能是短期签名地址。下载失败后重试前先重新查询一次 job，
   * 拿到最新地址；查询失败就继续用原地址，不阻断重试。
   */
  async function refreshResultUrl(url, jobId) {
    if (!url || !jobId) return url;
    try {
      var job = await API.getJob(jobId);
      var fresh = API.pickResultUrl(job && job.result);
      return fresh || url;
    } catch (e) {
      return url;
    }
  }

  function hideDownloadRecovery() {
    var host = $("downloadRecovery");
    if (!host) return;
    clear(host);
    host.classList.add("hidden");
  }

  /**
   * 任务已成功但图片下载失败时，让用户只重试“下载”这一环。
   * 生成页 / 对话页共用同一条常驻恢复栏（和 App 页一致）：
   * 重试只下载结果，绝不重新提交任务，也不会再次扣费。
   * 返回下载到的 base64；用户选择在浏览器打开时返回 null。
   */
  async function recoverDownloadInteractive(url, title, jobId) {
    if (!url) return null;
    return new Promise(function (resolve) {
      hideDownloadRecovery();
      var host = $("downloadRecovery");
      if (!host) { resolve(null); return; }

      var box = mk("div", { class: "notice warn" });
      var msg = mk("div", {
        class: "wrap",
        text: (title ? title + " · " : "") + T("download.failed")
      });
      var actions = mk("div", { class: "recovery-actions" });
      var retryBtn = mk("sp-button", {
        size: "s", variant: "cta", text: T("download.retry"),
        on: { click: function () { retry(); } }
      });
      var openBtn = mk("sp-button", {
        size: "s", variant: "secondary", text: T("download.open"),
        on: { click: function () { openInBrowser(); } }
      });
      actions.appendChild(retryBtn);
      actions.appendChild(openBtn);
      box.appendChild(msg);
      box.appendChild(actions);
      host.appendChild(box);
      host.classList.remove("hidden");

      var busy = false;
      function setBusy(on) {
        busy = !!on;
        retryBtn.disabled = busy;
        openBtn.disabled = busy;
      }
      function finish(value) {
        hideProgress();
        hideDownloadRecovery();
        resolve(value);
      }

      async function retry() {
        if (busy) return;
        setBusy(true);
        // 单次下载不可中断，不显示无效的取消按钮。
        showProgress(T("gen.phase.download"), title || "", false);
        startProgressTimer();
        try {
          var freshUrl = await refreshResultUrl(url, jobId);
          var b64 = await API.downloadBase64(freshUrl);
          hideProgress();
          finish(b64);
        } catch (e) {
          hideProgress();
          setBusy(false);
          msg.textContent = (title ? title + " · " : "") + T("download.failedAgain", { msg: errMsg(e) });
          toast(T("download.failedAgain", { msg: errMsg(e) }), "error");
          // 恢复栏保留，用户可以再次重试或改为浏览器打开。
        }
      }

      async function openInBrowser() {
        if (busy) return;
        setBusy(true);
        try {
          var opened = await openExternal(await refreshResultUrl(url, jobId), T("download.opened"));
          if (opened) finish(null);
          else setBusy(false);
        } catch (e2) {
          setBusy(false);
          toast(T("download.failedAgain", { msg: errMsg(e2) }), "error");
        }
      }
    });
  }

  /** App 成功后先询问置入位置，不直接改当前文档。 */
  async function askAndPlaceAppResult(base64, title) {
    var dest = await sheet(T("apps.placeTitle"), T("apps.placeMessage"), [
      { label: T("apps.placeCurrent"), value: "current", variant: "cta" },
      { label: T("apps.placeNewDoc"), value: "newDocument" }
    ]);
    if (!dest) return null;
    return await placeAppResult(base64, title, dest);
  }

  async function placeAppResult(base64, title, dest) {
    if (dest === "newDocument") {
      // imageSizeFromBase64 返回 { width, height }，不是 { w, h }。
      // 解析失败时不再伪装成 1024：PS.place 会优先直接 app.open 原始 PNG，
      // 画布尺寸由 Photoshop 按真实像素决定；只有旧版 PS 走 documents.add 时才需要宽高。
      var size = PS.imageSizeFromBase64(base64);
      try {
        var res = await PS.place({
          base64: base64,
          mode: "newDocument",
          docWidth: size && size.width,
          docHeight: size && size.height,
          name: title || "Krea"
        });
        toast(T("gen.placed", { name: res.name }), "ok");
        return res;
      } catch (e) {
        handleError(e, "app-place-newdoc");
        return null;
      }
    }
    // 当前画布：App 页没有“替换原图层”开关，统一插入新图层。
    return await placeResult(base64, title, "newLayer");
  }

  function hideAppRecovery() {
    st.appRecovery = null;
    var host = $("appRunRecovery");
    if (!host) return;
    clear(host);
    host.classList.add("hidden");
  }

  /** App 页的持久恢复条：重试只下载，不会重新执行 App。 */
  function showAppRecovery(url, title, jobId) {
    st.appRecovery = { url: url, title: title || "Krea", jobId: jobId || null };
    var host = $("appRunRecovery");
    if (!host) return;
    clear(host);
    host.classList.remove("hidden");
    var box = mk("div", { class: "notice warn" });
    box.appendChild(mk("div", { class: "wrap", text: T("download.failed") }));
    var actions = mk("div", { class: "recovery-actions" });
    actions.appendChild(mk("sp-button", {
      size: "s", variant: "cta", text: T("download.retry"),
      on: { click: function () { onRetryAppDownload(); } }
    }));
    actions.appendChild(mk("sp-button", {
      size: "s", variant: "secondary", text: T("download.open"),
      on: { click: function () { onOpenAppResult(); } }
    }));
    box.appendChild(actions);
    host.appendChild(box);
  }

  async function onRetryAppDownload() {
    if (st.busy || !st.appRecovery) return;
    var job = st.appRecovery;
    st.busy = true;
    $("appRunError").textContent = "";
    // 单次下载不可中断，不显示无效的取消按钮。
    showProgress(T("gen.phase.download"), job.title, false);
    startProgressTimer();
    try {
      var freshUrl = await refreshResultUrl(job.url, job.jobId);
      var b64 = await API.downloadBase64(freshUrl);
      hideProgress();
      hideAppRecovery();
      await askAndPlaceAppResult(b64, job.title);
    } catch (e) {
      hideProgress();
      $("appRunError").textContent = T("download.failedAgain", { msg: errMsg(e) });
      toast(T("download.failedAgain", { msg: errMsg(e) }), "error");
    } finally {
      st.busy = false;
    }
  }

  async function onOpenAppResult() {
    if (!st.appRecovery) return;
    var job = st.appRecovery;
    // 签名地址可能已过期，先重新查询一次 job。
    openExternal(await refreshResultUrl(job.url, job.jobId), T("download.opened"));
  }

  async function onGenerate() {
    if (st.busy) return;
    var model = MODELS.models[st.model];
    if (!model) return;
    setGenerateError("");
    if (!API.hasToken()) { toast(T("err.noToken"), "error"); show("screenSetup"); return; }

    var prompt = currentPromptText();
    var promptField = null;
    model.fields.forEach(function (f) { if (f.name === model.roles.prompt) promptField = f; });
    if (promptField && promptField.required && !prompt) {
      setGenerateError(T("gen.needPrompt"));
      toast(T("gen.needPrompt"), "error");
      return;
    }

    st.busy = true;
    st.cancelFlag = false;
    var generateBtn = $("generateBtn");
    if (generateBtn) generateBtn.disabled = true;
    // 和 App 运行页一致：进度统一显示在标签栏下方的运行框里。
    // 抓选区阶段也允许取消；抓图返回后会先检查取消标记，不会继续提交任务。
    showProgress(T("gen.phase.capture"), modelLabel(st.model), true);
    startProgressTimer();
    try {
      // 和原版一致：每次生成都重新读取当前选区，不使用进入页面时的缓存。
      // 「再次生成」且选区没变时复用上一次的输入图，避免把刚生成的结果层
      // 重新抓进模型（原版通过临时隐藏上一结果层达到同样目的）。
      var doc = PS.activeDoc();
      if (!doc) throw new Error(T("gen.needDoc"));
      var selection = await PS.getSelection(doc);
      if (!selection) throw new Error(T("gen.needSelection"));
      if (st.cancelFlag) { toast(T("gen.cancelled")); return; }

      var snap;
      var canReuse = !!(st.genAgain && st.lastGenShot &&
        st.lastGenSelection && sameSelection(selection, st.lastGenSelection) &&
        st.lastSnapshot && st.lastSnapshot.docId === doc.id);
      if (canReuse) {
        snap = { docId: doc.id, selection: selection, shot: st.lastGenShot };
        st.source = sourceFromShot(st.lastGenShot);
      } else {
        if (st.genAgain) {
          st.genAgain = false;
          setGenerateButtonMode(false);
        }
        snap = await captureSelectionForGenerate(doc, selection);
      }
      var shot = snap.shot;
      var refs = st.refs.slice();
      var requestSource = sourceFromShot(shot);
      var requestRefs = refs;

      // 原版行为：空白选区但添加了参考图时，把第一张参考图当作输入图。
      if (requestSource.blank && refs.length) {
        var firstRef = refs[0];
        requestSource = {
          base64: firstRef.base64,
          mime: firstRef.mime || "image/png",
          name: firstRef.name || "ref",
          width: shot.width,
          height: shot.height,
          kind: "ref",
          blank: false
        };
        requestRefs = refs.slice(1);
      }

      var body = buildGenerateBody({
        promptOverride: prompt,
        source: requestSource,
        refs: requestRefs,
        width: shot.width,
        height: shot.height
      });

      var missing = validateRequired(
        model.fields.filter(function (f) { return f.required; }),
        body,
        { skipImageRoles: true, skipPrompt: true }
      );
      if (missing.length) throw new Error(T("gen.needRequired", { fields: missing.join("、") }));
      if ((model.roles.refs || []).length && model.roles.refs.some(function (n) {
        var f = null;
        model.fields.forEach(function (x) { if (x.name === n) f = x; });
        return f && f.required && !body[n];
      })) {
        throw new Error(T("gen.needSource"));
      }

      // 落位使用抓图时记录的选区，而不是生成结束后的实时选区。
      // 抓图期间点了取消就到此为止，不提交任务。
      if (st.cancelFlag) { toast(T("gen.cancelled")); return; }
      st.lastSnapshot = { docId: snap.docId, selection: snap.selection };
      var out = await runPipeline({
        title: modelLabel(st.model),
        keepOpen: true,
        preserveCancel: true,
        submit: function () { return API.generate(st.model, body); }
      });
      if (!out) return;
      if (!out.base64) { handleMediaResult(out.primary); return; }
      setProgress(T("gen.phase.place"), "");
      var placed = await placeResult(out.base64, modelLabel(st.model));
      if (placed) {
        st.genAgain = true;
        st.lastGenShot = shot;
        st.lastGenSelection = selection;
        setGenerateButtonMode(true);
      }
      pushHistory(prompt || modelLabel(st.model));
    } catch (e) {
      if (e && e.code === "download") {
        // 生成已完成，只是下载失败：不要显示“整次失败”，先让用户只重试下载。
        setGenerateError(errMsg(e));
        hideProgress();
        var recovered = await recoverDownloadInteractive(e.primary, modelLabel(st.model), e.jobId);
        if (recovered) {
          setGenerateError("");
          showProgress(T("gen.phase.place"), modelLabel(st.model), false);
          startProgressTimer();
          var recoveredPlace = await placeResult(recovered, modelLabel(st.model));
          if (recoveredPlace) {
            st.genAgain = true;
            st.lastGenShot = shot;
            st.lastGenSelection = selection;
            setGenerateButtonMode(true);
          }
          pushHistory(prompt || modelLabel(st.model));
        }
        return;
      }
      setGenerateError(errMsg(e));
      handleError(e, "generate");
    } finally {
      st.busy = false;
      if (generateBtn) generateBtn.disabled = false;
      hideProgress();
      stopProgressTimer();
    }
  }

  /* ============================================================ 对话（Krea Agent） */
  function syncChatUi() {
    var input = $("chatPrompt");
    if (input) input.setAttribute("placeholder", T("chat.agentPlaceholder"));
    updateChatModelLabel();
  }

  function onEnterChat() {
    // 进入页面不再自动抓选区（避免无意义的 PS 模态截屏闪烁）。
    // 上传的图片保留；上次发送时抓到的选区图在重新进入时清掉，发送前会按当前选区重新抓。
    if (st.source && st.source.kind !== "file") st.source = null;
    syncChatUi();
    renderChatStream();
    renderChatSource();
  }

  function renderChatSource() {
    var strip = $("chatSourceThumb");
    if (!strip) return;
    clear(strip);
    if (!st.source || st.source.blank) { fitChatStream(); return; }
    var cell = mk("div", { class: "thumb-cell" });
    var img = mk("img", { alt: st.source.name || "source" });
    img.src = uriOf(st.source);
    cell.appendChild(img);
    cell.appendChild(mk("button", {
      class: "x", text: "×",
      on: { click: function () { st.source = null; renderChatSource(); } }
    }));
    strip.appendChild(cell);
    fitChatStream();
  }

  async function writeClipboardText(text) {
    try {
      await navigator.clipboard.write({ "text/plain": String(text || "") });
      return true;
    } catch (e) {
      console.warn("[Krea for Ps] clipboard write failed", e);
      return false;
    }
  }

  async function copyAgentText(text) {
    var ok = await writeClipboardText(text);
    toast(T(ok ? "chat.agentCopied" : "chat.agentCopyFailed"), ok ? "ok" : "error");
  }

  function sendAgentTextToGenerate(text) {
    if (!text) return;
    var value = String(text);
    st.pendingPrompt = value;
    showTab("generate");
    // onEnterGenerate() -> renderModelForm() 会消费并清空 pendingPrompt；
    // 这里用局部 value 回填，不能再次读 st.pendingPrompt（此时已经是 null）。
    var input = $("promptInput");
    if (input) input.value = value;
    toast(T("chat.agentSentToGenerate"), "ok");
  }

  function agentRoleLabel(item) {
    if (item.role === "user") return T("chat.agentYou");
    if (item.role === "error") return T("chat.agentName");
    var model = item.model ? " · " + llmLabel(item.model) : "";
    return T("chat.agentName") + model;
  }

  function renderAgentStream(host) {
    if (!st.agentHistory.length) {
      host.appendChild(mk("div", { class: "chat-empty", text: T("chat.agentEmpty") }));
      fitChatStream();
      return;
    }
    st.agentHistory.forEach(function (item) {
      var role = item.role === "user" ? "user" : item.role === "error" ? "error" : "assistant";
      var box = mk("div", { class: "agent-msg " + role });
      box.appendChild(mk("div", { class: "agent-role", text: agentRoleLabel(item) }));
      if (item.pending) {
        box.appendChild(mk("div", { class: "agent-pending", text: T("chat.agentPending") }));
      } else {
        box.appendChild(mk("div", { class: "agent-text", text: item.text || "" }));
      }
      if (role === "assistant" && !item.pending) {
        var actions = mk("div", { class: "agent-actions" });
        actions.appendChild(mk("button", {
          type: "button",
          text: T("chat.agentCopy"),
          on: { click: function () { copyAgentText(item.text); } }
        }));
        actions.appendChild(mk("button", {
          type: "button",
          text: T("chat.agentUseAsPrompt"),
          on: { click: function () { sendAgentTextToGenerate(item.text); } }
        }));
        box.appendChild(actions);
      }
      host.appendChild(box);
    });
    fitChatStream();
    host.scrollTop = host.scrollHeight;
  }

  function renderChatStream() {
    var host = $("chatStream");
    if (!host) return;
    clear(host);
    renderAgentStream(host);
  }

  function agentErrorText(e) {
    if (!e) return T("err.generic", { msg: "unknown" });
    if (e.code === "cancelled") return T("chat.agentStopped");
    if (e.code === "agent_timeout") return T("chat.agentTimeout");
    if (e.status === 402) return T("chat.agentNoCredits");
    if (e.status === 403) return T("chat.agentModelNotAllowed");
    if (e.status === 404) return T("chat.agentAttachmentMissing");
    if (e.status === 409) return T("chat.agentBusy");
    if (e.status === 422) return T("chat.agentInvalid", { msg: errMsg(e) });
    return T("err.generic", { msg: errMsg(e) });
  }

  function setChatBusy(on) {
    st.busy = !!on;
    var ids = ["chatSendBtn", "chatBtnPick", "chatBtnUseSelection", "chatClearBtn"];
    ids.forEach(function (id) {
      var el = $(id);
      if (el) el.disabled = !!on;
    });
  }

  /**
   * Agent 只接受公开 URL / Krea 文件 URI。这里优先复用已上传的地址；
   * 第一次发送时把 PS 选区或本地文件上传到 /assets。
   */
  async function agentAttachmentFromSource() {
    var src = st.source;
    if (!src || src.blank) return null;
    if (src.assetUrl) {
      return { url: src.assetUrl, name: src.assetName || src.name || "image", contentType: src.assetMime || src.mime || "image/jpeg" };
    }
    if (src.url && /^https?:\/\//i.test(src.url)) {
      return { url: src.url, name: src.name || "image", contentType: src.mime || "image/jpeg" };
    }
    if (!src.base64) return null;
    var mime = src.mime || mimeOfBase64(src.base64) || "image/jpeg";
    var name = src.name || "image";
    var uploaded = await API.uploadAsset(src.base64, mime, name);
    src.assetUrl = uploaded.image_url;
    src.assetName = name;
    src.assetMime = mime;
    return { url: uploaded.image_url, name: name, contentType: mime };
  }

  async function onAgentChatSend() {
    if (st.busy) return;
    if (!API.hasToken()) { toast(T("err.noToken"), "error"); show("screenSetup"); return; }
    var input = $("chatPrompt");
    var prompt = String(input && input.value || "").trim();
    if (!prompt) { toast(T("gen.needPrompt"), "error"); return; }

    setChatBusy(true);
    st.cancelFlag = false;
    var submitted = false;
    var userItem = { role: "user", text: prompt, ts: Date.now() };
    var placeholder = { role: "assistant", text: "", model: st.agentModel || "", ts: Date.now(), pending: true };
    st.agentHistory.push(userItem);
    st.agentHistory.push(placeholder);
    renderChatStream();
    if (input) input.value = "";
    showProgress(T(st.source && !st.source.blank ? "chat.agentUploading" : "chat.agentSending"), "", false);
    startProgressTimer();

    try {
      var attachment = await agentAttachmentFromSource();
      var body = { prompt: prompt };
      if (st.agentSessionId) body.sessionId = st.agentSessionId;
      else body.name = AGENT_SESSION_NAME;
      if (st.agentModel) body.model = st.agentModel;
      if (attachment) body.attachments = [attachment];

      setProgress(T("chat.agentSending"), llmLabel(st.agentModel));
      var start = await API.sendAgentMessage(body);
      if (!start || !start.sessionId || !start.runId) throw new Error("Agent 未返回 sessionId / runId");
      submitted = true;
      st.agentSessionId = start.sessionId;
      st.agentRunId = start.runId;

      setProgress(T("chat.agentWaiting"), llmLabel(st.agentModel));
      var startedAt = Date.now();
      var wait = null;
      while (true) {
        wait = await API.waitForAgentSession(st.agentSessionId, st.agentRunId, AGENT_WAIT_SECONDS);
        if (wait && wait.finished) break;
        var waited = Math.round((Date.now() - startedAt) / 1000);
        if (Date.now() - startedAt > AGENT_MAX_WAIT_MS) {
          var timeoutErr = new Error(T("chat.agentTimeout"));
          timeoutErr.code = "agent_timeout";
          throw timeoutErr;
        }
        setProgress(null, T("chat.agentWaitDetail", { s: waited }));
      }
      if (wait.status === "failed") throw new Error(wait.error || T("chat.agentNoReply"));
      if (wait.status === "cancelled") {
        var cancelled = new Error(T("gen.cancelled"));
        cancelled.code = "cancelled";
        throw cancelled;
      }
      var text = String(wait.text || "").trim() || T("chat.agentNoReply");
      placeholder.pending = false;
      placeholder.text = text;
      renderChatStream();
      pushHistory(prompt);
    } catch (e) {
      placeholder.pending = false;
      placeholder.role = "error";

      if (e && e.status === 403) {
        if (Array.isArray(e.allowedModels) && e.allowedModels.length) st.agentAllowed = e.allowedModels.slice();
        st.agentModel = "";
        S.setPrefs({ agentModel: "" });
        updateChatModelLabel();
        placeholder.text = T("chat.agentModelFallback");
        toast(placeholder.text, "error");
      } else {
        placeholder.text = agentErrorText(e);
        if (API.isAuthError(e)) handleError(e, "chat-agent");
        else toast(placeholder.text, "error");
      }
      renderChatStream();

      if (!submitted) {
        // 请求还没创建/继续会话：撤销这两条消息并恢复输入，避免重试时出现重复提问。
        st.agentHistory.pop();
        st.agentHistory.pop();
        renderChatStream();
        if (input && !String(input.value || "").trim()) input.value = prompt;
      }
    } finally {
      setChatBusy(false);
      hideProgress();
      stopProgressTimer();
    }
  }

  async function onChatSend() {
    return await onAgentChatSend();
  }

  function chatHasContent() {
    var input = $("chatPrompt");
    return !!(st.agentHistory.length || st.source ||
      (input && String(input.value || "").trim()));
  }

  async function onChatClear() {
    if (st.busy || !chatHasContent()) return;
    if (!(await confirmSheet(T("chat.clearConfirm")))) return;
    // 「清空对话」清掉消息、上传/选区的输入图和输入框草稿，
    // 并结束本地 Agent 会话上下文（服务端历史不会删除，但后续消息会另起会话）。
    st.agentHistory = [];
    st.agentSessionId = null;
    st.agentRunId = null;
    st.agentAllowed = null;
    st.source = null;
    var input = $("chatPrompt");
    if (input) input.value = "";
    renderChatStream();
    renderChatSource();
    toast(T("chat.clear"), "ok");
  }

  async function snapshotPs() {
    var snap = { docId: null, selection: null };
    try {
      var doc = PS.activeDoc();
      if (doc) {
        snap.docId = doc.id;
        var sel = await PS.getSelection(doc);
        if (sel) snap.selection = sel;
      }
    } catch (e) { /* ignore */ }
    return snap;
  }


/* ============================================================= */
/* 官网精选 App 离线兜底（2026-10-20 抓取自 krea.ai/nodes?tab=apps） */
/* 只保留 scope=public；账号自己的 user / workspace App 走「工作区」实时接口，
 * 不能混进精选，否则网页上看不到的个人 App 会一直出现在「全部」里。 */
/* v2.3.7：在线时优先同步仓库根目录 featured-apps.json；这张表只在首次安装或
 * 网络不可用时使用，官网新增/下架精选不需要再改这里、也不需要重新发版。 */
var FEATURED_APPS = [
{"id": "0ce4f2cf-624f-4c9b-80f0-9365b1623525", "name": "image prompting", "slug": "image-prompting-1", "scope": "public", "username": "vicc", "description": "", "node_app_version_id": "8dae2595-78a8-4abe-970d-da3932d9c3b6", "version": 3, "example_outputs": []},
{"id": "16cdd16f-a415-4285-94eb-8dca239ecab3", "name": "image prompting", "slug": "image-prompting", "scope": "public", "username": "vicc", "description": "", "node_app_version_id": "3f9624e9-810d-4730-ad49-8d7652a50bb9", "version": 1, "example_outputs": []},
{"id": "bb686798-8d93-439a-9724-afb934bbe860", "name": "text expansion", "slug": "text-expansion", "scope": "public", "username": "vicc", "description": "", "node_app_version_id": "9113aded-0826-46f4-ac59-91d624831e19", "version": 1, "example_outputs": []},
{"id": "497c1aa0-420f-418a-820e-a55c4dcb7219", "name": "Frozen!", "slug": "frozen", "scope": "public", "username": "Beccu", "description": "Create eye-catching gravity-defying video. Using your portrait and a location, the app generates a realistic scene where", "node_app_version_id": "ca860a09-600e-4f25-b9cf-5711f005222a", "version": 2, "example_outputs": ["https://app-uploads.krea.ai/public/1b58fa05-6a9f-48c9-b66b-f56816527a12.png"]},
{"id": "7c6b8b92-e688-4b0c-877f-b9b76e6952de", "name": "Ceramic Me", "slug": "ceramic-me-2", "scope": "public", "username": "Beccu", "description": "Upload a portrait and transform it into a realistic ceramic sculpture. Create beautiful ceramic versions of your photos ", "node_app_version_id": "c9ae3025-d013-4927-91cf-bacc923493c2", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/5069ff92-6a6c-4864-934d-ef9857379995.png"]},
{"id": "4213f909-6048-4686-bc09-9317b42d7fab", "name": "Botanical editorial", "slug": "botanical-editorial", "scope": "public", "username": "Beccu", "description": "Upload your product and generate elegant botanical product editorials.", "node_app_version_id": "8baac758-dd31-48da-8e23-18fecfc4f8b5", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/27f234b3-2472-40b9-a5f7-bd4766016581-image.png"]},
{"id": "c714983d-5b5c-47ed-b622-f7a25cb4520e", "name": "Liquid Chrome Editorial", "slug": "liquid-chrome-editorial", "scope": "public", "username": "Beccu", "description": "Create a styled product editorial in one click.\nUpload a product image and generate a sculptural scene around it using l", "node_app_version_id": "d2701852-d9f7-422e-83cd-f608fc29d8b8", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/624c4579-d0e9-421d-b3e4-ebe880897787-image.png"]},
{"id": "0f376dfa-a5ba-442b-9566-3ccad6d1a0b8", "name": "Floral Product Editorial", "slug": "floral-product-editorial", "scope": "public", "username": "Beccu", "description": "Create a floral product editorial in one click.\nUpload an image of your product and the template will generate a styled ", "node_app_version_id": "344021d1-8edc-4797-b46e-baf092bf30bc", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/989196b8-6df4-4701-b8ee-14d61b97b634-image.png"]},
{"id": "19b49b99-71a7-4165-ba47-634d46bb76d9", "name": "Jell-O This", "slug": "jell-o-this", "scope": "public", "username": "Numan", "description": "Turn any object into soft Jell-O!", "node_app_version_id": "5298286d-4727-4fae-b8fa-0a430f020707", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/59b643cd-a235-4cad-b30d-3486eb20cc48-image.png"]},
{"id": "7aea8d81-fb57-45d7-b4bb-e536c805c633", "name": "Fossilize This", "slug": "fossilize-this", "scope": "public", "username": "Numan", "description": "Turn any object into an ancient artifact!", "node_app_version_id": "d85c7b6e-575e-48e6-ad6f-dbad7fee4e8b", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/ca930701-11c1-4583-a1a1-14cd90fa900c-image.png"]},
{"id": "7f5dc085-ab72-46ed-b7c8-37484c4706ad", "name": "Product Editorial Shot", "slug": "product-editorial-shot", "scope": "public", "username": "Numan", "description": "Just upload a single product image. ", "node_app_version_id": "3533d57f-8d23-4200-9833-cb5859560efa", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/bbb243d3-ab0a-4fbd-b525-0615833454d3.png"]},
{"id": "e7319a76-2f3a-4edb-877e-d2b27474aa81", "name": "Crystallize This", "slug": "crystallize-this", "scope": "public", "username": "Numan", "description": "Turn any object into a piece of art!", "node_app_version_id": "203df90c-ed0c-4a17-9bcc-b4b4a55d4a3d", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/1cfd5218-ce2a-457f-9f19-0a08a3df4f47.png"]},
{"id": "52be2a23-abff-4f1e-868a-196d50e6cfb1", "name": "Pet Valentine transformation", "slug": "pet-valentine-transformation", "scope": "public", "username": "oddatide", "description": "Turn your pet into a Valentine’s Day photo with heart-patterned fur.\n\nUpload a photo of your dog, cat, or any animal and", "node_app_version_id": "a9225d52-5ba7-436e-a8d5-bfa2bb8b7d2f", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/060a633b-67d4-473c-8400-9d7d96d8a0e4-image.jpeg"]},
{"id": "4c81f9a6-9b85-4b27-a34a-58e289494f4a", "name": "2016", "slug": "2016", "scope": "public", "username": "Numan", "description": "Not got any throwbacks from 2016? No problem!", "node_app_version_id": "a2c792cd-7236-4319-b68a-eaa49599cb94", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/506db1d1-a028-4d08-9564-5faea671f824-image.jpeg"]},
{"id": "f873cc92-7b1b-407e-b655-223c74f265f7", "name": "Jungle Run", "slug": "jungle-run", "scope": "public", "username": "Numan", "description": "Jungle Run", "node_app_version_id": "8a09c340-6cc1-438e-9659-d935a364733d", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/8c9bb0ae-9d9c-443a-aad8-50e902f13ec2-video.mp4"]},
{"id": "2e34862d-111b-45dc-939a-cee1d42d8214", "name": "Monday Blues", "slug": "monday-blues", "scope": "public", "username": "Numan", "description": "Monday Blues", "node_app_version_id": "80cf4040-5dab-4ba1-af5a-815e7856f88b", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/9348365c-7470-428e-b774-28ac354395a9-video.mp4"]},
{"id": "48b8c3d4-f1b5-45e6-acc4-f671e34943ee", "name": "Astro Danger", "slug": "astro-danger", "scope": "public", "username": "Numan", "description": "Cinematic Astronaut Scene", "node_app_version_id": "54b7ec5c-30e4-41f5-8ae1-ce21b4a0827e", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/4442e7f4-d640-45f9-a7a2-a068269d3848-video.mp4"]},
{"id": "8f452d90-aeb9-43dc-8378-4ef8f3e24a7f", "name": "Roast Me", "slug": "roast-me", "scope": "public", "username": "Numan", "description": "Upload a full outfit pic and let the Node roast you!", "node_app_version_id": "e2104db5-9216-4286-9b98-7b1c412349f2", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/28510121-6985-4494-9833-59b85311b9e1-image.jpeg"]},
{"id": "8dfa0656-d74c-452a-87fe-70a14da00c1f", "name": "Sims Character", "slug": "sims-character", "scope": "public", "username": "Numan", "description": "Upload an image of yourself and an environment!", "node_app_version_id": "f84e67e7-7c31-49db-9a46-ee197c633d88", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/2ef6a63e-950d-474f-b7eb-133e302279cb.png"]},
{"id": "6a7e2f8f-a515-4f38-9065-32e11cb82437", "name": "Animorph Yourself", "slug": "animorph-yourself", "scope": "public", "username": "Beccu", "description": "Upload your photo and an animal image, and get your own Animorph-style transformation sequence.", "node_app_version_id": "07a7dd30-9e58-4cbe-a344-5c053882234b", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/de066c86-3a58-4f60-9fb6-9f65891f5929.png"]},
{"id": "06a70961-db5a-4094-b126-9d5be1456fd6", "name": "Hydraulic Press", "slug": "hydraulic-press", "scope": "public", "username": "Numan", "description": "Watch your favourite item get crushed!", "node_app_version_id": "0e553be5-c175-4775-b67b-d57a3c545f7f", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/b293c6a2-7291-47c0-a8ec-b3afe65f433f.png"]},
{"id": "76b04248-c3d7-434f-a69b-fc0b1aa9bb36", "name": "Dollz Maker", "slug": "dollz-maker", "scope": "public", "username": "Beccu", "description": "Upload your image and instantly get a cute pixel-art version of yourself inspired by early 2000s doll makers.", "node_app_version_id": "f9e77638-96ea-49af-8c16-6fc314a1375b", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/1d2e94a8-76c0-4bc2-80a4-a44a3339a3be.png"]},
{"id": "c1d309bc-eee9-4834-828b-419d2a2ae54f", "name": "Digicam", "slug": "digicam", "scope": "public", "username": "Beccu", "description": "Upload an image and the app places your face onto the screen of an early-2000s point-and-shoot camera.", "node_app_version_id": "5feb80b2-137e-4503-bd73-32453526fe0a", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/ef96ccd7-8824-453c-88c8-63ca347a8e4a.png"]},
{"id": "0487ab93-cfd5-4320-936d-287025f8c90d", "name": "Rare Artifact", "slug": "rare-artifact", "scope": "public", "username": "Numan", "description": "Upload a product image (a high quality image with a white background will work best) ", "node_app_version_id": "7cf997e7-97c5-4636-aee6-db47976dc994", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/4271e290-2519-44e2-98e6-85190b194f03.png"]},
{"id": "f7b4f748-09ce-486b-b037-ca832ed7bc62", "name": "Moving Ad", "slug": "moving-ad", "scope": "public", "username": "Beccu", "description": "Upload an image or a poster, and the app places your design on the back of the vehicle and generates a video of the van ", "node_app_version_id": "070d323d-e2ae-4575-8b26-93ca445656c9", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/40b3f072-01ec-4320-a3d6-2c2f565b489b.png"]},
{"id": "a3c505bc-8a79-416e-a33b-9d3d985e03a4", "name": "CCTV Footage", "slug": "cctv-footage-1", "scope": "public", "username": "Beccu", "description": "Generate realistic multi-camera CCTV-style footage from a single image.\nUpload a photo and the app creates four differen", "node_app_version_id": "c9f76567-3a9d-46c7-8fa3-a7ff3ce9d3a6", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/1e260f88-d6e3-42e5-971e-fcaece484201.png"]},
{"id": "a947283b-7297-431a-a8a9-27e8839396e8", "name": "Fisheye", "slug": "fisheye", "scope": "public", "username": "Beccu", "description": "Upload your photo and we’ll turn you into a fisheye video shot on the streets of New York.", "node_app_version_id": "1221bd04-5934-41e5-8a4b-9fce2b9dbc4d", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/4524b11a-6bf3-425d-9079-6c7f08ad2384.png"]},
{"id": "5671c151-79bf-451a-9ef6-e291e03c7a0c", "name": "Arabian drift core", "slug": "arabian-drift-core", "scope": "public", "username": "Beccu", "description": "Upload your portrait and a car image, and we’ll turn them into a surreal desert-drift artwork like this.", "node_app_version_id": "182474a7-2d3d-4e71-ae22-7e62f029d64a", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/7a4a5cab-dd16-4fd5-9879-c41c66693e29.png"]},
{"id": "a1aa980e-77a8-4eed-bbe5-3fa078b04e91", "name": "Floating On Water", "slug": "floating-on-water", "scope": "public", "username": "Numan", "description": "Upload your product image and let Krea do the rest.", "node_app_version_id": "cb9d4074-a467-40d2-82b2-ed8be60fff1c", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/88027ea7-a102-4c8d-bfed-9cbd1d93b2b3.png"]},
{"id": "83855da9-f5a8-4418-8dbd-ec9c989d2ef1", "name": "XXXL T Shirt", "slug": "xxxl-t-shirt", "scope": "public", "username": "Numan", "description": "Upload a photo of your t shirt and let Krea do the rest!", "node_app_version_id": "29aeb189-9e2e-41ff-9a90-5aa583935392", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/286442de-cf7e-4616-9603-54229618097e.png"]},
{"id": "d48e4f19-0c70-432c-add0-85f92b092439", "name": "GTA Me!", "slug": "gta-me-1", "scope": "public", "username": "Numan", "description": "Upload a photo of yourself and complete the mission.", "node_app_version_id": "30ca5f0f-d4cc-426e-952b-827d31f3ba3e", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/5ef1886c-e73b-450c-a005-cb5b4219d0d5.png"]},
{"id": "f37db0a8-187b-43f9-9303-b3f9442d93fa", "name": "News Interview", "slug": "news-interview", "scope": "public", "username": "Numan", "description": "Ever wanted to be on TV? nows your chance! ", "node_app_version_id": "f7fbc48f-ac3d-49ff-81ac-3312672b132f", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/a1f17002-a6fd-4924-8d15-c485043ae5dc.png"]},
{"id": "5bd8b0ca-5a11-47e6-a52c-a64db018db38", "name": "Krea Street", "slug": "krea-street", "scope": "public", "username": "Numan", "description": "Insert a photo of yourself! ", "node_app_version_id": "f3950feb-6417-414c-afa6-f29ab5ec18da", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/22c33ae7-7307-4ca2-99f8-7c0280df670b.png"]},
{"id": "30fbb66b-afb3-4e4e-9efa-0585c3cea3e2", "name": "Duplicate Me", "slug": "duplicate-me", "scope": "public", "username": "Numan", "description": "Insert a full length photo for best results!", "node_app_version_id": "a7edab69-cab1-4329-ad8f-500b4e450af6", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/e0e28539-e70a-4bab-9ef7-1e305169e664.png"]},
{"id": "0eefe130-da52-45d4-ac2d-ab405ce358b5", "name": "Who Me?", "slug": "who-me", "scope": "public", "username": "Numan", "description": "Insert one full length photo of yourself for the best result", "node_app_version_id": "c007ef26-4a89-48f9-af10-7ac5c4631097", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/ef52e5a7-3d7c-45a7-b558-529ecbb4c814.png"]},
{"id": "f3a1b100-3cfb-4174-b121-37e727bf9f06", "name": "Outfit Check", "slug": "outfit-check", "scope": "public", "username": "Numan", "description": "Insert a full length photo for best results", "node_app_version_id": "785cd9d1-3942-4a01-8132-3169eb2811ad", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/a0cf764e-6b61-48d7-a5eb-c3bce7f0ea24.png"]},
{"id": "7447e150-0235-4bcd-8255-5a8264b1a58c", "name": "Big Head!", "slug": "big-head", "scope": "public", "username": "Numan", "description": "Insert a full length photo for best results ", "node_app_version_id": "4dba5711-e441-4f32-b23b-3fb19f497902", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/507bd14b-c729-4670-8b3b-736365f93772.png"]},
{"id": "62068163-3759-4d37-8f9a-e14d6541e2d6", "name": "Supersize Me", "slug": "supersize-me", "scope": "public", "username": "Numan", "description": "This mini app works best with a full length image. ", "node_app_version_id": "8d7b3993-b566-40e9-8fc5-6a0a7f06385d", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/4c8dc413-55e0-4f92-9ea2-0b98e05d4159-video.mp4"]},
{"id": "37a2a44d-9e37-4e45-a54b-cdf40205c6dd", "name": "360 Sunglasses Product Video", "slug": "360-sunglasses-product-video", "scope": "public", "username": "Beccu", "description": "Upload an image of your model and an image of the glasses, and get a 360° rotation video showing the model wearing the g", "node_app_version_id": "68ddc067-c625-4bb0-a1e5-bd4c707e43bd", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/6a501a4c-df7d-47eb-93f6-84fd384f2a15-image.jpeg"]},
{"id": "6a9d40a0-3898-49ae-872f-4ed9244d70e6", "name": "Photoshoot App", "slug": "photoshoot-app-1", "scope": "public", "username": "vicc", "description": "Create a photoshoot from any input image.", "node_app_version_id": "4f830b88-deb6-4222-8874-b092f85a33e7", "version": 1, "example_outputs": ["https://app-uploads.krea.ai/public/211a76a4-1bdb-432b-b77a-d465490e410a.png"]},
{"id": "85491150-80d1-46a6-a569-0bfc9f1bcf2f", "name": "Style Transfer with Nano Banana", "slug": "style-transfer-with-nano-banana", "scope": "public", "username": "vicc", "description": "Transfer the style of the input image into any prompt.", "node_app_version_id": "63785347-b8fe-43bc-80a8-4b119a7d9e1c", "version": 1, "example_outputs": []},
{"id": "220dead2-f2de-4836-ab24-bc714a61ad1a", "name": "Exploded View Drawing", "slug": "exploded-view-drawing", "scope": "public", "username": "vicc", "description": "Turn any image into an exploded-view drawing", "node_app_version_id": "55626b53-b15e-4fe1-bc8f-d37d82d0e7fe", "version": 1, "example_outputs": []},
{"id": "00e7fed9-8bf0-4e6e-9686-76db9d572c39", "name": "Photoshoot with Nano Banana 2", "slug": "photoshoot-with-nano-banana-2", "scope": "public", "username": "vicc", "description": "", "node_app_version_id": "711fe205-10ff-4154-81d7-bf2f0a11ab18", "version": 1, "example_outputs": []},
];
  /* ============================== App 列表 ============================== */
  function scopeLabel(scope) {
    if (scope === "workspace") return T("apps.scope.workspace");
    if (scope === "user") return T("apps.scope.user");
    return T("apps.scope.public");
  }

  /* 官网精选清单只应包含 scope=public 的 App。
   * 账号自己的 user / workspace App 走「工作区」实时接口，不能混进精选，
   * 否则网页上看不到的个人 App 会一直出现在「全部」里。 */
  function publicFeaturedApps(items) {
    return (items || []).filter(function (a) {
      return !!a && (!a.scope || a.scope === "public");
    });
  }

  function normalizeApp(raw) {
    if (!raw || !raw.id) return null;
    var app = {
      id: raw.id,
      name: raw.name || raw.slug || raw.id,
      description: raw.description || "",
      scope: raw.scope || "public",
      username: raw.username || "",
      version: raw.version,
      slug: raw.slug,
      example_outputs: raw.example_outputs || null,
      input_openapi_schema: raw.input_openapi_schema || raw.schema || null,
      output_openapi_schema: raw.output_openapi_schema || null,
      category: raw.category || raw.categories || raw.media_type || raw.output_type || raw.app_type || null,
      node_app_version_id: raw.node_app_version_id || null,
      source: raw.source || "remote"
    };
    return app;
  }

  function mergeApps() {
    var map = {};
    st.customApps.forEach(function (a) { if (a && a.id) map[a.id] = a; });
    st.apps.forEach(function (a) { if (a && a.id) map[a.id] = a; });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  /* */
  /* */
  function favorites() {
    var f = st.prefs.favorites || st.prefs.pinned || [];
    return Array.isArray(f) ? f : [];
  }

  function isFavorite(id) { return favorites().indexOf(id) >= 0; }

  function toggleFavorite(id) {
    var list = favorites().slice();
    var idx = list.indexOf(id);
    var added;
    if (idx >= 0) { list.splice(idx, 1); added = false; }
    else { list.push(id); added = true; }
    st.prefs.favorites = list;
    st.prefs.pinned = list;
    S.setPrefs({ favorites: list, pinned: list });
    toast(added ? T("apps.favAdded") : T("apps.favRemoved"), "ok");
    return added;
  }

  function filteredApps() {
    var all = mergeApps();
    var favIds = favorites();
    all = all.filter(function (a) { return !isVideoApp(a); });
    if (st.appFilter === "fav") {
      all = all.filter(function (a) { return favIds.indexOf(a.id) >= 0; });
    } else if (st.appFilter === "workspace") {
      all = all.filter(function (a) { return a.scope === "workspace"; });
    } else {
      all = all.filter(function (a) { return a.scope !== "workspace"; });
    }
    var q = (st.appQuery || "").toLowerCase();
    if (q) {
      all = all.filter(function (a) {
        return (a.name || "").toLowerCase().indexOf(q) >= 0 ||
          (a.description || "").toLowerCase().indexOf(q) >= 0 ||
          (a.username || "").toLowerCase().indexOf(q) >= 0;
      });
    }
    all.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    return all;
  }

  function appCard(app, index) {
    var fav = isFavorite(app.id);
    var card = mk("div", {
      class: "app-item",
      role: "button",
      tabindex: "0",
      on: { click: function () { openApp(app); } }
    });
    var thumb = mk("img", { class: "thumb", alt: app.name });
    var ex = app.example_outputs && app.example_outputs.length ? app.example_outputs[0] : null;
if (ex && (typeof index !== "number" || index < 60)) thumb.src = ex;
    card.appendChild(thumb);

    var info = mk("div", { class: "info" });
    var nameRow = mk("div", { class: "name" });
    nameRow.appendChild(mk("span", { text: app.name }));
    nameRow.appendChild(mk("span", {
      class: "badge" + (app.scope === "workspace" ? " info" : ""),
      text: scopeLabel(app.scope)
    }));
    if (isVideoApp(app)) nameRow.appendChild(mk("span", { class: "badge", text: T("apps.badgeVideo") }));    info.appendChild(nameRow);
    if (app.description) info.appendChild(mk("div", { class: "desc", text: app.description }));
    var meta = mk("div", { class: "meta" });
    if (app.username) meta.appendChild(mk("span", { class: "tiny muted", text: T("apps.author", { name: app.username }) }));
    if (app.username && app.version) {
      meta.appendChild(mk("span", {
        class: "tiny muted app-meta-sep",
        "aria-hidden": "true",
        text: "·"
      }));
    }
    if (app.version) meta.appendChild(mk("span", { class: "tiny muted", text: T("apps.version", { version: app.version }) }));
    info.appendChild(meta);
    card.appendChild(info);

    // 纯图标收藏入口：用 ghostIcon（div + img），不使用 sp-action-button，
    // 否则 UXP 会给它画一圈按钮外框。
    var star = ghostIcon(fav ? "starFilled" : "star", fav ? T("apps.unfav") : T("apps.fav"), function (ev) {
      ev.stopPropagation();
      toggleFavorite(app.id);
      renderApps();
    }, { className: "fav-star" + (fav ? " on" : "") });
    card.appendChild(star);
    return card;
  }

  /* 官网 Apps 页新增了 Image / Video / Text 类型筛选，但 /node-apps 列表接口
     没有 category 字段。这里按「官网预览视频 / 输出 schema 里的视频模型 /
     已知精选视频 App」判断；视频和音频结果都无法在 Photoshop 里置入。
     精选快照没有 schema 的 App 由 VIDEO_APP_IDS 兜底（2026-10 官网列表）。 */
  var VIDEO_APP_IDS = {
    "497c1aa0-420f-418a-820e-a55c4dcb7219": 1, // Frozen!
    "f873cc92-7b1b-407e-b655-223c74f265f7": 1, // Jungle Run
    "2e34862d-111b-45dc-939a-cee1d42d8214": 1, // Monday Blues
    "48b8c3d4-f1b5-45e6-acc4-f671e34943ee": 1, // Astro Danger
    "8dfa0656-d74c-452a-87fe-70a14da00c1f": 1, // Sims Character
    "06a70961-db5a-4094-b126-9d5be1456fd6": 1, // Hydraulic Press
    "f7b4f748-09ce-486b-b037-ca832ed7bc62": 1, // Moving Ad
    "a3c505bc-8a79-416e-a33b-9d3d985e03a4": 1, // CCTV Footage
    "a947283b-7297-431a-a8a9-27e8839396e8": 1, // Fisheye
    "d48e4f19-0c70-432c-add0-85f92b092439": 1, // GTA Me!
    "f37db0a8-187b-43f9-9303-b3f9442d93fa": 1, // News Interview
    "5bd8b0ca-5a11-47e6-a52c-a64db018db38": 1, // Krea Street
    "30fbb66b-afb3-4e4e-9efa-0585c3cea3e2": 1, // Duplicate Me
    "0eefe130-da52-45d4-ac2d-ab405ce358b5": 1, // Who Me?
    "f3a1b100-3cfb-4174-b121-37e727bf9f06": 1, // Outfit Check
    "7447e150-0235-4bcd-8255-5a8264b1a58c": 1, // Big Head!
    "a1aa980e-77a8-4eed-bbe5-3fa078b04e91": 1, // Floating On Water
    "83855da9-f5a8-4418-8dbd-ec9c989d2ef1": 1, // XXXL T Shirt
    "62068163-3759-4d37-8f9a-e14d6541e2d6": 1, // Supersize Me
    "37a2a44d-9e37-4e45-a54b-cdf40205c6dd": 1  // 360 Sunglasses Product Video
  };

  /* 视频/音频输出示例；只匹配扩展名，不会把带 poster 的图片示例误判。 */
  var VIDEO_URL_RE = /\.(mp4|webm|mov|m4v|mp3|wav|m4a|aac|ogg)([?#]|$)/i;
  /* 输出 schema 没有 wire-type，只能从属性名 / title / description 识别模型。 */
  var VIDEO_PROP_RE = /(^|[^a-z])(video|videos|audio|voiceover|voice_over|lip_?sync|lipsync|talking|animate|animated|animation|motion_control|seedance|veo|kling|hailuo|sora|runway|pika|minimax|pixverse|vidu|dreamina|grok_imagine|stitch_videos|combine_video_audio|footage|movie|ltx|mochi|cogvideo|wan_[0-9])([^a-z]|$)/i;

  function appSchemaProps(schema) {
    if (typeof schema === "string") {
      try { schema = JSON.parse(schema); } catch (e) { return null; }
    }
    return schema && schema.properties ? schema.properties : null;
  }

  /** 输入/输出 schema 里只要出现视频或音频，就视为 Photoshop 用不到。 */
  function schemaHasVideo(props) {
    if (!props) return false;
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
      var p = props[keys[i]] || {};
      var wire = p["x-krea-wire-type"];
      if (wire) {
        if (wire === "video" || wire === "audio") return true;
        continue;
      }
      var text = keys[i] + " " + (p.title || "") + " " + (p.description || "");
      if (VIDEO_PROP_RE.test(text)) return true;
    }
    return false;
  }

  function isVideoApp(app) {
    if (!app) return false;
    if (VIDEO_APP_IDS[app.id]) return true;

    var category = app.category;
    if (category) {
      if (Array.isArray(category)) category = category.join(" ");
      if (/(^|[^a-z])(video|videos|audio)([^a-z]|$)/i.test(String(category))) return true;
    }

    var examples = app.example_outputs || [];
    for (var i = 0; i < examples.length; i++) {
      if (VIDEO_URL_RE.test(String(examples[i] || ""))) return true;
    }

    var inputProps = appSchemaProps(app.input_openapi_schema);
    var outputProps = appSchemaProps(app.output_openapi_schema);
    if (schemaHasVideo(inputProps) || schemaHasVideo(outputProps)) return true;

    // 精选 App 的列表快照没有 schema；只有在这种情况下才看文案，避免把
    // “支持视频输入”之类的说明误判成视频 App。
    if (!inputProps && !outputProps) {
      var text = String(app.name || "") + " " + String(app.description || "");
      if (VIDEO_PROP_RE.test(text)) return true;
    }
    return false;
  }

  /**
   * 读取仓库 main 分支的精选 App 清单。
   * 只解析数据，不执行远端代码；格式不对或为空时抛错，由 refreshApps 回退到缓存/内置表。
   * 加时间戳绕过 raw.githubusercontent 的缓存，不调用 GitHub API，避免匿名限流。
   */
  async function fetchFeaturedManifest() {
    // UXP / 测试环境不一定有 AbortController：有就用它中断请求，没有就靠
    // Promise.race 超时，避免清单请求把启动流程挂住。
    var ac = typeof AbortController === "function" ? new AbortController() : null;
    var timer = null;
    var timeout = new Promise(function (resolve, reject) {
      timer = setTimeout(function () {
        if (ac) { try { ac.abort(); } catch (e) {} }
        var timeoutErr = new Error("timeout");
        timeoutErr.code = "timeout";
        reject(timeoutErr);
      }, FEATURED_TIMEOUT);
    });
    try {
      var opts = {
        method: "GET",
        headers: { "Accept": "application/json" }
      };
      if (ac) opts.signal = ac.signal;
      var res = await Promise.race([
        fetch(FEATURED_APPS_URL + "?t=" + Date.now(), opts),
        timeout
      ]);
      if (!res.ok) {
        var httpErr = new Error("HTTP " + res.status);
        httpErr.code = res.status === 404 ? "no_manifest" : "http_" + res.status;
        throw httpErr;
      }
      var text = String(await res.text() || "").replace(/^\uFEFF/, "");
      var data = JSON.parse(text);
      var list = Array.isArray(data) ? data : (data && Array.isArray(data.apps) ? data.apps : null);
      if (!list) {
        var shapeErr = new Error("featured-apps.json 缺少 apps");
        shapeErr.code = "bad_manifest";
        throw shapeErr;
      }
      var items = [];
      var seen = {};
      for (var i = 0; i < list.length && items.length < 300; i++) {
        var app = normalizeApp(list[i]);
        if (!app || app.scope !== "public" || seen[app.id]) continue;
        seen[app.id] = 1;
        items.push(app);
      }
      if (!items.length) {
        var emptyErr = new Error("featured-apps.json 没有有效 App");
        emptyErr.code = "bad_manifest";
        throw emptyErr;
      }
      var updatedAt = data && data.updated_at ? Date.parse(data.updated_at) : 0;
      return {
        items: items,
        schema: (data && data.schema) || 1,
        updatedAt: isNaN(updatedAt) ? 0 : updatedAt
      };
    } catch (e) {
      if (e && (e.name === "AbortError" || /abort/i.test(String(e.message)))) {
        var timeoutErr = new Error("timeout");
        timeoutErr.code = "timeout";
        throw timeoutErr;
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function renderAppFilters() {
    var host = $("appFilters");
    if (!host) return;
    var hideAll = !!st.hideAppsAll;
    var hideFav = !!st.hideAppsFav;
    var chips = host.children;
    for (var i = 0; i < chips.length; i++) {
      var f = chips[i].getAttribute("data-filter");
      // 「全部」和「收藏夹」各自独立隐藏；隐藏项用 display:none，
      // 剩余 chip 仍由 flex 从左侧排布。
      chips[i].classList.toggle("hidden",
        (f === "all" && hideAll) || (f === "fav" && hideFav));
      chips[i].classList.toggle("active", f === st.appFilter);
    }
  }

  function renderApps() {
    var list = filteredApps();
    var host = $("appsList");
    clear(host);
    list.forEach(function (a, i) { host.appendChild(appCard(a, i)); });

    renderAppFilters();

var more = $("btnAppsMore");
    if (more) more.classList.toggle("hidden", !(st.appFilter === "all" && st.appsHasMore));

    var empty = $("appsEmpty");
    var emptyText = st.appFilter === "fav" ? T("apps.favEmpty")
      : st.appFilter === "workspace" ? T("apps.wsEmpty")
        : (st.appQuery ? T("apps.searchEmpty") : T("apps.noneEmpty"));
    empty.textContent = emptyText;
    empty.classList.toggle("hidden", list.length > 0);

    var status = $("appsStatus");
    clear(status);
    if (st.apps.length || st.customApps.length) {
      // 计数必须和当前实际渲染的卡片一致：同时受 Tab（全部/工作区/收藏）和搜索过滤影响。
      status.appendChild(mk("span", { text: T("apps.total", { n: list.length }) }));
    }
    var hidden = mergeApps().filter(function (a) {
      if (!isVideoApp(a)) return false;
      if (st.appFilter === "workspace") return a.scope === "workspace";
      if (st.appFilter === "fav") return favorites().indexOf(a.id) >= 0;
      return a.scope !== "workspace";
    }).length;
    if (hidden > 0) {
      status.appendChild(mk("span", { class: "badge", text: T("apps.hiddenMedia", { n: hidden }), title: T("apps.hiddenMediaTip") }));
    }
    if (st.appsOffline) {
      status.appendChild(mk("span", { class: "badge warn", text: T("apps.offline"), title: T("apps.offlineTip") }));
    }
    if (st.appFilter === "workspace") {
      status.appendChild(mk("span", { class: "badge", text: T("apps.filterWorkspace") }));
    }
    if (st.appsError) {
      status.appendChild(mk("span", { class: "badge err", text: st.appsError }));
    }
    updateHeader();
    renderFooter();
  }

  /**
   * 刷新 App 列表。
   * 数据源策略（v2.3.7）：
   *  - 工作区视图：实时拉 owner=workspace（用户/团队自建 App）；
   *  - 全部 / 收藏视图：读取仓库 main 分支的 featured-apps.json（仅 public
   *    官网精选）。启动时 6 小时内复用本地缓存，手动刷新强制以官网清单为准；
   *    网络失败时依次回退到本地缓存、内置 FEATURED_APPS，列表不会变空。
   *  - 精选 App 的 schema / execute 在打开时用 App ID 取最新定义，旧
   *    node_app_version_id 只作为兼容回退。
   */
  async function refreshApps(interactive, append) {
    if (!API.hasToken()) { show("screenSetup"); return; }
    var status = $("appsStatus");
    if (interactive && !append) {
      clear(status);
      status.appendChild(mk("span", { text: T("apps.refreshing") }));
    }
    var owner = st.appFilter === "workspace" ? "workspace" : "featured";
    if (!append) st.appsCursor = null;
    try {
      var items = [];
      var hasMore = false;
      var fetchedAt = Date.now();
      var page = null;
      if (owner === "workspace") {
        page = await API.listApps({ owner: "workspace", limit: append ? 100 : 40, cursor: append ? st.appsCursor : null });
        items = (page && page.items) || [];
        hasMore = !!(page && page.next_cursor);
        st.appsOffline = false;
        st.appsSource = "workspace";
      } else {
        var cached = await S.readJson(FEATURED_CACHE, null);
        var cacheItems = cached && Array.isArray(cached.items) && cached.items.length
          ? publicFeaturedApps(cached.items)
          : null;
        if (cacheItems && !cacheItems.length) cacheItems = null;
        var cacheAge = cached ? Date.now() - (cached.savedAt || 0) : Infinity;
        if (!interactive && cacheItems && cacheAge >= 0 && cacheAge < FEATURED_TTL) {
          items = cacheItems.slice();
          fetchedAt = cached.savedAt || 0;
          st.appsSource = "cache";
          st.appsOffline = false;
          st.appsManifestUpdatedAt = cached.manifestUpdatedAt || 0;
        } else {
          try {
            var manifest = await fetchFeaturedManifest();
            items = manifest.items;
            fetchedAt = Date.now();
            st.appsSource = "remote";
            st.appsOffline = false;
            st.appsManifestUpdatedAt = manifest.updatedAt || fetchedAt;
            try {
              await S.writeJson(FEATURED_CACHE, {
                items: items,
                savedAt: fetchedAt,
                source: "remote",
                manifestUpdatedAt: st.appsManifestUpdatedAt
              });
            } catch (writeErr) {
              // 缓存写失败不影响本次已经拿到的最新清单。
              console.warn("[Krea for Ps] 保存精选 App 缓存失败", writeErr);
            }
          } catch (e) {
            console.warn("[Krea for Ps] 同步官网精选 App 失败，使用缓存/内置清单", e);
            if (cacheItems) {
              items = cacheItems.slice();
              fetchedAt = cached.savedAt || 0;
              st.appsSource = "cache";
            } else {
              items = publicFeaturedApps(FEATURED_APPS);
              fetchedAt = 0;
              st.appsSource = "builtin";
            }
            st.appsOffline = true;
            if (interactive) toast(T("apps.offlineToast", { msg: errMsg(e) }), "error");
          }
        }
        hasMore = false;
      }
      var merged = append ? st.apps.concat(items) : items;
      var seen = {};
      st.apps = merged.map(normalizeApp).filter(function (a) {
        if (!a || seen[a.id]) return false;
        seen[a.id] = 1;
        return true;
      });
      st.appsCursor = owner === "workspace" && page ? (page.next_cursor || null) : null;
      st.appsHasMore = hasMore;
      st.appsFetchedAt = fetchedAt;
      st.appsError = null;
      if (!append && owner === "workspace") {
        await S.writeJson(APPS_CACHE, { items: items, savedAt: fetchedAt, owner: owner });
      }
      renderApps();
    } catch (e) {
      st.appsError = T("apps.fetchFailed", { msg: errMsg(e) });
      if (interactive) toast(st.appsError, "error");
      renderApps();
    }
  }

  async function loadAppCache() {
    var caches = await Promise.all([
      S.readJson(APPS_CACHE, null),
      S.readJson(FEATURED_CACHE, null)
    ]);
    var cache = caches[0];
    var featured = caches[1];
    var currentOwner = st.appFilter === "workspace" ? "workspace" : "featured";
    var raw = null;
    var savedAt = 0;
    var source = "builtin";

    if (currentOwner === "workspace" && cache && cache.owner === "workspace" && Array.isArray(cache.items)) {
      raw = cache.items;
      savedAt = cache.savedAt || 0;
      source = "workspace";
    } else if (featured && Array.isArray(featured.items) && featured.items.length) {
      raw = featured.items;
      savedAt = featured.savedAt || 0;
      source = "cache";
    } else if (cache && cache.owner === "featured" && Array.isArray(cache.items) && cache.items.length) {
      // v2.3.7 之前的精选缓存（当时还没有 apps-featured.json）。
      raw = cache.items;
      savedAt = cache.savedAt || 0;
      source = "cache";
    } else if (currentOwner === "workspace" && cache && Array.isArray(cache.items)) {
      // 旧缓存没有 owner 字段时可能是工作区列表，先作为占位。
      raw = cache.items;
      savedAt = cache.savedAt || 0;
      source = "workspace";
    }

    var initial = (raw || FEATURED_APPS).map(normalizeApp).filter(Boolean);
    st.apps = source === "workspace" ? initial : publicFeaturedApps(initial);
    st.appsFetchedAt = savedAt;
    st.appsSource = raw ? source : "builtin";
    st.appsOffline = false;
    if (featured && featured.manifestUpdatedAt) {
      st.appsManifestUpdatedAt = featured.manifestUpdatedAt;
    }

    var custom = await S.readJson("apps-custom.json", null);
    if (custom && Array.isArray(custom.items)) {
      // 旧版本会把打开过的官网精选 App 也写进 apps-custom.json；
      // 只要它已出现在当前官网清单 / 内置表里，就清掉重复副本（真正导入的 App 不受影响）。
      var featuredIds = {};
      FEATURED_APPS.concat(st.apps).forEach(function (a) {
        if (a && a.id) featuredIds[a.id] = 1;
      });
      var cleaned = custom.items.filter(function (a) { return a && a.id && !featuredIds[a.id]; });
      st.customApps = cleaned.map(normalizeApp).filter(Boolean);
      if (cleaned.length !== custom.items.length) {
        S.writeJson("apps-custom.json", { items: st.customApps }).catch(function (e) {
          console.warn("[Krea for Ps] 清理自定义 App 缓存失败", e);
        });
      }
    }
if (st.prefs.favorites && !st.prefs.pinned) st.prefs.pinned = st.prefs.favorites;
  }

  async function openApp(app) {
    st.currentApp = app;
    // 拉取 schema 期间表单还没重建；先清空，避免“运行”误读上一个 App 的字段。
    st.appForm = null;
    hideAppRecovery();
    $("appRunTitle").textContent = app.name;
    $("appRunScope").textContent = scopeLabel(app.scope);
    $("appRunScope").className = "badge" + (app.scope === "workspace" ? " info" : app.scope === "user" ? " ok" : "");
    $("appRunSub").textContent = app.description || "";
    $("appRunError").textContent = "";
    $("appRunHint").textContent = "";
    $("appRunForm").innerHTML = "";

    show("screenAppRun");
    $("appRunHint").textContent = T("common.loading");

    var def = app;
    if (!def.input_openapi_schema) {
      // v2.3.7：先按 App ID 取详情，服务端会返回最新 node_app_version_id；
      // 旧版本 ID 只作为兼容回退，避免一直沿用列表快照里的旧 schema。
      var candidates = [app.id, app.node_app_version_id].filter(function (id, idx, all) {
        return id && all.indexOf(id) === idx;
      });
      for (var ci = 0; ci < candidates.length && !def.input_openapi_schema; ci++) {
        try {
          var fetched = await API.getApp(candidates[ci]);
          var fetchedApp = normalizeApp(fetched);
          if (fetchedApp) {
            // 详情接口可能只返回一个子集：保留列表里的 id / source；
            // node_app_version_id 以详情返回的最新值为准，缺失时才沿用列表快照。
            def = Object.assign({}, app, fetchedApp, { id: app.id, source: app.source });
            if (!def.node_app_version_id) def.node_app_version_id = app.node_app_version_id || null;
            // 只回填当前列表里的 schema（本次会话不再重复请求），
            // 不能把官网精选 App 混进 apps-custom.json，否则它会被当成导入的 JSON App。
            for (var ai = 0; ai < st.apps.length; ai++) {
              if (st.apps[ai].id === app.id) { st.apps[ai] = Object.assign({}, st.apps[ai], def); break; }
            }
            if (app.source === "custom") {
              st.customApps = st.customApps.filter(function (a) { return a.id !== app.id; });
              st.customApps.push(Object.assign({}, def, { id: app.id, source: "custom" }));
              S.writeJson("apps-custom.json", { items: st.customApps }).catch(function (e) {
                console.warn("[Krea for Ps] 保存自定义 App 缓存失败", e);
              });
            }
          }
        } catch (e) {
          console.warn("[Krea for Ps] GET /node-apps/" + candidates[ci] + " 失败", e);
        }
      }
    }
    st.currentApp = def;
    $("appRunHint").textContent = "";

    var fields = appSchemaToFields(def);
    if (!fields.length) {
      $("appRunHint").textContent = T("apps.noSchema");
    }
    st.appForm = buildForm($("appRunForm"), fields, { advancedAfter: 3 });

    // App 表单里的图片必须由用户显式选择：打开 App 时不再自动抓图。
    // 自动抓图在空文档 / 无选区时会得到白色占位图，用户很难判断它从哪来；
    // 图片字段本身已经提供「使用当前选区 / 选择文件」按钮。
    var imageFields = fields.filter(function (f) { return f.ui === "image" || f.ui === "images"; });
    if (imageFields.length) {
      $("appRunHint").textContent = T("apps.captureHint");
    }
  }

  /**
   */
  function appSchemaToFields(def) {
    var schema = def.input_openapi_schema;
    if (typeof schema === "string") {
      try { schema = JSON.parse(schema); } catch (e) { schema = null; }
    }
    var props = schema && schema.properties;
    var required = (schema && schema.required) || [];
    var out = [];
    if (!props) return out;

    Object.keys(props).forEach(function (name) {
      var p = props[name] || {};
      var type = normType(p.type);
      var wire = p["x-krea-wire-type"] || null;
      var isUri = p.format === "uri";
      var ui = "text";
      var role = "param";
      var wrap = null;

      // 1) 权威类型优先
      if (wire === "image" || (isUri && wire !== "video" && wire !== "audio")) {
        if (type === "array") { ui = "images"; role = "refs"; wrap = "plain"; }
        else { ui = "image"; role = "source"; wrap = "single"; }
      } else if (wire === "video" || wire === "audio") {
        ui = "url";
        role = "media";
      } else if (wire === "number" || wire === "integer" || type === "number" || type === "integer") {
        ui = (typeof p.minimum === "number" && typeof p.maximum === "number") ? "slider" : "number";
      } else if (wire === "boolean" || type === "boolean") {
        ui = "boolean";
      } else if (type === "array") {
        ui = "list";
      } else if (type === "object") {
        ui = "json";
      } else if (p.enum && p.enum.length) {
        ui = "select";
      } else if (wire === "text" || type === "string") {
ui = (typeof p.maxLength === "number" && p.maxLength <= 80) ? "text" : "textarea";
        if (/prompt|instruction/i.test(name)) role = "prompt";
      }

if (wire === "style") { ui = "text"; role = "param"; }

      out.push({
        name: name,
        // 优先 title；没有 title 时退化为 description（Krea 面板常见的标签来源）。
        label: p.title || p.description || null,
        ui: ui,
        role: role,
        wrap: wrap,
        wireType: wire,
        type: type,
        required: required.indexOf(name) >= 0,
        enum: p.enum || null,
        default: p.default,
        min: p.minimum,
        max: p.maximum,
        step: p.multipleOf,
        // 没有 title 时 description 已经当作标签，不再重复显示一遍。
        desc: (p.description && p.title && p.description !== p.title && p.description !== name) ? p.description : null
      });
    });

out.sort(function (a, b) {
      var rank = function (f) {
        if (f.ui === "image" || f.ui === "images") return 0;
        if (f.role === "prompt") return 1;
        if (f.required) return 2;
        return 3;
      };
      return rank(a) - rank(b);
    });
    return out;
  }

  async function onRunApp() {
    if (st.busy || !st.currentApp || !st.appForm) return;
    if (!API.hasToken()) { toast(T("err.noToken"), "error"); show("screenSetup"); return; }
    var body;
    try { body = st.appForm ? st.appForm.read() : {}; } catch (e) { toast(errMsg(e), "error"); return; }

    var fields = st.appForm ? st.appForm.fields : [];
    var missing = validateRequired(fields, body);
    if (missing.length) { toast(T("gen.needRequired", { fields: missing.join("、") }), "error"); return; }

    st.busy = true;
    st.lastSnapshot = await snapshotPs();
    var app = st.currentApp;
    $("appRunError").textContent = "";
    $("appRunHint").textContent = "";
    hideAppRecovery();
    try {
      var out = await runPipeline({
        title: app.name,
        submit: function () { return API.executeApp(app.id, body, app.node_app_version_id); }
      });
      if (!out) return;
      if (!out.base64) { handleMediaResult(out.primary); return; }
      await askAndPlaceAppResult(out.base64, app.name);
    } catch (e) {
      if (e && e.code === "download") {
        // 后台已成功，仅下载失败：保留结果 URL，提供“重试下载”，不要诱导重跑。
        $("appRunError").textContent = errMsg(e);
        $("appRunHint").textContent = T("download.kept");
        showAppRecovery(e.primary, app.name, e.jobId);
        toast(T("download.failed"), "error");
        return;
      }
      $("appRunError").textContent = T("err.generic", { msg: errMsg(e) });
      handleError(e, "app " + app.id);
    } finally {
      st.busy = false;
    }
  }

  /* ============================== loadHistory ============================== */
  async function loadHistory() {
    var h = await S.readJson(HISTORY_FILE, []);
    st.history = Array.isArray(h) ? h : [];
  }

  function pushHistory(prompt) {
    if (!prompt) return;
    prompt = String(prompt).trim();
    st.history = st.history.filter(function (x) { return x !== prompt; });
    st.history.unshift(prompt);
    if (st.history.length > HISTORY_LIMIT) st.history = st.history.slice(0, HISTORY_LIMIT);
    S.writeJson(HISTORY_FILE, st.history).catch(function (e) {
      console.warn("[Krea for Ps] 保存提示词历史失败", e);
    });
  }

  function renderHistory() {
    var host = $("historyList");
    clear(host);
    st.history.forEach(function (p) {
      host.appendChild(mk("div", {
        class: "list-item",
        on: {
          click: function () {
            var input = $("promptInput");
            if (input) input.value = p;
            show("screenGenerate");
            toast(T("history.used"), "ok");
          }
        }
      }, [mk("span", { class: "txt wrap", text: p })]));
    });
    $("historyEmpty").classList.toggle("hidden", st.history.length > 0);
  }

  async function onClearHistory() {
    if (!(await confirmSheet(T("history.clearConfirm")))) return;
    st.history = [];
    await S.writeJson(HISTORY_FILE, []);
    renderHistory();
    toast(T("history.cleared"), "ok");
  }

  /* ============================== 提示词库 ==============================
   */
  var LIB_CATEGORIES = {
    "通用": { zh: "通用", en: "General" },
    "风格": { zh: "风格", en: "Style" },
    "扩图": { zh: "扩图", en: "Expand" },
    "自定义": { zh: "自定义", en: "Custom" }
  };

  function catLabel(key) {
    var c = LIB_CATEGORIES[key];
    if (!c) return key;
    return c[I18N.lang()] || c.zh;
  }

  /* */
  function libText(v) {
    if (v && typeof v === "object") return v[I18N.lang()] || v.zh || v.en || "";
    return String(v === undefined || v === null ? "" : v);
  }

  var DEFAULT_LIBRARY = {
    "通用": [
      {
        name: { zh: "电商主图", en: "E-commerce hero" },
        prompt: {
          zh: "为 [image1] 中的产品生成干净的电商主图：纯白背景、影棚布光、保留材质与细节。",
          en: "Create a clean e-commerce hero shot of the product in [image1]: pure white background, studio lighting, keep the material and details intact."
        }
      },
      {
        name: { zh: "换背景", en: "Replace background" },
        prompt: {
          zh: "把 [image1] 的背景替换为 [描述]，保持主体不变，保留原有光线与比例，写实无缝。",
          en: "Replace the background of [image1] with [description]. Keep the subject unchanged, preserve the original lighting and proportions, photorealistic and seamless."
        }
      },
      {
        name: { zh: "局部重绘", en: "Inpainting" },
        prompt: {
          zh: "在选区中把 [对象] 替换为 [目标]，保持选区外完全不变，新元素的光影与照片主光源一致。",
          en: "Inside the selection replace [object] with [target]. Keep everything outside the selection unchanged; match the new element's lighting to the photo's key light."
        }
      }
    ],
    "风格": [
      {
        name: { zh: "吉卜力", en: "Ghibli style" },
        prompt: {
          zh: "把 [image1] 重绘为吉卜力动画风格，保留构图与人物特征。",
          en: "Repaint [image1] in Ghibli animation style, keeping the composition and the character's features."
        }
      },
      {
        name: { zh: "电影感", en: "Cinematic portrait" },
        prompt: {
          zh: "把 [image1] 处理为竖向电影感肖像：强烈轮廓光、低角度、深红背景。",
          en: "Turn [image1] into a vertical cinematic portrait: strong rim light, low angle, deep red background."
        }
      },
      {
        name: { zh: "产品棚拍", en: "Studio product shot" },
        prompt: {
          zh: "把 [image1] 转为专业产品棚拍照：三点布光、柔和阴影、干净背景。",
          en: "Convert [image1] into a professional studio product shot: three-point lighting, soft shadows, clean background."
        }
      }
    ],
    "扩图": [
      {
        name: { zh: "向外扩展", en: "Outpaint" },
        prompt: {
          zh: "把 [image1] 向四周扩展，保持主体与透视不变，沿边缘生成与原始风格、色彩、光线一致的内容。",
          en: "Expand [image1] outward. Keep the subject and perspective unchanged and generate edge content matching the original style, colour and lighting."
        }
      },
      {
        name: { zh: "改比例", en: "Change aspect ratio" },
        prompt: {
          zh: "把 [image1] 扩展为 [比例] 画幅，主体居中，四周自然延展。",
          en: "Extend [image1] to a [ratio] frame, keep the subject centred and let the surroundings extend naturally."
        }
      }
    ]
  };

  async function loadLibrary() {
    var lib = await S.readJson(LIBRARY_FILE, null);
    st.library = (lib && typeof lib === "object" && !Array.isArray(lib)) ? lib : JSON.parse(JSON.stringify(DEFAULT_LIBRARY));
  }

  /*
     .library-category-heading（点击展开）+ .library-category-content */
  function renderLibrary() {
    var host = $("libraryList");
    clear(host);
    var cats = Object.keys(st.library);
    if (!cats.length) {
      host.appendChild(mk("div", { class: "empty", text: T("library.categoryEmpty") }));
      return;
    }
    cats.forEach(function (cat) {
      var items = st.library[cat] || [];
      var body = mk("div", { class: "library-category-content" });
      var icon = mk("span", { class: "category-toggle-icon", text: "▸" });
      var heading = mk("div", {
        class: "library-category-heading",
        on: {
          click: function () {
            var open = heading.classList.contains("open");
            heading.classList.toggle("open", !open);
            body.style.display = open ? "none" : "block";
      icon.textContent = open ? "▸" : "▾";
          }
        }
      });
      heading.appendChild(icon);
      heading.appendChild(mk("span", { class: "grow", text: catLabel(cat) }));
      heading.appendChild(mk("span", { class: "badge", text: String(items.length) }));
      host.appendChild(heading);

      items.forEach(function (it, idx) {
        var row = mk("div", { class: "list-item" });
        row.appendChild(mk("span", {
          class: "txt wrap",
          text: libText(it.name) + " — " + libText(it.prompt)
        }));
        // 与顶部「切换语言 / 设置」一致：只显示图标，不绘制 Spectrum 按钮外框。
        row.appendChild(ghostIcon("check", T("library.use"), function (ev) {
          ev.stopPropagation();
          useLibraryPrompt(it);
        }, { className: "library-item-action" }));
        row.appendChild(ghostIcon("settings", T("library.editAction"), function (ev) {
          // 没有 edit.png 这个图标资源，用齿轮（settings）代替原先的破损图标
          ev.stopPropagation();
          openPromptEditor(cat, idx);
        }, { className: "library-item-action" }));
        row.appendChild(ghostIcon("trash", T("library.delete"), function (ev) {
          ev.stopPropagation();
          confirmSheet(T("library.deleteConfirm")).then(function (ok) {
            if (!ok) return;
            st.library[cat].splice(idx, 1);
            if (!st.library[cat].length) delete st.library[cat];
            S.writeJson(LIBRARY_FILE, st.library).catch(function (e) {
              console.warn("[Krea for Ps] 保存词库失败", e);
            });
            renderLibrary();
            toast(T("library.deleted"), "ok");
          });
        }, { className: "library-item-action" }));
        body.appendChild(row);
      });
      body.style.display = "none";
      host.appendChild(body);
    });
  }

  function useLibraryPrompt(it) {
    st.pendingPrompt = libText(it.prompt);
    var input = $("promptInput");
    if (input) input.value = st.pendingPrompt;
    st.pendingPrompt = null;
    renderHistory();
    show("screenGenerate");
    toast(T("history.used"), "ok");
  }

  /* 词库分类选择：也是自绘浮层，值保存在 st.editCategory */
  function refreshPromptCategories(selected) {
    st.editCategory = selected || st.editCategory || Object.keys(st.library)[0] || "自定义";
    var label = $("categoryTriggerLabel");
    if (label) label.textContent = catLabel(st.editCategory);
  }

  function pickCategory() {
    var keys = Object.keys(st.library);
    if (!keys.length) return Promise.resolve(null);
    var trigger = $("categoryTrigger");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    return openPicker({
      title: T("library.category"),
      groups: [{ items: keys.map(function (k) { return { value: k, label: catLabel(k) }; }) }],
      selected: st.editCategory,
      anchor: trigger,
      // 分类字段本身是纵向布局：列表直接插在触发器后面，宽度与下拉框一致。
      mount: trigger
    }).then(function (v) {
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (!v) return null;
      st.editCategory = v;
      var label = $("categoryTriggerLabel");
      if (label) label.textContent = catLabel(v);
      return v;
    });
  }

  function openPromptEditor(cat, idx, prefill) {
    st.libEditing = { cat: cat, idx: typeof idx === "number" ? idx : -1, prefill: prefill || null };
    $("promptEditTitle").textContent = st.libEditing.idx >= 0 ? T("library.edit") : T("library.new");
    var it = st.libEditing.idx >= 0 ? (st.library[cat] || [])[st.libEditing.idx] : null;
$("promptName").value = it ? libText(it.name) : "";
    $("promptBody").value = it ? libText(it.prompt) : (prefill || "");
    $("promptNewCategory").value = "";
    $("promptError").textContent = "";
    refreshPromptCategories(cat || Object.keys(st.library)[0]);
    show("screenPromptEdit");
  }

  /* */ 
  var FEATHER_MAX = 250;

  /**
   * 羽化量改成可直接输入的数字框。
   *
   * 为什么不用 sp-slider：UXP 的部分 Photoshop 版本里 sp-slider 只会回报
   * 0 和最大值两个档位（用户反馈“只能选择 0 和 250”），拖动事件也不连续。
   * 原生 input 在所有版本都能正常键入，因此用它作为唯一的输入控件。
   */
  function configureFeatherInput() {
    var el = $("featherAmountInput");
    if (!el) return null;
    el.setAttribute("maxlength", "3");
    return el;
  }

  function clampFeather(v) {
    var n = Math.round(Number(v) || 0);
    return Math.max(0, Math.min(FEATHER_MAX, n));
  }

  function featherAmount() {
    var el = $("featherAmountInput");
    var v = parseFloat(String((el && el.value) || "").trim());
    if (!isFinite(v)) v = 0;
    return clampFeather(v);
  }

  function setFeather(v) {
    v = clampFeather(v);
    var el = configureFeatherInput();
    if (el) el.value = String(v);
    st.prefs.feather = v;
    S.setPrefs({ feather: v });
    return v;
  }

  /* */
  async function onFeather() {
    var amount = setFeather(featherAmount());
    setGenerateError("");
    try {
      // PS.feather 内部已经用 executeAsModal 包好，这里不能再包一层（嵌套会抛错）
      await PS.feather(amount);
      toast(T("gen.featherDone", { n: amount }), "ok");
    } catch (e) {
      var message = T("err.psApi", { msg: errMsg(e) });
      setGenerateError(message);
      toast(message, "error");
    }
  }

  /** 取生成页当前输入框里的提示词 */
  function currentPromptText() {
    var el = $("promptInput");
    return el ? String(el.value || "").trim() : "";
  }

  /** 把生成页当前输入框里的提示词直接存进词库 */
  function onSaveCurrentPromptToLibrary() {
    var text = currentPromptText();
    if (!text) { toast(T("gen.promptEmpty"), "error"); return; }
    openPromptEditor(null, -1, text);
  }

  async function onSavePrompt() {
    var name = String($("promptName").value || "").trim();
    var body = String($("promptBody").value || "").trim();
    var newCat = String($("promptNewCategory").value || "").trim();
    var cat = newCat || st.editCategory || Object.keys(st.library)[0] || "自定义";
    if (!name) { $("promptError").textContent = T("library.nameRequired"); return; }
    if (!body) { $("promptError").textContent = T("library.bodyRequired"); return; }
    if (!st.library[cat]) st.library[cat] = [];
    if (st.libEditing && st.libEditing.idx >= 0) {
      var oldCat = st.library[st.libEditing.cat];
      if (oldCat && st.libEditing.cat !== cat) {
        oldCat.splice(st.libEditing.idx, 1);
        if (!oldCat.length) delete st.library[st.libEditing.cat];
        st.library[cat].push({ name: name, prompt: body });
      } else {
        st.library[cat][st.libEditing.idx] = { name: name, prompt: body };
      }
    } else {
      st.library[cat].push({ name: name, prompt: body });
    }
    await S.writeJson(LIBRARY_FILE, st.library);
    renderLibrary();
    show("screenLibrary");
    toast(T("library.saved"), "ok");
  }

  async function onRestoreLibrary() {
    if (!(await confirmSheet(T("library.restoreConfirm")))) return;
    st.library = JSON.parse(JSON.stringify(DEFAULT_LIBRARY));
    await S.writeJson(LIBRARY_FILE, st.library);
    renderLibrary();
    toast(T("library.restored"), "ok");
  }

  async function onImportLibrary() {
    var file = await PS.pickJsonFile();
    if (!file) return;
    try {
      var text = await file.read();
      var data = JSON.parse(String(text));
      var count = 0;
      if (data && typeof data === "object") {
        Object.keys(data).forEach(function (cat) {
          if (!Array.isArray(data[cat])) return;
          if (!st.library[cat]) st.library[cat] = [];
          data[cat].forEach(function (it) {
            if (it && it.prompt) { st.library[cat].push({ name: it.name || T("common.untitled"), prompt: it.prompt }); count++; }
          });
        });
      }
      if (!count) { toast(T("library.importEmpty"), "error"); return; }
      await S.writeJson(LIBRARY_FILE, st.library);
      renderLibrary();
      toast(T("library.imported", { n: count }), "ok");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  function exportFileStamp() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return String(d.getFullYear()) + p(d.getMonth() + 1) + p(d.getDate()) + "-" +
      p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function hideExportResult() {
    var el = $("exportResult");
    if (el) el.classList.add("hidden");
  }

  function showExportResult(path) {
    st.lastExportPath = String(path || "");
    var host = $("exportResult");
    if (!host) return;
    var title = $("exportResultTitle");
    if (title) title.textContent = T("library.exportDone");
    var hint = $("exportResultHint");
    if (hint) hint.textContent = T("library.exportHint");
    var pathEl = $("exportResultPath");
    if (pathEl) pathEl.textContent = st.lastExportPath || T("common.na");
    host.classList.remove("hidden");
  }

  function exportFolderPath(path) {
    var p = String(path || "").replace(/[\\/]+$/, "");
    if (!p) return "";
    var cut = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
    if (cut < 0) return "";
    var dir = p.slice(0, cut);
    if (!dir) return p.charAt(0) === "/" ? "/" : "";
    if (/^[A-Za-z]:$/.test(dir)) dir += "\\";
    return dir;
  }

  function openExportFolder() {
    var folder = exportFolderPath(st.lastExportPath);
    var fail = function () {
      toast(T("library.openFailed"), "error");
    };
    if (!folder) { fail(); return; }
    var done = function () {
      toast(T("library.folderOpened"), "ok");
    };
    try {
      // 新版 UXP 提供 shell.openPath，可直接在系统文件管理器中打开导出目录。
      if (shell && typeof shell.openPath === "function") {
        var result = shell.openPath(folder);
        if (result && typeof result.then === "function") result.then(done, fail);
        else if (result === false) fail();
        else done();
        return;
      }
      // 旧版 UXP 没有 openPath 时尝试 file:// URI。
      if (shell && typeof shell.openExternal === "function") {
        var normalized = folder.replace(/\\/g, "/");
        // encodeURI 不会转义 # / ?，但它们是 Windows 合法文件名字符，必须自己编码。
        var encoded = encodeURI(normalized).replace(/#/g, "%23").replace(/\?/g, "%3F");
        var uri;
        if (normalized.indexOf("//") === 0) uri = "file:" + encoded;
        else if (normalized.charAt(0) === "/") uri = "file://" + encoded;
        else uri = "file:///" + encoded;
        var opened = shell.openExternal(uri);
        if (opened && typeof opened.then === "function") opened.then(done, fail);
        else if (opened === false) fail();
        else done();
        return;
      }
    } catch (e) { /* fall through */ }
    fail();
  }

  function onOpenExportFolder() {
    hideExportResult();
    openExportFolder();
  }

  async function onExportLibrary() {
    var total = 0;
    Object.keys(st.library).forEach(function (c) { total += (st.library[c] || []).length; });
    if (!total) { toast(T("library.exportEmpty"), "error"); return; }
    try {
      var fileName = "krea-prompts-" + exportFileStamp() + ".json";
      var text = JSON.stringify(st.library, null, 2);
      var saved = await PS.saveTextFile(fileName, text);
      if (!saved) return; // 用户在保存对话框里取消
      st.lastExportPath = String(saved.nativePath || saved.name || "");
      showExportResult(st.lastExportPath);
    } catch (e) {
      toast(T("library.exportFailed", { msg: errMsg(e) }), "error");
    }
  }

  /**
   * 清除插件保存在本机的全部数据（重置全部数据时使用）。
   */
  async function clearAllLocalData() {
    var firstError = null;
    try { await S.clearToken(); } catch (e) { firstError = e; }
    await S.removeFile(APPS_CACHE);
    await S.removeFile(FEATURED_CACHE);
    await S.removeFile("apps-custom.json");
    await S.removeFile(HISTORY_FILE);
    await S.removeFile(LIBRARY_FILE);
    await S.removeFile("krea-output.png");
    await S.removeFile("storage-status.json");
    try { await S.resetPrefs(); } catch (e) { firstError = firstError || e; }
    try {
      localStorage.removeItem("krea.ps.lang");
      localStorage.removeItem("krea.ps.uiLang");
    } catch (e) { /* ignore */ }
    if (firstError) throw firstError;
  }

  /** 清除本机数据后同步清掉内存状态，避免本次会话继续沿用旧 Token / 偏好 / 结果。 */
  function resetSessionAfterClear() {
    st.prefs = JSON.parse(JSON.stringify(S.DEFAULT_PREFS));
    st.tab = "apps";
    st.appFilter = "all";
    st.hideAppsAll = false;
    st.hideAppsFav = false;
    st.model = MODELS.defaultModel;
    st.apps = [];
    st.customApps = [];
    st.appsFetchedAt = 0;
    st.appsError = null;
    st.appsOffline = false;
    st.appsSource = "builtin";
    st.appsManifestUpdatedAt = 0;
    st.appsCursor = null;
    st.appsHasMore = false;
    st.history = [];
    st.library = JSON.parse(JSON.stringify(DEFAULT_LIBRARY));
    st.pendingPrompt = null;
    st.currentApp = null;
    st.appForm = null;
    st.source = null;
    st.refs = [];
    st.agentModel = "";
    st.agentAllowed = null;
    st.agentHistory = [];
    st.agentSessionId = null;
    st.agentRunId = null;
    st.lastSnapshot = null;
    st.genAgain = false;
    st.lastGenShot = null;
    st.lastGenSelection = null;
    st.lastExportPath = "";
    // 缩略图只存在内存，但清除数据也要立即释放，并阻止在途请求写回。
    resetAssetHistory();
    hideExportResult();
    API.setToken(null);
    st.token = null;
    setupReturn = "screenSettings";
    setupCanReturn = false;
    updateSetupBadge();
    setSetupNotice(T("setup.notTested"), "muted");
  }

  /* ============================== 设置 ============================== */
  async function renderSettings() {
    $("setTokenBadge").textContent = API.hasToken() ? T("settings.tokenOk") : T("settings.tokenMissing");
    $("setTokenBadge").className = "badge " + (API.hasToken() ? "ok" : "err");
    updateSetupBadge();

    var hideIds = ["hideAppsAll", "hideAppsFav"];
    for (var hi = 0; hi < hideIds.length; hi++) {
      var hideToggle = $(hideIds[hi]);
      if (!hideToggle) continue;
      var hide = hideIds[hi] === "hideAppsAll" ? !!st.hideAppsAll : !!st.hideAppsFav;
      try { hideToggle.checked = hide; } catch (e) { /* ignore */ }
      try {
        if (hide) hideToggle.setAttribute("checked", "");
        else hideToggle.removeAttribute("checked");
      } catch (e2) { /* ignore */ }
    }

    setRadio($("layerSamplingOptions"), st.prefs.sampling || "visible");
    if (st.prefs.outputMode !== "newLayer" && st.prefs.outputMode !== "replace") {
      st.prefs.outputMode = "newLayer";
    }
    setRadio($("outputOptions"), st.prefs.outputMode);
    var feather = clampFeather((typeof st.prefs.feather === "number") ? st.prefs.feather : 0);
    st.prefs.feather = feather;
    var fInput = $("featherAmountInput");
    if (fInput) fInput.value = String(feather);
  }

  /* ============================== Token 状态 ============================== */
  function updateSetupBadge() {
    var badge = $("setupTokenBadge");
    if (!badge) return;
    var configured = API.hasToken();
    badge.textContent = configured ? T("settings.tokenOk") : T("settings.tokenMissing");
    badge.className = "badge " + (configured ? "ok" : "err");
  }

  function setSetupNotice(message, kind) {
    var notice = $("setupNotice");
    if (!notice) return;
    notice.textContent = message || "";
    notice.className = "tiny wrap setup-notice" + (kind ? " " + kind : " muted");
  }

  /* ============================== 关于 ============================== */
  /** Microsoft Teams 深链：唤起客户端并打开与作者的对话，预填主题和消息。 */
  function teamsContactUrl() {
    return AUTHOR_TEAMS_CHAT_URL +
      "?users=" + encodeURIComponent(AUTHOR_TEAMS_EMAIL) +
      "&topicName=" + encodeURIComponent(T("about.contactTopic")) +
      "&message=" + encodeURIComponent(T("about.contactMessage", { version: VERSION }));
  }

  async function contactAuthor() {
    var opened = await tryOpenExternal(teamsContactUrl());
    toast(T(opened ? "about.contactOpening" : "about.contactFailed"), opened ? "ok" : "error");
  }

  function renderAbout() {
    var metaEl = $("aboutMeta");
    if (metaEl) {
      metaEl.textContent = T("about.models", {
        models: Object.keys(MODELS.models).length,
        date: String(MODELS.generatedAt || "").slice(0, 10)
      });
    }

    var iconEl = $("aboutIconPack");
    if (iconEl) iconEl.textContent = iconPackStatus();
  }

  /* */
  function iconPackStatus() {
    var imgs = document.getElementsByTagName("img");
    var total = 0, loaded = 0;
    for (var i = 0; i < imgs.length; i++) {
      if (String(imgs[i].className || "").indexOf("k-icon") < 0) continue;
      total++;
      if (imgs[i].naturalWidth > 0) loaded++;
    }
    return T("about.iconPack", { n: loaded, total: total });
  }

  /* ============================== 更新检查 ============================== */
  var updateState = { checking: false, notified: false };

  /** 取出每一段数字，"v2.3.4-beta" -> [2, 3, 4]。 */
  function versionParts(value) {
    var nums = String(value || "").trim().replace(/^v/i, "").match(/\d+/g);
    if (!nums) return [];
    return nums.map(function (n) { return parseInt(n, 10); });
  }

  /** 逐段按数字比较；字符串直接比会把 "2.3.9" 判成比 "2.3.10" 新。 */
  function compareVersions(a, b) {
    var x = versionParts(a);
    var y = versionParts(b);
    var len = Math.max(x.length, y.length);
    for (var i = 0; i < len; i++) {
      var xv = x[i] || 0;
      var yv = y[i] || 0;
      if (xv !== yv) return xv > yv ? 1 : -1;
    }
    return 0;
  }

  /** 只允许 https 的 GitHub 地址，避免 update.json 被改成任意链接。 */
  function safeUpdateUrl(value) {
    var url = String(value || "").trim();
    var m = url.match(/^https:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
    if (!m) return "";
    var host = String(m[1] || "").toLowerCase();
    if (host !== "github.com" && host !== "raw.githubusercontent.com") return "";
    return url;
  }

  /** 优先直接下载 .ccx，其次 Release 页面；都没有就回落到 Releases 列表。 */
  function updateTargetUrl(info) {
    var candidates = [info && info.download, info && info.page, info && info.url];
    for (var i = 0; i < candidates.length; i++) {
      var url = safeUpdateUrl(candidates[i]);
      if (url) return url;
    }
    return RELEASES_URL;
  }

  /**
   * 读取仓库 main 分支的 update.json。
   * 加时间戳绕过 raw.githubusercontent 的缓存；不调用 GitHub API，避免限流。
   */
  async function fetchUpdateManifest() {
    // UXP / 测试环境不一定有 AbortController：有就用它中断请求，没有就靠
    // Promise.race 超时，避免更新检查把静默启动流程挂住。
    var ac = typeof AbortController === "function" ? new AbortController() : null;
    var timer = null;
    var timeout = new Promise(function (resolve, reject) {
      timer = setTimeout(function () {
        if (ac) { try { ac.abort(); } catch (e) {} }
        var timeoutErr = new Error("timeout");
        timeoutErr.code = "timeout";
        reject(timeoutErr);
      }, UPDATE_TIMEOUT);
    });
    try {
      var opts = {
        method: "GET",
        headers: { "Accept": "application/json" }
      };
      if (ac) opts.signal = ac.signal;
      var res = await Promise.race([
        fetch(UPDATE_URL + "?t=" + Date.now(), opts),
        timeout
      ]);
      if (!res.ok) {
        var httpErr = new Error("HTTP " + res.status);
        httpErr.code = res.status === 404 ? "no_manifest" : "http_" + res.status;
        throw httpErr;
      }
      var text = String(await res.text() || "").replace(/^\uFEFF/, "");
      var data = JSON.parse(text);
      if (!data || !data.version) {
        var shapeErr = new Error("update.json 缺少 version");
        shapeErr.code = "bad_manifest";
        throw shapeErr;
      }
      return data;
    } catch (e) {
      if (e && (e.name === "AbortError" || /abort/i.test(String(e.message)))) {
        var timeoutErr = new Error("timeout");
        timeoutErr.code = "timeout";
        throw timeoutErr;
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * 检测更新。
   *   checkForUpdates()                —— 设置里手动点，失败会提示原因；
   *   checkForUpdates({silent:true})   —— 启动时静默检查，失败不打扰用户，
   *                                       只有发现新版本才 toast 一次。
   * .ccx 不能静默替换，确认后只负责打开下载地址，由用户双击安装。
   */
  async function checkForUpdates(opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    var btn = $("btnCheckUpdate");

    if (updateState.checking) {
      if (!silent) toast(T("settings.checkingUpdate"), "ok");
      return;
    }
    updateState.checking = true;
    if (!silent) {
      if (btn) {
        btn.disabled = true;
        btn.textContent = T("settings.checkingUpdate");
      }
      toast(T("settings.checkingUpdate"), "ok");
    }

    try {
      var info = await fetchUpdateManifest();
      var latest = String(info.version || "").trim().replace(/^v/i, "");
      if (!versionParts(latest).length) {
        var bad = new Error("版本号无效: " + latest);
        bad.code = "bad_manifest";
        throw bad;
      }
      if (compareVersions(latest, VERSION) <= 0) {
        if (!silent) toast(T("about.upToDate", { version: VERSION }), "ok");
        return;
      }

      var notes = String(info.notes || "").trim();
      if (silent) {
        if (!updateState.notified) {
          updateState.notified = true;
          toast(T("about.updateFound", { version: latest }), "ok");
        }
        return;
      }

      var message = T("about.updateBody", {
        current: VERSION,
        latest: latest,
        notes: notes ? T("about.updateNotes", { notes: notes }) : ""
      });
      var go = await sheet(T("about.updateTitle"), message, [
        { label: T("about.updateLater"), value: false },
        { label: T("about.updateDownload"), value: true, variant: "cta" }
      ]);
      if (go) await openExternal(updateTargetUrl(info));
    } catch (e) {
      var code = e && e.code;
      if (!silent || code !== "no_manifest") {
        console.warn("[Krea for Ps] update check failed", e);
      }
      if (!silent) {
        var key = code === "no_manifest" ? "about.updateNoManifest"
          : code === "bad_manifest" ? "about.updateBadManifest"
          : code === "timeout" ? "about.updateTimeout"
          : "about.updateFailed";
        toast(T(key, { msg: errMsg(e) }), "error");
      }
    } finally {
      updateState.checking = false;
      if (!silent && btn) {
        btn.disabled = false;
        btn.textContent = T("settings.checkUpdate");
      }
    }
  }

  /* ============================== Token ============================== */
  function openTokenPage() {
    openExternal(TOKEN_PAGE, T("setup.opened"));
  }

  async function readClipboardText() {
    try {
      var data = await navigator.clipboard.read();
      return (data && data["text/plain"]) || "";
    } catch (e) {
      return "";
    }
  }

  /**
   * 检测输入框里的 Token 是否有效。
   * 只做临时验证，不写入磁盘，也不会覆盖当前已保存的 Token。
   */
  async function onTestToken() {
    var value = tokenFieldValue();
    if (!value) { toast(T("setup.tokenRequired"), "error"); return; }
    var previous = st.token;
    setSetupNotice(T("setup.testing"), "muted");
    API.setToken(value);
    try {
      var ok = await API.verifyToken();
      if (!ok) throw new Error(T("setup.testEmpty"));
      setSetupNotice(T("setup.testOk"), "ok");
      toast(T("setup.testOk"), "ok");
    } catch (e) {
      setSetupNotice(T("setup.testBad", { msg: errMsg(e) }), "error");
      toast(T("setup.testBad", { msg: errMsg(e) }), "error");
    } finally {
      // 还原会话 Token，避免“检测”意外改变后续请求身份。
      API.setToken(previous || null);
      updateSetupBadge();
    }
  }

  async function onSaveToken() {
    var value = tokenFieldValue();
    if (!value) { toast(T("setup.tokenRequired"), "error"); return; }
    showProgress(T("setup.verifying"), "", false);
    API.setToken(value);
    try {
      var ok = await API.verifyToken();
      if (!ok) throw new Error(T("setup.testEmpty"));
    } catch (e) {
      hideProgress();
      API.setToken(st.token || null);
      setSetupNotice(T("setup.verifyBad", { msg: errMsg(e) }), "error");
      toast(T("setup.verifyBad", { msg: errMsg(e) }), "error");
      return;
    }
    hideProgress();
    try {
      await S.setToken(value);
    } catch (e2) {
      // 验证通过但落盘失败：保留旧 Token，不要假装保存成功。
      API.setToken(st.token || null);
      var saveMsg = T("setup.saveFailed", { msg: errMsg(e2) });
      setSetupNotice(saveMsg, "error");
      toast(saveMsg, "error");
      // 记录失败原因（不含 Token），方便排查“保存失败/重启丢失”。
      try { writeStorageStatus(); } catch (e3) { /* ignore */ }
      return;
    }
    st.token = value;
    API.setToken(value);
    updateSetupBadge();
    // 保存成功后立刻落一份诊断，确认备份/keychain 的真实状态。
    try { writeStorageStatus(); } catch (e4) { /* ignore */ }
    // 保存后立刻换回掩码，避免真实 Token 继续留在 DOM 里。
    syncTokenField();
    setSetupNotice(T("setup.saved"), "ok");
    await renderSettings();
    toast(T("setup.saved"), "ok");
    if (!st.apps.length) refreshApps(true);
    showTab(st.prefs.tab || "apps");
    updateHeader();
  }

  function updateHeader() {
    var sub = $("headerSub");
    if (!sub) return;
    sub.textContent = T("header.tagline");
  }

  /* ============================== 进入生成页 ============================== */
  function onEnterGenerate() {
    // 原版不在进入页面时抓图：当前选区在点击「生成」时才读取，
    // 因此这里没有自动捕获、没有输入图预览，也不会覆盖对话页的 source。
    renderModelForm();
    renderGenerateRefs();
  }

  /* ============================== 资产页 ============================== */
  /*
   * 只对应网页 krea.ai/assets 的「生成历史」：GET /jobs。
   * 每条记录有 result.urls（model / preview），可置入 PS / 打开 / 删除。
   *
   * 列表用游标分页（cursor 是 date-time 字符串，原样回传）。
   * /jobs 的 status 只接受单个枚举值，「进行中」在客户端过滤。
   *
   * 缩略图：UXP 对远程 <img src="https://..."> 支持不稳定，所以统一
   * fetch 成 base64 再拼 data URL；优先下载 result.urls 中 type="preview"
   * 的小图，没有 preview 才退回 model 原图。只占内存，不写临时文件。
   */
  var ASSET_PAGE_SIZE = 30;
  var ASSET_THUMB_LOADING = "./assets/loading/loading.gif";
  var ASSET_THUMB_CONCURRENCY = 3;
  var ASSET_THUMB_TIMEOUT = 30000;
  var ASSET_THUMB_CACHE_MAX = 30;
  // 单张原图回退可能达到数 MB；除条数外再限制总字节，避免面板长期占用内存。
  var ASSET_THUMB_CACHE_BYTES = 8 * 1024 * 1024;
  var JOB_RUNNING_STATUS = {
    backlogged: 1, queued: 1, scheduled: 1, processing: 1, sampling: 1,
    "intermediate-complete": 1
  };

  function assetState() { return st.assets; }

  function isVideoUrl(url) {
    return /\.(mp4|webm|mov|m4v)([?#]|$)/i.test(String(url || ""));
  }

  function assetMediaType(url, mime) {
    if (/^video\//i.test(mime || "")) return "video";
    if (/^image\//i.test(mime || "")) return "image";
    if (isVideoUrl(url)) return "video";
    return url ? "image" : "";
  }

  function shortText(raw, fallback) {
    var s = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
    if (!s) return fallback || "";
    if (s.length > 80) s = s.slice(0, 80) + "…";
    return s;
  }

  /** 统一成 UI 需要的形状。 */
  function normalizeJobItem(raw) {
    if (!raw) return null;
    var id = String(raw.job_id || raw.id || "");
    if (!id) return null;
    var urls = API.pickResultUrls(raw.result);
    var url = urls.model || "";
    var media = assetMediaType(url, "");
    // 视频任务的 model 是 mp4，不能直接当缩略图；preview 若是图片则优先使用。
    var thumbUrl = urls.preview && !isVideoUrl(urls.preview)
      ? urls.preview
      : (media === "image" ? url : "");
    return {
      kind: "job",
      id: id,
      url: url,
      thumbUrl: thumbUrl,
      status: raw.status || "unknown",
      media: media,
      title: shortText(raw.prompt, modelLabel(raw.model || "") || id.slice(0, 8)),
      prompt: raw.prompt || "",
      model: raw.model || "",
      createdAt: raw.created_at || ""
    };
  }

  function mergeAssetItems(current, incoming) {
    var seen = Object.create(null);
    var out = [];
    (current || []).concat(incoming || []).forEach(function (item) {
      if (!item || !item.id) return;
      var key = item.kind + ":" + item.id;
      if (seen[key]) return;
      seen[key] = 1;
      out.push(item);
    });
    return out;
  }

  /**
   * 生成完成后直接更新已加载的资产列表。
   *
   * 只做内存插入，不请求 /jobs，也不改动分页 cursor；如果用户从没打开过
   * 资产页（loaded=false），则留给首次进入时统一拉第一页。
   */
  function noteAssetJob(raw, jobId) {
    var a = assetState();
    if (!a.loaded) return;
    var payload = raw;
    if ((!payload || (!payload.job_id && !payload.id)) && jobId) {
      payload = Object.assign({}, payload || {}, { job_id: jobId });
    }
    var item = normalizeJobItem(payload);
    if (!item) return;
    var key = assetKey(item);
    var kept = [];
    for (var i = 0; i < a.items.length; i++) {
      if (assetKey(a.items[i]) !== key) kept.push(a.items[i]);
    }
    a.items = [item].concat(kept);
    // 生成发生在其它页面；等下次进入资产页再渲染并下载缩略图。
  }

  /**
   * 生成失败时更新已加载列表里的同一条任务，避免它一直停在“进行中”。
   * 列表里没有这条记录时标记 stale，下次进入资产页静默补一次。
   */
  function markAssetJobFailed(jobId, status) {
    var a = assetState();
    if (!a.loaded || !jobId) return;
    var target = String(jobId);
    for (var i = 0; i < a.items.length; i++) {
      if (a.items[i].kind === "job" && a.items[i].id === target) {
        a.items[i] = Object.assign({}, a.items[i], { status: status || "failed" });
        return;
      }
    }
    // 列表里没有这条任务（生成是在列表加载之后才提交的）：下次进入资产页
    // 静默刷新一次，让失败记录出现，同时不阻塞当前页面。
    a.stale = true;
  }

  /**
   * 拉取一页生成历史。reset=true 时重新拉第一页（首次进入 / 手动刷新）。
   *
   * 手动刷新且已有卡片时保留当前网格，等新数据回来再整体替换，避免清空
   * 页面后出现整页 loading 闪烁。只有首次加载才显示居中的加载状态。
   *
   * 用递增的 seq 丢弃过期响应：用户快速点两次刷新时，先发的请求可能后返回。
   *
   * silent=true 时不显示任何加载态（用于进入页面时的后台同步）。
   */
  async function loadAssets(reset, silent) {
    var a = assetState();
    // 同一时间只允许一个请求，避免切换页面 / 连点刷新产生重复拉取。
    if (a.loading) return;
    var seq = ++a.seq;
    var keepGrid = !!reset && a.loaded && a.items.length > 0;
    if (reset) {
      a.error = "";
      // 刷新时允许此前失败的缩略图重试；已成功的缓存继续复用。
      a.thumbFailed = {};
      a.thumbQueue = [];
      a.thumbQueued = {};
      if (!keepGrid) {
        a.items = [];
        a.cursor = null;
        a.hasMore = false;
      }
    }
    a.loading = true;
    if (!keepGrid) a.loaded = false;
    // 静默刷新不重绘，当前网格保持原样；其它情况先画加载态 / 保留旧网格。
    if (!silent || !keepGrid) renderAssets();

    try {
      var opts = { limit: ASSET_PAGE_SIZE };
      if (!reset && a.cursor) opts.cursor = a.cursor;
      var page = await API.listJobs(opts);
      if (seq !== a.seq) return;

      var rawItems = (page && page.items) || [];
      var items = [];
      for (var i = 0; i < rawItems.length; i++) {
        var item = normalizeJobItem(rawItems[i]);
        if (!item) continue;
        items.push(item);
      }
      a.items = mergeAssetItems(reset ? [] : a.items, items);
      a.cursor = (page && page.next_cursor) || null;
      a.hasMore = !!a.cursor;
      a.loaded = true;
      a.stale = false;
    } catch (e) {
      if (seq !== a.seq) return;
      a.error = errMsg(e);
      // 刷新失败但旧网格还在时，保留原来的“加载更多”状态，列表继续可用。
      if (!keepGrid) a.hasMore = false;
      console.error("[Krea for Ps] loadAssets", e);
      if (API.isAuthError(e)) {
        // 旧 token 已失效：清掉当前账号的列表 / 缩略图，重新登录后重新拉取。
        resetAssetHistory();
        toast(T("err.auth"), "error");
        show("screenSetup");
      } else {
        toast(T("assets.loadFailed", { msg: a.error }), "error");
      }
    } finally {
      if (seq === a.seq) {
        a.loading = false;
        renderAssets();
      }
    }
  }

  function assetFallbackNode(text) {
    return mk("div", { class: "asset-fallback", text: text || "" });
  }

  function jobStatusText(status) {
    if (status === "completed") return T("assets.status.completed");
    if (status === "failed") return T("assets.status.failed");
    if (status === "cancelled") return T("assets.status.cancelled");
    if (JOB_RUNNING_STATUS[status]) return T("assets.status.running");
    return status || "";
  }

  function assetPlaceholderText(item) {
    if (item.status === "failed" || item.status === "cancelled") return T("assets.failedItem");
    if (JOB_RUNNING_STATUS[item.status]) return T("assets.runningItem");
    if (item.media === "video") return T("assets.video");
    if (!item.url) return T("assets.noUrl");
    return T("assets.noPreview");
  }

  function assetKey(item) {
    return item.kind + ":" + item.id;
  }

  /**
   * 清空内存缩略图缓存（不碰服务端记录）。
   * UXP 面板重载 / 重启 PS 会自动释放；设置页「重置全部数据」也会调用。
   * 在途下载不会被取消，但完成后会因 epoch 变化而丢弃，不会重新写回。
   */
  function clearAssetThumbCache() {
    var a = assetState();
    a.thumbEpoch = (a.thumbEpoch || 0) + 1;
    a.thumbCache = {};
    a.thumbFailed = {};
    a.thumbQueue = [];
    a.thumbQueued = {};
    // 旧请求不再计入并发；它们完成时会因 epoch 变化而整体忽略。
    a.thumbActive = 0;
  }

  /** 退出登录 / 重置数据时清掉当前会话的资产列表与缩略图。 */
  function resetAssetHistory() {
    var a = assetState();
    a.seq++;
    clearAssetThumbCache();
    a.items = [];
    a.cursor = null;
    a.hasMore = false;
    a.loading = false;
    a.loaded = false;
    a.stale = false;
    a.error = "";
  }

  function trimThumbCache(a) {
    var keys = Object.keys(a.thumbCache);
    var total = 0;
    for (var i = 0; i < keys.length; i++) total += a.thumbCache[keys[i]].length;
    // 至少保留一张，避免单张超限时刚下载完就立刻被清掉。
    while (keys.length > 1 && (keys.length > ASSET_THUMB_CACHE_MAX || total > ASSET_THUMB_CACHE_BYTES)) {
      var oldest = keys.shift();
      total -= a.thumbCache[oldest].length;
      delete a.thumbCache[oldest];
    }
  }

  /**
   * 签名 URL 过期或 preview 缺失时，查一次 /jobs/{id} 换新地址再试。
   * 只重试一次，避免离线时无限打 API。
   */
  async function fetchAssetThumbBase64(item) {
    var first = item.thumbUrl || item.url;
    if (!first) throw new Error(T("assets.noUrl"));
    try {
      return await API.downloadBase64(first, ASSET_THUMB_TIMEOUT, { attempts: 2, retryDelayMs: 500 });
    } catch (e) {
      var fresh = await API.getJob(item.id);
      var urls = API.pickResultUrls(fresh && fresh.result);
      var next = urls.preview && !isVideoUrl(urls.preview) ? urls.preview : urls.model;
      if (!next || next === first) throw e;
      return await API.downloadBase64(next, ASSET_THUMB_TIMEOUT, { attempts: 2, retryDelayMs: 500 });
    }
  }

  /** 把下载完成的 data URL 刷到当前仍显示这张卡片的 <img> 上。 */
  function paintAssetThumb(key) {
    var a = assetState();
    var grid = $("assetGrid");
    if (!grid) return;
    for (var i = 0; i < grid.children.length; i++) {
      var card = grid.children[i];
      if (!card || !card.getAttribute || card.getAttribute("data-asset-key") !== key) continue;
      var img = card.querySelector(".asset-thumb-img");
      if (!img) continue;
      if (a.thumbCache[key]) {
        img.className = "asset-thumb-img";
        img.setAttribute("src", a.thumbCache[key]);
        // UXP 某些版本只监听 src property，不监听 attribute。
        try { img.src = a.thumbCache[key]; } catch (e) { /* ignore */ }
      } else if (a.thumbFailed[key] && img.parentNode) {
        img.parentNode.replaceChild(assetFallbackNode(T("assets.noPreview")), img);
      }
    }
  }

  /**
   * 缩略图下载队列：一次最多 3 个并发。
   * 列表一次 30 条，若全部并发会把网络和内存瞬间打满。
   */
  function pumpAssetThumbs() {
    var a = assetState();
    while (a.thumbActive < ASSET_THUMB_CONCURRENCY && a.thumbQueue.length) {
      var job = a.thumbQueue.shift();
      if (!job) break;
      // 刷新会清空排队表，但旧请求可能刚结束；已有缓存时不再重复下载。
      if (a.thumbCache[job.key] || a.thumbFailed[job.key]) {
        delete a.thumbQueued[job.key];
        continue;
      }
      (function (task) {
        a.thumbActive++;
        var epoch = a.thumbEpoch;
        fetchAssetThumbBase64(task.item).then(function (b64) {
          if (epoch !== a.thumbEpoch) return;
          var data = b64 ? uriOf({ base64: b64 }) : "";
          if (data) {
            a.thumbCache[task.key] = data;
            trimThumbCache(a);
            delete a.thumbFailed[task.key];
          } else {
            a.thumbFailed[task.key] = 1;
          }
        }).catch(function (e) {
          console.warn("[Krea for Ps] asset thumb", task.key, e && e.message ? e.message : e);
          if (epoch === a.thumbEpoch) a.thumbFailed[task.key] = 1;
        }).then(function () {
          // 缓存已被清空时，旧请求不得改动新会话的并发计数 / 排队标记。
          if (epoch !== a.thumbEpoch) return;
          delete a.thumbQueued[task.key];
          if (a.thumbActive > 0) a.thumbActive--;
          paintAssetThumb(task.key);
          pumpAssetThumbs();
        });
      })(job);
    }
  }

  function queueAssetThumb(item) {
    var a = assetState();
    var key = assetKey(item);
    if (!item.thumbUrl || a.thumbCache[key] || a.thumbFailed[key] || a.thumbQueued[key]) return;
    a.thumbQueued[key] = 1;
    a.thumbQueue.push({ key: key, item: item });
    pumpAssetThumbs();
  }

  /** 方形缩略图格子：下载中显示 loading.gif，成功后替换为 data URL。 */
  function buildAssetThumb(item) {
    var a = assetState();
    var key = assetKey(item);
    var box = mk("div", { class: "asset-thumb" });

    if (!item.thumbUrl || a.thumbFailed[key]) {
      box.appendChild(assetFallbackNode(item.thumbUrl ? T("assets.noPreview") : assetPlaceholderText(item)));
      return box;
    }

    var img = mk("img", { alt: "" });
    if (a.thumbCache[key]) {
      img.className = "asset-thumb-img";
      img.setAttribute("src", a.thumbCache[key]);
      try { img.src = a.thumbCache[key]; } catch (e) { /* ignore */ }
    } else {
      img.className = "asset-thumb-img loading";
      img.setAttribute("src", ASSET_THUMB_LOADING);
      try { img.src = ASSET_THUMB_LOADING; } catch (e) { /* ignore */ }
    }
    box.appendChild(img);
    queueAssetThumb(item);
    return box;
  }

  /** 缩略图 / 占位 / 状态角标 / 三个操作按钮。 */
  function buildAssetCard(item) {
    var card = mk("div", { class: "asset-card", title: item.title || "" });
    card.setAttribute("data-asset-key", assetKey(item));
    card.appendChild(buildAssetThumb(item));

    if (item.status && item.status !== "completed") {
      // 未知状态（服务端新增枚举）只显示灰色角标，不要伪装成「进行中」。
      var badgeTone = item.status === "failed" || item.status === "cancelled"
        ? " failed" : (JOB_RUNNING_STATUS[item.status] ? " running" : "");
      card.appendChild(mk("div", { class: "asset-badge" + badgeTone, text: jobStatusText(item.status) }));
    }

    var actions = mk("div", { class: "asset-actions" });
    var canPlace = !!item.url && item.media === "image" &&
      !JOB_RUNNING_STATUS[item.status] && item.status !== "failed" && item.status !== "cancelled";
    var placeBtn = mk("button", {
      class: "asset-act", type: "button", text: T("assets.place"),
      on: {
        click: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          placeAssetItem(item, placeBtn);
        }
      }
    });
    if (!canPlace) placeBtn.disabled = true;
    // 视频结果不能置入 PS，但仍可在浏览器查看。
    var openBtn = mk("button", {
      class: "asset-act", type: "button", text: T("assets.open"),
      on: {
        click: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          openAssetItem(item, openBtn);
        }
      }
    });
    if (!item.url) openBtn.disabled = true;
    var delBtn = mk("button", {
      class: "asset-act danger", type: "button", text: T("assets.delete"),
      on: {
        click: function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          deleteAssetItem(item, delBtn);
        }
      }
    });
    actions.appendChild(placeBtn);
    actions.appendChild(openBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);

    // 鼠标悬停由 CSS 负责；点一下卡片也能展开操作（触屏 / 悬停不生效时）。
    card.addEventListener("click", function () {
      card.classList.toggle("actions-open");
    });
    return card;
  }

  function renderAssets() {
    var grid = $("assetGrid");
    if (!grid) return;
    var a = assetState();
    clear(grid);
    for (var i = 0; i < a.items.length; i++) grid.appendChild(buildAssetCard(a.items[i]));

    var loading = $("assetLoading");
    if (loading) {
      loading.classList.toggle("hidden", !a.loading);
      // 已有卡片时只在网格下方显示一行小提示，不清空网格。
      loading.classList.toggle("inline", a.items.length > 0);
    }

    var empty = $("assetEmpty");
    if (empty) {
      var showEmpty = !a.items.length && !a.loading;
      empty.classList.toggle("hidden", !showEmpty);
      if (showEmpty) {
        if (a.error) empty.textContent = T("assets.loadFailed", { msg: a.error });
        else empty.textContent = T("assets.emptyJobs");
      }
    }

    var more = $("btnAssetsMore");
    if (more) {
      more.classList.toggle("hidden", !a.hasMore || a.loading);
      more.disabled = a.loading;
    }
  }

  function onEnterAssets() {
    if (!API.hasToken()) {
      toast(T("err.noToken"), "error");
      setupReturn = "screenAssets";
      show("screenSetup");
      return;
    }
    renderAssets();
    // 只在首次进入（或上次加载失败）时拉列表。之后切回资产页直接复用内存
    // 中的卡片和缩略图；本地新生成的任务已由 noteAssetJob 插入，网页端的
    // 改动需要同步时点右上角刷新。
    var a = assetState();
    if (!a.loaded) {
      if (!a.loading) loadAssets(true);
      return;
    }
    // 仅当本地任务失败但列表里没有对应记录时，后台静默同步一次。
    if (a.stale && !a.loading) loadAssets(true, true);
  }

  /** 生成结果的签名 URL 会过期：置入 / 打开前重新查一次，失败再用旧地址。 */
  async function placeAssetItem(item, btn) {
    if (!item || !item.url) { toast(T("assets.noUrl"), "error"); return; }
    if (item.media !== "image") { toast(T("assets.noUrl"), "error"); return; }
    if (btn) btn.disabled = true;
    var b64 = null;
    showProgress(T("assets.downloading"), item.title || "", false);
    try {
      var url = await refreshResultUrl(item.url, item.id);
      if (!url) throw new Error(T("assets.noUrl"));
      b64 = await API.downloadBase64(url);
      var size = PS.imageSizeFromBase64(b64);
      // 与历史记录置入一致：按真实像素打开新文档，不再兜底 1024。
      var res = await PS.place({
        base64: b64,
        mode: "newDocument",
        docWidth: size && size.width,
        docHeight: size && size.height,
        name: item.title || "Krea"
      });
      toast(T("gen.placed", { name: (res && res.name) || item.title || "Krea" }), "ok");
    } catch (e) {
      console.error("[Krea for Ps] placeAssetItem", e);
      // 下载成功但置入失败时把图片留在插件数据目录，用户仍能手动打开。
      var savedPath = "";
      if (b64) {
        try {
          var saved = await PS.writePng(b64, "krea-asset-" + Date.now() + ".png");
          savedPath = (saved && (saved.nativePath || saved.name)) || "";
        } catch (e2) { /* ignore */ }
      }
      if (savedPath) toast(T("assets.placeFailedSaved", { path: savedPath }), "error");
      else handleError(e, "assets.place");
    } finally {
      hideProgress();
      if (btn) btn.disabled = false;
    }
  }

  async function openAssetItem(item, btn) {
    if (!item || !item.url) { toast(T("assets.noUrl"), "error"); return; }
    if (btn) btn.disabled = true;
    try {
      var url = await refreshResultUrl(item.url, item.id);
      if (!url) { toast(T("assets.noUrl"), "error"); return; }
      await openExternal(url);
    } catch (e) {
      handleError(e, "assets.open");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function deleteAssetItem(item, btn) {
    if (!item || !item.id) return;
    // 手动刷新期间旧网格仍可点击；等列表请求结束再删，避免删除结果被
    // 稍后返回的刷新响应覆盖。
    if (assetState().loading) return;
    var ok = await confirmSheet(T("assets.deleteConfirm"));
    if (!ok) return;
    if (btn) btn.disabled = true;
    try {
      await API.deleteJob(item.id);
      var a = assetState();
      var kept = [];
      for (var i = 0; i < a.items.length; i++) {
        if (!(a.items[i].id === item.id && a.items[i].kind === item.kind)) kept.push(a.items[i]);
      }
      a.items = kept;
      renderAssets();
      toast(T("assets.deleted"), "ok");
      // 删空当前页但还有下一页时自动补一页，避免页面空着却显示“加载更多”。
      if (!a.items.length && a.hasMore && !a.loading) loadAssets(false);
    } catch (e) {
      if (btn) btn.disabled = false;
      handleError(e, "assets.delete");
    }
  }

  /* ============================== 事件绑定 ============================== */
  var appsSearchTimer = null;

  /** 搜索框有内容时显示右侧清除按钮。 */
  function syncSearchClear() {
    var input = $("appsSearch");
    var clearBtn = $("btnAppsSearchClear");
    if (!input || !clearBtn) return;
    clearBtn.classList.toggle("hidden", !String(input.value || "").trim());
  }

  /**
   * 对话页可用高度。
   *
   * UXP 对 flex-basis: 0 / min-height: 0 的支持并不稳定：消息多时 stream 会
   * 被内容撑高，而 body 又是 overflow:hidden，底部消息就永远看不到。
   * 这里在页面显示和窗口尺寸变化时显式计算 stream 高度，保证它自己滚动。
   */
  function fitChatStream() {
    if (st.screen !== "screenChat") return;
    var body = $("body");
    var screen = $("screenChat");
    var stream = $("chatStream");
    if (!body || !screen || !stream) return;
    try {
      var bodyH = body.clientHeight || 0;
      if (!bodyH) return;
      var top = screen.querySelector(".chat-top-row");
      var composer = screen.querySelector(".chat-composer");
      var used = (top ? top.offsetHeight : 0) + (composer ? composer.offsetHeight : 0) + 34;
      var h = Math.max(120, bodyH - used);
      // flex-basis 为 0 时 height 不参与主尺寸计算，这里切换成固定尺寸，
      // 确保 UXP 不会按内容高度把 stream 撑出可视区。
      stream.style.flex = "0 0 auto";
      stream.style.height = h + "px";
      stream.style.maxHeight = h + "px";
    } catch (e) { /* 老版本 UXP 没有布局信息时退回 CSS flex */ }
  }

  function resetChatStreamHeight() {
    var stream = $("chatStream");
    if (!stream) return;
    stream.style.flex = "";
    stream.style.height = "";
    stream.style.maxHeight = "";
  }

  /**
   * 搜索框防抖。
   * UXP 的输入框在每次 input 时重建 100+ 个 App 卡片会明显卡顿，
   * 打字过程中还会出现丢字/光标跳动的观感。这里等用户停止输入 150ms 再过滤。
   */
  function scheduleAppsSearch() {
    if (appsSearchTimer) clearTimeout(appsSearchTimer);
    appsSearchTimer = setTimeout(function () {
      appsSearchTimer = null;
      var next = String($("appsSearch").value || "").trim();
      if (next === st.appQuery) return;
      st.appQuery = next;
      renderApps();
    }, 150);
  }

  function bindEvents() {
    $("tabApps").addEventListener("click", function () { showTab("apps"); });
    $("tabGenerate").addEventListener("click", function () { showTab("generate"); });
    if ($("tabBanana")) $("tabBanana").addEventListener("click", function () { showTab("chat"); });
    if ($("tabAssets")) $("tabAssets").addEventListener("click", function () { showTab("assets"); });

    // 资产页：刷新 / 加载更多
    if ($("btnAssetsRefresh")) {
      $("btnAssetsRefresh").addEventListener("click", function () { loadAssets(true); });
    }
    if ($("btnAssetsMore")) {
      $("btnAssetsMore").addEventListener("click", function () {
        if (!assetState().loading) loadAssets(false);
      });
    }

    $("btnLang").addEventListener("click", function () {
      I18N.toggle();
      S.setPrefs({ lang: I18N.lang() });
    });

    $("btnSettings").addEventListener("click", function () {
      show("screenSettings");
      renderSettings();
    });

    var checkUpdate = $("btnCheckUpdate");
    if (checkUpdate) checkUpdate.addEventListener("click", checkForUpdates);

    $("btnPromptHistory").addEventListener("click", function () { renderHistory(); show("screenHistory"); });
    $("btnPromptLibrary").addEventListener("click", function () { renderLibrary(); show("screenLibrary"); });
    $("btnSavePromptToLib").addEventListener("click", onSaveCurrentPromptToLibrary);

    // 生成页：输入选项（原版把这些放在生成界面，不再放设置里）
    $("layerSamplingOptions").addEventListener("change", function () {
      st.prefs.sampling = radioValue($("layerSamplingOptions")) || "visible";
      S.setPrefs({ sampling: st.prefs.sampling });
      resetGenerateButtonMode();
    });
    $("outputOptions").addEventListener("change", function () {
      var next = radioValue($("outputOptions"));
      st.prefs.outputMode = next === "replace" ? "replace" : "newLayer";
      S.setPrefs({ outputMode: st.prefs.outputMode });
      resetGenerateButtonMode();
    });
    $("promptInput").addEventListener("input", function () {
      resetGenerateButtonMode();
    });

    var featherInput = configureFeatherInput();
    if (featherInput) {
      // input 覆盖正常键入；keyup 兜底部分 UXP 版本不派发 input；
      // change / blur 负责夹回 0–250 并持久化。
      var onFeatherTyping = function () {
        var raw = String(featherInput.value || "").trim();
        var v = featherAmount();
        st.prefs.feather = v;
        // 输入 255 / 999 / -40 时立刻夹回合法值；空输入先不打断用户键入。
        var n = parseFloat(raw);
        if (raw !== "" && isFinite(n) && n !== v) featherInput.value = String(v);
      };
      featherInput.addEventListener("input", onFeatherTyping);
      featherInput.addEventListener("keyup", onFeatherTyping);
      featherInput.addEventListener("change", function () {
        setFeather(featherAmount());
      });
      featherInput.addEventListener("blur", function () {
        setFeather(featherAmount());
      });
    }
    $("featherEdgesBtn").addEventListener("click", onFeather);
    $("featherMinusBtn").addEventListener("click", function () { setFeather(featherAmount() - 1); });
    $("featherPlusBtn").addEventListener("click", function () { setFeather(featherAmount() + 1); });
    $("refImageBtn").addEventListener("click", addGenerateRefs);
    $("clearRefImagesBtn").addEventListener("click", function () {
      st.refs = [];
      renderGenerateRefs();
    });

$("btnClearHistory").addEventListener("click", onClearHistory);
    $("btnHistoryBack").addEventListener("click", function () { show("screenGenerate"); });
    $("btnAddPrompt").addEventListener("click", function () { openPromptEditor(null, -1); });
    $("btnImportLibrary").addEventListener("click", onImportLibrary);
    $("btnExportLibrary").addEventListener("click", onExportLibrary);
    $("btnRestoreLibrary").addEventListener("click", onRestoreLibrary);
    $("btnSavePrompt").addEventListener("click", onSavePrompt);
    $("btnExportFolder").addEventListener("click", onOpenExportFolder);
    $("btnExportClose").addEventListener("click", hideExportResult);
    $("categoryTrigger").addEventListener("click", function () { pickCategory(); });

    $("btnProgressCancel").addEventListener("click", function () {
      st.cancelFlag = true;
      $("btnProgressCancel").disabled = true;
      $("btnProgressCancel").textContent = T("gen.cancelling");
    });

    if ($("btnAppsSearchClear")) {
      var activateSearchClear = function (ev) {
        if (ev && ev.preventDefault) ev.preventDefault();
        $("appsSearch").value = "";
        st.appQuery = "";
        syncSearchClear();
        renderApps();
        try { $("appsSearch").focus(); } catch (e) { /* ignore */ }
      };
      $("btnAppsSearchClear").addEventListener("click", activateSearchClear);
      $("btnAppsSearchClear").addEventListener("keydown", function (ev) {
        if (ev && (ev.key === "Enter" || ev.key === " " || ev.keyCode === 13 || ev.keyCode === 32)) activateSearchClear(ev);
      });
    }

    // input 覆盖正常键入 / 粘贴；keyup 兜底部分 UXP 版本不派发 input；
    // change 兜底回车或失焦。三个事件都走同一个防抖，不会重复渲染。
    $("appsSearch").addEventListener("input", function () { syncSearchClear(); scheduleAppsSearch(); });
    $("appsSearch").addEventListener("keyup", function () { syncSearchClear(); scheduleAppsSearch(); });
    $("appsSearch").addEventListener("change", function () { syncSearchClear(); scheduleAppsSearch(); });
$("appFilters").addEventListener("click", function (ev) {
      var el = ev.target;
      var filter = null;
      while (el && el !== ev.currentTarget) {
        if (el.getAttribute && el.getAttribute("data-filter")) { filter = el.getAttribute("data-filter"); break; }
        el = el.parentNode;
      }
      if (!filter || filter === st.appFilter) return;
      st.appFilter = filter;
      S.setPrefs({ appFilter: filter });
      // workspace / all 都走 refreshApps（workspace 拉实时，all 用内置精选，本地即时）；
      // fav 只基于当前列表过滤，无需刷新。
      if (filter === "fav") renderApps();
      else refreshApps(true);
    });
    $("btnAppsMore").addEventListener("click", function () { refreshApps(true, true); });
    $("btnAppsRefresh").addEventListener("click", function () { refreshApps(true); });
    var hideToggles = [
      { id: "hideAppsAll", key: "hideAppsAll", filter: "all" },
      { id: "hideAppsFav", key: "hideAppsFav", filter: "fav" }
    ];
    for (var hti = 0; hti < hideToggles.length; hti++) {
      (function (cfg) {
        var box = $(cfg.id);
        if (!box) return;
        box.addEventListener("change", function () {
          var hide = !!box.checked;
          st[cfg.key] = hide;
          st.prefs[cfg.key] = hide;
          var switched = hide && st.appFilter === cfg.filter;
          if (switched) st.appFilter = "workspace";
          var patch = { hideAppsFilters: false };
          patch[cfg.key] = hide;
          if (switched) patch.appFilter = "workspace";
          S.setPrefs(patch);
          renderApps();
          if (switched && API.hasToken()) refreshApps(true);
        });
      })(hideToggles[hti]);
    }
    if ($("btnRunApp")) $("btnRunApp").addEventListener("click", onRunApp);

    if ($("chatBtnUseSelection")) $("chatBtnUseSelection").addEventListener("click", async function () {
      try {
        await captureSelectionForGenerate();
        renderChatSource();
        var src = st.source;
        toast(T("gen.sourceSel", { w: (src && src.width) || 0, h: (src && src.height) || 0 }), "ok");
      } catch (e) {
        var msg = errMsg(e);
        toast(msg === T("gen.needDoc") || msg === T("gen.needSelection")
          ? T("chat.needSource") : T("gen.captureFailed", { msg: msg }), "error");
      }
    });
    if ($("chatBtnPick")) $("chatBtnPick").addEventListener("click", async function () {
      try {
        var files = await PS.pickImageFiles(false);
        if (!files || !files.length) return;
        var res = await PS.fileToBase64(files[0]);
        if (!res) return;
        st.source = {
          base64: res.base64, mime: res.mime, name: res.name,
          width: res.width || 0, height: res.height || 0, kind: "file"
        };
        renderChatSource();
        toast(T("gen.sourceFile", { name: res.name }), "ok");
      } catch (e) {
        // 文件过大 / 读取失败：给出可读提示，避免 unhandledrejection 变成致命横幅。
        toast(T("gen.captureFailed", { msg: errMsg(e) }), "error");
      }
    });
    if ($("chatSendBtn")) $("chatSendBtn").addEventListener("click", onChatSend);
    if ($("chatClearBtn")) $("chatClearBtn").addEventListener("click", onChatClear);
    if ($("chatPrompt")) {
      $("chatPrompt").addEventListener("keydown", function (e) {
        // Ctrl/Cmd + Enter 发送
        if (e && (e.key === "Enter" || e.keyCode === 13) && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          onChatSend();
        }
      });
    }
    $("generateBtn").addEventListener("click", onGenerate);

    $("btnGetToken").addEventListener("click", openTokenPage);
    $("btnPasteToken").addEventListener("click", onPasteToken);
    $("btnTestToken").addEventListener("click", onTestToken);
    $("btnSaveToken").addEventListener("click", onSaveToken);
    $("tokenInput").addEventListener("input", function () {
      setSetupNotice(T("setup.notTested"), "muted");
    });
    // 掩码状态下聚焦即清空，用户直接粘贴/输入即可替换；失焦且仍为空时恢复掩码。
    $("tokenInput").addEventListener("focus", function () {
      try {
        if (String($("tokenInput").value || "") === TOKEN_MASK) $("tokenInput").value = "";
      } catch (e) { /* ignore */ }
    });
    $("tokenInput").addEventListener("blur", function () {
      try {
        if (!String($("tokenInput").value || "").trim() && API.hasToken()) syncTokenField();
      } catch (e) { /* ignore */ }
    });

    $("btnChangeToken").addEventListener("click", function () {
      setupReturn = st.screen && st.screen !== "screenSetup" ? st.screen : "screenSettings";
      setupCanReturn = true;
      $("tokenInput").value = "";
      setSetupNotice(T("setup.notTested"), "muted");
      show("screenSetup");
      updateSetupBadge();
    });
    $("btnSignOut").addEventListener("click", async function () {
      if (!(await confirmSheet(T("settings.signOut") + "?"))) return;
      try {
        await S.clearToken();
      } catch (e) {
        toast(T("err.generic", { msg: errMsg(e) }), "error");
        return;
      }
      API.setToken(null);
      st.token = null;
      st.apps = [];
      // 退出登录后不保留上一个账号的生成历史缩略图（只清内存）。
      resetAssetHistory();
      setupReturn = "screenSettings";
      setupCanReturn = false;
      updateHeader();
      updateSetupBadge();
      setSetupNotice(T("setup.notTested"), "muted");
      toast(T("settings.signedOut"), "ok");
      show("screenSetup");
    });
    $("btnOpenAssets").addEventListener("click", function () {
      openExternal(KREA_ASSETS);
    });
    $("btnClearCache").addEventListener("click", async function () {
      try {
        await S.removeFile(APPS_CACHE);
        await S.removeFile(FEATURED_CACHE);
      } catch (e) {
        toast(T("err.generic", { msg: errMsg(e) }), "error");
        return;
      }
      st.apps = [];
      st.appsFetchedAt = 0;
      st.appsOffline = false;
      st.appsSource = "builtin";
      st.appsManifestUpdatedAt = 0;
      renderApps();
      toast(T("settings.cacheCleared"), "ok");
    });
    $("btnReset").addEventListener("click", async function () {
      if (!(await confirmSheet(T("settings.resetConfirm")))) return;
      try {
        await clearAllLocalData();
      } catch (e) {
        toast(T("err.generic", { msg: errMsg(e) }), "error");
        return;
      }
      resetSessionAfterClear();
      toast(T("settings.resetDone"), "ok");
      show("screenSetup");
    });
    $("btnAboutContact").addEventListener("click", contactAuthor);

    if (window.addEventListener) window.addEventListener("resize", function () { fitChatStream(); });
    syncSearchClear();
  }

  /*
   */
  var booted = false;
  var dataLoaded = false;
  /* 启动时存储读取超时的原因（只写诊断文件，不含 Token）。 */
  var bootStorageError = "";
  var storageWarned = false;

  /**
   */
  function checkBuildStamp() {
    var el = $("buildStamp");
    if (!el) return;
    var domVer = el.getAttribute("data-version");
    if (domVer && domVer !== VERSION) {
      fatal(T("boot.versionMismatch", { html: domVer, js: VERSION }));
    }
  }

  function bindLangListener() {
    I18N.onChange(function () {
      try {
        buildModelPicker();
        renderApps();
        renderHistory();
        renderLibrary();
        renderGenerateRefs();
        renderModelForm();
        renderAbout();
        renderAssets();
        renderFooter();
        renderSettings();
        updateHeader();
        if (!$("exportResult").classList.contains("hidden")) showExportResult(st.lastExportPath);
      } catch (e) {
        console.error("[Krea for Ps] lang switch failed", e);
      }
    });
  }

  function boot() {
    if (booted) {
      // 面板隐藏期间用户可能切换了 PS 主题，show 时补刷一次图标。
      try { applyIconTheme(); } catch (e) { /* ignore */ }
      if (st.token) refreshApps(false);
      return;
    }
    booted = true;

    // 1) 依赖完整性检查（脚本没加载全时给出明确提示，而不是静默死掉）
    var missing = [];
    if (!window.KREA_MODELS) missing.push("models.js");
    if (!window.KREA_I18N) missing.push("i18n.js");
    if (!window.KREA_STORE) missing.push("store.js");
    if (!window.KREA_API) missing.push("api.js");
    if (!window.KREA_PS) missing.push("ps.js");
    if (missing.length) {
      fatal("脚本未完整加载，缺少：" + missing.join(", ") + "。请在 UXP 开发者工具控制台查看报错。");
      return;
    }

st.prefs = JSON.parse(JSON.stringify(S.DEFAULT_PREFS));

    try { upgradeStaticDom(); } catch (e) { console.error("[Krea for Ps] DOM 降级失败", e); }
    try { preloadProgressGif(); } catch (e) { /* 预加载失败不影响运行 */ }
    try { PS.init(); } catch (e) { console.error("[Krea for Ps] PS init 失败", e); }
    try { checkBuildStamp(); } catch (e) { /* ignore */ }
    try { applyIconTheme(); } catch (e) { /* ignore */ }
    try { I18N.applyDom(document.body || document.documentElement); } catch (e) { /* ignore */ }

    try {
      bindEvents();
      bindLangListener();
    } catch (e) {
      fatal(T("boot.failed", { msg: "bindEvents: " + errMsg(e) }));
    }

    // 4) 先渲染空壳，保证界面可用
    try { buildModelPicker(); } catch (e) { console.error(e); }
    try { renderApps(); } catch (e) { console.error(e); }
    try { renderHistory(); } catch (e) { console.error(e); }
    try { renderLibrary(); } catch (e) { console.error(e); }
    try { show("screenSetup"); } catch (e) { console.error(e); }

    // 动态渲染的按钮也补刷主题；静态 HTML 里的图标在启动时已刷过一次。
    try { applyIconTheme(); } catch (e) { /* ignore */ }

    // 支持 prefers-color-scheme 的 UXP 版本：系统主题切换时立即换图标。
    try {
      if (window.matchMedia) {
        var mqTheme = window.matchMedia("(prefers-color-scheme: light)");
        var onThemeChange = function () {
          try { applyIconTheme(); } catch (e2) { /* ignore */ }
        };
        if (mqTheme && mqTheme.addEventListener) mqTheme.addEventListener("change", onThemeChange);
        else if (mqTheme && mqTheme.addListener) mqTheme.addListener(onThemeChange);
      }
    } catch (e3) { /* ignore */ }

    // 有些 UXP 版本既不派发 matchMedia change，也没有主题事件。
    // 低频对比主机背景色，主题真的变化时才整批换图标，避免每次重建 img。
    try {
      var lastTheme = document.documentElement.getAttribute("data-theme") || "";
      var themeTimer = setInterval(function () {
        var nextTheme = isLightTheme() ? "light" : "dark";
        if (nextTheme === lastTheme) return;
        lastTheme = nextTheme;
        try { applyIconTheme(); } catch (e4) { /* ignore */ }
      }, 1500);
      if (themeTimer && typeof themeTimer.unref === "function") themeTimer.unref();
    } catch (e5) { /* ignore */ }

    // 5) 异步加载数据
    loadData().catch(function (e) {
      fatal(T("boot.failed", { msg: errMsg(e) }));
    });

    // 6) 静默检查更新：失败不打扰用户，只有发现新版本才提示一次。
    // 不 await，避免更新服务器慢时拖住面板启动。
    try { checkForUpdates({ silent: true }); } catch (e) { /* ignore */ }
  }

  /** 把读到的 Token 应用到会话状态（正常启动和超时后的后台恢复共用）。 */
  function applySessionToken(token) {
    st.token = token || null;
    API.setToken(st.token);
    updateSetupBadge();
    setSetupNotice(st.token ? T("setup.statusReady") : T("setup.notTested"), st.token ? "ok" : "muted");
  }

  /**
   * 启动时存储读取超时：不要显示“致命错误”。UXP 的 secureStorage / 文件系统
   * 在刚启动、杀毒软件扫描或另一份 Photoshop 占用数据目录时可能短暂卡住，
   * 超时后继续在后台读取即可，没必要让用户重新输入 Token。
   */
  function warnStorageSlow(e) {
    if (storageWarned) return;
    storageWarned = true;
    try { toast(T("boot.storageSlow", { msg: errMsg(e) }), "error"); } catch (e2) { /* ignore */ }
  }

  /** 写入不含 Token 的存储诊断；超时后 Token 若在后台恢复，会再写一次。 */
  function writeStorageStatus() {
    try {
      var storage = S.storageInfo ? S.storageInfo() : null;
      console.log("[Krea for Ps] token storage", storage);
      S.writeJson("storage-status.json", {
        at: new Date().toISOString(),
        version: VERSION,
        ps: PS.version ? PS.version() : "",
        token: st.token ? "present" : "missing",
        bootError: bootStorageError || null,
        storage: storage
      }).catch(function (e) { console.warn("[Krea for Ps] 写入 storage-status.json 失败", e); });
    } catch (e) { /* 诊断失败不影响启动 */ }
  }

  async function loadData() {
    if (dataLoaded) return;
    dataLoaded = true;

    // 偏好：超时就用默认值继续，不阻塞整个面板。
    var prefsTask = S.getPrefs();
    try {
      st.prefs = await withTimeout(prefsTask, 8000, "prefs");
    } catch (e) {
      console.error("[Krea for Ps] 读取偏好失败", e);
      bootStorageError = "prefs:" + errMsg(e);
      warnStorageSlow(e);
    }
    if (st.prefs.lang) I18N.setLang(st.prefs.lang);
    st.model = MODELS.models[st.prefs.model] ? st.prefs.model : MODELS.defaultModel;
    var legacyHideFilters = !!st.prefs.hideAppsFilters;
    st.hideAppsAll = !!st.prefs.hideAppsAll;
    st.hideAppsFav = !!st.prefs.hideAppsFav;
    // 旧版只有一个「隐藏全部和收藏夹」开关：首次升级时迁移为两个独立开关。
    if (legacyHideFilters && !st.hideAppsAll && !st.hideAppsFav) {
      st.hideAppsAll = true;
      st.hideAppsFav = true;
      st.prefs.hideAppsAll = true;
      st.prefs.hideAppsFav = true;
      st.prefs.hideAppsFilters = false;
      S.setPrefs({ hideAppsAll: true, hideAppsFav: true, hideAppsFilters: false });
    }
    st.appFilter = ["all", "fav", "workspace"].indexOf(st.prefs.appFilter) >= 0 ? st.prefs.appFilter : "all";
    // 当前选中的筛选被隐藏时回落到工作区。
    if ((st.appFilter === "all" && st.hideAppsAll) || (st.appFilter === "fav" && st.hideAppsFav)) {
      st.appFilter = "workspace";
    }
    if (st.prefs.sampling !== "selected") st.prefs.sampling = "visible";
    if (st.prefs.outputMode !== "replace") st.prefs.outputMode = "newLayer";
    st.agentModel = AGENT_MODEL_LABELS[st.prefs.agentModel] ? st.prefs.agentModel : "";
    try { buildModelPicker(); } catch (e) { /* ignore */ }

    // Token：超时后不把 tokenTask 丢掉，它稍后读到的 Token 仍可在后台恢复。
    var tokenTask = S.getToken();
    try {
      st.token = await withTimeout(tokenTask, 8000, "token");
    } catch (e) {
      console.error("[Krea for Ps] 读取 Token 失败", e);
      st.token = null;
      bootStorageError = (bootStorageError ? bootStorageError + "; " : "") + "token:" + errMsg(e);
      warnStorageSlow(e);
      tokenTask.then(function (lateToken) {
        if (!lateToken || st.token) return;
        console.warn("[Krea for Ps] Token 在超时后恢复，继续使用已保存的 Token");
        bootStorageError = (bootStorageError ? bootStorageError + "; " : "") + "token:recovered-after-timeout";
        applySessionToken(lateToken);
        writeStorageStatus();
        // 用户还停在登录页且没有输入新 Token 时，自动回到正常页面。
        if (st.screen === "screenSetup") {
          var input = $("tokenInput");
          if (!input || !String(input.value || "").trim()) {
            try {
              showTab(st.prefs.tab || "apps");
              if (st.tab === "apps") refreshApps(false);
            } catch (e2) { /* ignore */ }
          }
        }
      }).catch(function (e2) {
        console.warn("[Krea for Ps] Token 后台恢复失败", e2);
      });
    }
    applySessionToken(st.token);
    // 存储诊断落盘（不含 Token）：排查“PS 重启后又要输入 Token”时直接看这个文件。
    writeStorageStatus();

    // 本地数据
    try {
      await withTimeout(Promise.all([loadHistory(), loadLibrary(), loadAppCache()]), 12000, "localdata");
    } catch (e) {
      console.error("[Krea for Ps] 读取本地数据失败", e);
    }

    try { renderApps(); } catch (e) { /* ignore */ }
    try { renderHistory(); } catch (e) { /* ignore */ }
    try { renderLibrary(); } catch (e) { /* ignore */ }
    try { await renderSettings(); } catch (e) { /* ignore */ }
    try { renderAbout(); } catch (e) { /* ignore */ }
    try { updateHeader(); } catch (e) { /* ignore */ }

    if (!st.token) {
      try { show("screenSetup"); } catch (e) { /* ignore */ }
      return;
    }
    try { showTab(st.prefs.tab || "apps"); } catch (e) { /* ignore */ }
    refreshApps(false);
  }

  /* ============================== 自检 ==============================
   */
  window.KREA_SELFTEST = async function () {
    var out = { pass: [], fail: [], warn: [] };
    var check = function (name, cond, extra) {
      (cond ? out.pass : out.fail).push(name + (extra ? " — " + extra : ""));
    };

var ids = Object.keys(MODELS.models);
    check("models.count", ids.length >= 40, ids.length + " models");
    check("models.groups", MODELS.groups.length > 0);
    check("models.default", !!MODELS.models[MODELS.defaultModel]);
    var badEndpoint = ids.filter(function (id) { return !/^\/generate\/(image|enhance)\//.test(MODELS.models[id].endpoint); });
    check("models.endpoints", badEndpoint.length === 0, badEndpoint.join(","));
    var badRoles = [];
    ids.forEach(function (id) {
      var m = MODELS.models[id];
      if (m.roles.source && !m.fields.some(function (f) { return f.name === m.roles.source; })) badRoles.push(id + ".source");
      (m.roles.refs || []).forEach(function (r) {
        if (!m.fields.some(function (f) { return f.name === r; })) badRoles.push(id + "." + r);
      });
    });
    check("models.roles", badRoles.length === 0, badRoles.join(","));

    // 2) DOM 结构
    var required = ["screenSetup", "screenApps", "screenGenerate", "screenChat", "screenAppRun", "screenSettings", "screenAbout",
      "screenAssets", "tabAssets", "btnAssetsRefresh", "assetGrid", "assetLoading", "assetEmpty", "btnAssetsMore",
      "modelTrigger", "promptInput", "btnPromptHistory", "btnPromptLibrary",
      "refImageBtn", "clearRefImagesBtn", "refImagePreviewList", "layerSamplingOptions", "outputOptions",
      "generateBtn", "error-message", "featherEdgesBtn", "featherAmountInput", "featherAmountLabel",
      "featherMinusBtn", "featherPlusBtn",
      "appFilters", "appsList", "btnAppsSearchClear", "btnRunApp", "appRunRecovery", "footerAbout", "footerActions",
      "hideAppsAll", "hideAppsFav",
      "btnSavePrompt", "exportResult", "exportResultTitle", "exportResultPath", "exportResultHint",
      "btnExportFolder", "btnExportClose",
      "chatPrompt", "chatSendBtn", "chatStream", "chatSourceThumb", "chatBtnPick", "chatClearBtn",
      "setupTokenBadge", "tokenInput", "btnGetToken", "btnPasteToken", "btnTestToken", "btnSaveToken", "btnOpenAssets",
      "overlayProgress", "overlayConfirm", "sheetHost", "toastHost", "downloadRecovery"];
    var missingDom = required.filter(function (id) { return !document.getElementById(id); });
    check("dom.screens", missingDom.length === 0, missingDom.join(","));

var iconImgs = document.getElementsByTagName("img");
    var icoTotal = 0, icoLoaded = 0;
    for (var ii = 0; ii < iconImgs.length; ii++) {
      if (String(iconImgs[ii].className || "").indexOf("k-icon") < 0) continue;
      icoTotal++;
      if (iconImgs[ii].naturalWidth > 0) icoLoaded++;
    }
    check("icons.png", icoTotal > 0, icoTotal + " icon <img>, " + icoLoaded + " loaded");
    if (icoTotal > 0 && icoLoaded < icoTotal) {
      out.warn.push("icon PNG 未全部加载（" + icoLoaded + "/" + icoTotal + "），可能是路径问题");
    }
    // 实际渲染尺寸自检：一次性看清「图标到底多大 / 源图多大」
    var bigIcons = [];
    for (var ij = 0; ij < iconImgs.length; ij++) {
      var ie = iconImgs[ij];
      if (String(ie.className || "").indexOf("k-icon") < 0) continue;
      var boxW = ie.clientWidth || ie.offsetWidth || 0;
      var rect = ie.getBoundingClientRect ? ie.getBoundingClientRect() : null;
      var drawnW = Math.max(boxW, rect ? Math.round(rect.width) : 0);
      if (drawnW > 20) {
        bigIcons.push((ie.getAttribute("data-icon") || "?") + " " + drawnW + "px (源图 " + (ie.naturalWidth || "?") + "px)");
      }
    }
    check("icons.size", bigIcons.length === 0, bigIcons.length ? bigIcons.join(", ") : "全部 ≤20px");
    check("dom.modelTrigger", !!document.getElementById("modelTrigger"));
    check("dom.sheetHost", !!document.getElementById("sheetHost"));
    var stampEl = document.getElementById("buildStamp");
    if (stampEl) check("build.stamp", stampEl.getAttribute("data-version") === VERSION,
      "html=" + stampEl.getAttribute("data-version") + " js=" + VERSION);

    // 3) i18n 覆盖
    var nodes = document.querySelectorAll("[data-i18n]");
    var untranslated = [];
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute("data-i18n");
      if (T(k) === k) untranslated.push(k);
    }
    check("i18n.dom", untranslated.length === 0, untranslated.join(","));
    check("i18n.mode", I18N.lang() === "zh" || I18N.lang() === "en", I18N.lang());

try {
      var original = await S.getToken();
      var sentinel = "krea-selftest-" + Date.now();
      var mode = null;
      try {
        mode = await S.setToken(sentinel);
        var read = await S.getToken();
        check("store.roundtrip", read === sentinel, "mode=" + mode);
        out.warn.push("token protection mode: " + mode);
        if (S.storageInfo) out.warn.push("token storage: " + JSON.stringify(S.storageInfo()));
      } finally {
        // 无论中间是否抛错，都必须还原原 Token，避免把用户登出
        try { if (original) await S.setToken(original); else await S.clearToken(); } catch (e2) { /* ignore */ }
      }
      var back = await S.getToken();
      check("store.restore", (back || null) === (original || null));
    } catch (e) {
      check("store.roundtrip", false, e.message);
    }

check("ps.version", PS.version() > 0, "PS " + PS.version());
    check("ps.capture-mode", true, PS.hasModernCapture() ? "imaging API (>=24.4)" : "clipboard fallback (<24.4)");
    var info = PS.docInfo();
    check("ps.doc", true, info ? (info.name + " " + info.width + "x" + info.height) : "no open document");

check("api.token", API.hasToken(), API.hasToken() ? "ok" : "not configured");
    check("api.base", API.BASE === "https://api.krea.ai");

    console.log("%c[Krea self-test] pass=" + out.pass.length + " fail=" + out.fail.length,
      "color:" + (out.fail.length ? "red" : "green"));
    out.pass.forEach(function (p) { console.log("  ✓ " + p); });
    out.warn.forEach(function (w) { console.log("  ! " + w); });
    out.fail.forEach(function (f) { console.error("  ✗ " + f); });
    return out;
  };

  /* */
  window.KREA_INTERNALS = {
    st: st,
    appSchemaToFields: appSchemaToFields,
    buildGenerateBody: buildGenerateBody,
    compareVersions: compareVersions,
    safeUpdateUrl: safeUpdateUrl,
    checkForUpdates: checkForUpdates,
    teamsContactUrl: teamsContactUrl,
    validateRequired: validateRequired,
    buildForm: buildForm,
    normalizeApp: normalizeApp,
    mergeApps: mergeApps,
    filteredApps: filteredApps,
    isVideoApp: isVideoApp,
    refreshApps: refreshApps,
    loadAppCache: loadAppCache,
    fetchFeaturedManifest: fetchFeaturedManifest,
    favorites: favorites,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    isMediaUrl: isMediaUrl,
    renderGenerateRefs: renderGenerateRefs,
    captureSelectionForGenerate: captureSelectionForGenerate,
    renderChatSource: renderChatSource,
    renderChatStream: renderChatStream,
    onGenerate: onGenerate,
    setGenerateError: setGenerateError,
    setGenerateButtonMode: setGenerateButtonMode,
    askAndPlaceAppResult: askAndPlaceAppResult,
    showAppRecovery: showAppRecovery,
    hideAppRecovery: hideAppRecovery,
    recoverDownloadInteractive: recoverDownloadInteractive,
    hideDownloadRecovery: hideDownloadRecovery,
    showProgress: showProgress,
    setProgress: setProgress,
    hideProgress: hideProgress,
    clearAssetThumbCache: clearAssetThumbCache,
    resetAssetHistory: resetAssetHistory,
    noteAssetJob: noteAssetJob,
    markAssetJobFailed: markAssetJobFailed,
    startProgressTimer: startProgressTimer,
    stopProgressTimer: stopProgressTimer
  };

  /* ============================== 启动 ==============================
   */
  try {
    require("uxp").entrypoints.setup({
      panels: {
        "krea.ps.rebuild.panel": {
          show: function () { boot(); },
          hide: function () { /* 面板隐藏时不做处理，下次 show 会静默刷新 */ }
        }
      }
    });
  } catch (e) {
    fatal(T("boot.failed", { msg: "entrypoints.setup: " + errMsg(e) }));
  }

  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  } catch (e) {
    boot();
  }
setTimeout(boot, 300);
})();
