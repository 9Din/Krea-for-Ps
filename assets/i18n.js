/* ============================================================================
 * i18n.js — 中英双语（中文为默认，跟随 Photoshop 界面语言，可手动切换）
 *   KREA_I18N.t("key", {n: 3})      取词
 *   KREA_I18N.applyDom(root)        翻译带 data-i18n / data-i18n-title / data-i18n-placeholder 的静态 DOM
 *   KREA_I18N.fieldLabel(name, gen) 表单字段名（优先词典，其次 models.js 生成的标签）
 * ========================================================================== */
window.KREA_I18N = (function () {
  "use strict";

  var LS_KEY = "krea.ps.lang";
  var LS_KEY_LEGACY = "krea.ps.uiLang";

  var DICT = {
    /* ------------------------------------------------------------- 通用 */
    "common.ok": ["确定", "OK"],
    "common.cancel": ["取消", "Cancel"],
    "common.close": ["关闭", "Close"],
    "common.confirm": ["确认", "Confirm"],
    "common.back": ["返回", "Back"],
    "common.save": ["保存", "Save"],
    "common.delete": ["删除", "Delete"],
    "common.loading": ["加载中…", "Loading…"],
    "common.working": ["处理中…", "Working…"],
    "common.untitled": ["未命名", "Untitled"],
    "common.na": ["—", "—"],
    "common.choose": ["请选择", "Choose"],
    "common.openFailed": ["无法打开链接，请手动复制到浏览器。", "Could not open the link. Copy it into your browser manually."],

    /* ------------------------------------------------------------- 顶部 */
    "nav.settings": ["设置", "Settings"],
    "nav.lang": ["切换语言", "Switch language"],
    "tab.apps": ["Apps", "Apps"],
    "tab.generate": ["生成", "Generate"],
    "tab.chat": ["对话", "Chat"],
    "tab.assets": ["资产", "Assets"],

    /* ------------------------------------------------------------- 资产页 */
    "assets.refresh": ["刷新", "Refresh"],
    "assets.jobs": ["生成历史", "Generated"],
    "assets.loading": ["正在加载…", "Loading…"],
    "assets.loadMore": ["加载更多", "Load more"],
    "assets.empty": ["暂无资产", "No assets yet"],
    "assets.emptyJobs": ["还没有生成记录", "No generated images yet"],
    "assets.loadFailed": ["加载失败：{msg}", "Could not load: {msg}"],
    "assets.downloading": ["正在下载并置入…", "Downloading and placing…"],
    "assets.place": ["置入 PS", "Place"],
    "assets.open": ["打开链接", "Open"],
    "assets.delete": ["删除", "Delete"],
    "assets.deleteConfirm": ["确定删除这个资产？删除后无法恢复。", "Delete this asset? This cannot be undone."],
    "assets.deleted": ["已删除", "Deleted"],
    "assets.placeFailedSaved": ["置入失败，图片已保存到 {path}", "Could not place; image saved to {path}"],
    "assets.noUrl": ["这个项目没有可用的图片链接", "No image URL is available for this item"],
    "assets.noPreview": ["无法预览", "Preview unavailable"],
    "assets.video": ["视频结果", "Video result"],
    "assets.failedItem": ["生成失败", "Generation failed"],
    "assets.runningItem": ["生成中…", "Generating…"],
    "assets.status.completed": ["已完成", "Completed"],
    "assets.status.failed": ["失败", "Failed"],
    "assets.status.cancelled": ["已取消", "Cancelled"],
    "assets.status.running": ["进行中", "Running"],
    "chat.empty": ["输入提示词，生成结果会按时间顺序出现在这里。", "Type a prompt — results will appear here in order."],
    "chat.placeholder": ["描述你想生成的画面…", "Describe what you want to generate…"],
    "chat.send": ["发送", "Send"],
    "chat.place": ["置入 PS", "Place to PS"],
    "chat.placeNewDoc": ["置入新画布", "New canvas"],
    "chat.delete": ["删除", "Delete"],
    "chat.clear": ["清空对话", "Clear chat"],
    "chat.clearConfirm": ["确定清空全部对话记录、输入内容和上传图片？", "Clear all messages, the prompt, and the uploaded image?"],
    "chat.upload": ["上传图片", "Upload image"],
    "chat.needSource": ["请先创建选区，或上传一张图片。", "Create a selection first, or upload an image."],
    "header.tagline": ["Generative Fill · HBA", "Generative Fill · HBA"],

    /* ------------------------------------------------------------- 密钥 */
    "setup.title": ["连接 Krea API", "Connect to Krea"],
    "setup.desc": ["粘贴你的 Krea API Token。插件只把它发送到 api.krea.ai。为了 PS 重启后不用重复输入，Token 会保存在本机 UXP 数据目录的 token.json（仅当前系统用户可读），并尽量另存到系统钥匙串 / 加密备份。", "Paste your Krea API token. It is only sent to api.krea.ai. To avoid re-entering it after a Photoshop restart, the token is kept in token.json inside the local UXP data folder (readable only by your OS user), with an additional keychain / encrypted backup when available."],
    "setup.getToken": ["获取 Token", "Get a token"],
    "setup.paste": ["粘贴", "Paste"],
    "setup.howto": ["使用步骤", "How it works"],
    "setup.howtoBody": ["1. 在 Krea 官网创建 API Token；2. 回到 Photoshop 选区或直接输入提示词；3. 生成结果会自动置入图层。", "1. Create an API token on krea.ai. 2. Make a selection or type a prompt in Photoshop. 3. The result is placed back as a layer."],
    "setup.tokenRequired": ["请输入有效的 Token", "Enter a valid token"],
    "boot.failed": ["插件初始化失败：{msg}", "Plugin init failed: {msg}"],
    "boot.storageSlow": ["本地存储读取较慢（{msg}），插件会继续在后台恢复；如果 Token 没有自动恢复，请重启 Photoshop 再试。", "Local storage is slow to respond ({msg}); the plugin will keep trying in the background. If the token does not come back, restart Photoshop."],
    "boot.versionMismatch": ["界面文件是 v{html}，脚本是 v{js} —— Photoshop 缓存了旧版本。请重启 Photoshop（或在 UXP Developer Tool 里 Remove 再 Add 插件）。", "The panel HTML is v{html} but the script is v{js} — Photoshop is serving cached files. Restart Photoshop (or Remove + Add the plugin in the UXP Developer Tool)."],
    "setup.saved": ["Token 已保存", "Token saved"],
    "setup.saveFailed": ["Token 保存失败：{msg}", "Could not save the token: {msg}"],
    "setup.verifying": ["正在验证 Token…", "Verifying token…"],
    "setup.verifyBad": ["Token 无效或没有权限：{msg}", "Token rejected: {msg}"],
    "setup.pasteEmpty": ["剪贴板里没有可用文本", "Clipboard has no text"],
    "setup.opened": ["已在浏览器打开 Krea Token 页面", "Opened the Krea token page in your browser"],
    "setup.test": ["检测 API", "Test API"],
    "setup.testing": ["正在检测 API…", "Testing the API…"],
    "setup.testOk": ["API 有效，Token 可以使用", "The API is valid — this token works"],
    "setup.testBad": ["API 检测失败：{msg}", "API check failed: {msg}"],
    "setup.testEmpty": ["API 没有返回有效结果", "The API returned no valid result"],
    "setup.notTested": ["尚未检测 Token", "Token not tested yet"],
    "setup.statusReady": ["Token 已保存；可随时点击「检测 API」验证", "Token saved. Use Test API to verify it at any time."],

    /* ------------------------------------------------------------- Apps */
    "apps.filterFav": ["收藏夹", "Favourites"],
    "apps.filterAll": ["全部", "All"],
    "apps.filterWorkspace": ["工作区", "Workspace"],
    "apps.loadMore": ["加载更多", "Load more"],
    "apps.favEmpty": ["收藏夹是空的。点 App 卡片右侧的星标即可收藏。", "No favourites yet — tap the star on an app card."],
    "apps.wsEmpty": ["你的工作区目前没有共享的 App（API 返回为空）。", "No apps are shared with your workspace yet (the API returned none)."],
    "apps.noneEmpty": ["暂无 App，点刷新从 Krea 拉取。", "No apps yet — refresh to fetch from Krea."],
    "apps.searchEmpty": ["没有匹配的 App。", "No matching apps."],
    "apps.searchPlaceholder": ["搜索 App", "Search apps"],
    "apps.clearSearch": ["清空搜索", "Clear search"],
    "apps.fav": ["加入收藏", "Add to favourites"],
    "apps.unfav": ["取消收藏", "Remove from favourites"],
    "apps.favAdded": ["已加入收藏夹", "Added to favourites"],
    "apps.favRemoved": ["已从收藏夹移除", "Removed from favourites"],
    "apps.total": ["共 {n} 个", "{n} total"],
    "apps.mediaResult": ["这个 App 返回的不是图片，无法置入图层。已在浏览器打开结果。", "This app returned a non-image result, which cannot be placed as a layer. It was opened in your browser."],
    "apps.mediaOpenFailed": ["这个 App 返回的不是图片，也无法自动打开浏览器；请手动复制结果链接。", "This app returned a non-image result and the browser could not be opened. Copy the result link manually."],
    "apps.placeTitle": ["生成完成", "Generation complete"],
    "apps.placeMessage": ["图片已生成。请选择置入方式：", "The image is ready. Choose where to place it:"],
    "apps.placeCurrent": ["置入当前画布", "Place in current canvas"],
    "apps.placeNewDoc": ["置入新画布", "Place in new canvas"],
    "apps.badgeVideo": ["视频 / 音频", "Video / audio"],
    "apps.hiddenMedia": ["已隐藏 {n} 个视频/音频 App", "{n} video/audio apps hidden"],
    "apps.hiddenMediaTip": ["这些 App 会输出视频/音频，或只接受视频/音频输入，Photoshop 无法使用。", "These apps output video/audio, or only accept video/audio input, which Photoshop cannot use."],
    "apps.refreshing": ["正在拉取 App 列表…", "Fetching apps…"],
    "apps.refresh": ["刷新列表", "Refresh"],
    "apps.fetchFailed": ["拉取失败：{msg}", "Fetch failed: {msg}"],
    "apps.scope.public": ["公开", "Public"],
    "apps.scope.user": ["我的", "Mine"],
    "apps.scope.workspace": ["工作区", "Workspace"],
    "apps.author": ["作者 {name}", "by {name}"],
    "apps.version": ["v{version}", "v{version}"],
    "apps.noSchema": ["该 App 没有提供表单结构，将以空参数运行。", "This app exposes no input schema; it will run with empty parameters."],
    "apps.captureHint": ["图片不会自动抓取；请在图片字段中点「使用当前选区」或「选择文件」。", "Images are not captured automatically. Use \"Use selection\" or \"Choose file\" in the image field."],
    "apps.importTitle": ["导入 App", "Import app"],
    "apps.importAction": ["导入", "Import"],
    "apps.importFile": ["导入文件", "Import file"],
    "apps.importHint": ["支持三种方式：① 直接粘贴 App ID 或 Krea 分享链接，插件会自动拉取表单结构；② 粘贴 App 定义 JSON；③ 从文件导入。", "Three ways: (1) paste an app ID or Krea share link and the form schema is fetched automatically; (2) paste an app definition JSON; (3) import from a file."],
    "apps.importPlaceholder": ["App ID / 分享链接 / {\"id\":\"...\",\"name\":\"...\",\"inputs\":[...]}", "App ID / share link / {\"id\":\"...\",\"name\":\"...\",\"inputs\":[...]}"],
    "apps.importNeedText": ["请输入 App ID / 链接 / JSON", "Enter an app ID, link or JSON"],
    "apps.importOk": ["已导入：{name}", "Imported: {name}"],
    "apps.importFetchFailed": ["拉取 App 定义失败：{msg}", "Could not fetch the app definition: {msg}"],
    "apps.importBadJson": ["JSON 解析失败：{msg}", "Invalid JSON: {msg}"],
    "apps.importEmptyFile": ["文件内容为空", "The file is empty"],
    "apps.importRunning": ["正在拉取 App…", "Fetching app…"],

    /* ------------------------------------------------------------- 生成 */
    "gen.prompt": ["提示词:", "Prompt:"],
    "gen.promptPlaceholder": ["描述你想生成/编辑的内容...", "Describe what you want to generate/edit..."],
    "gen.historyTip": ["提示词历史", "Prompt history"],
    "gen.libraryTip": ["提示词库", "Prompt library"],
    "gen.saveToLibTip": ["把当前提示词存入词库", "Save this prompt to the library"],
    "gen.promptEmpty": ["请先输入提示词", "Enter a prompt first"],
    "gen.sampling": ["生成范围:", "Sampling Range:"],
    "gen.output": ["输出选项:", "Output Options:"],
    "gen.capture": ["使用当前选区", "Use selection"],
    "gen.pick": ["选择文件", "Choose file"],
    "gen.refs": ["参考图（可选）:", "Reference images (optional):"],
    "gen.refsWarning": ["警告：参考图过多可能导致请求超时或 Photoshop 崩溃", "Warning: too many reference images may cause timeouts or crash Photoshop"],
    "gen.addRef": ["添加图片", "Add Image"],
    "gen.clearRefs": ["全部清除", "Clear All"],
    "gen.model": ["模型", "Model"],
    "gen.advanced": ["高级参数", "Advanced parameters"],
    "gen.run": ["生成", "Generate"],
    "gen.runApp": ["运行", "Run"],
    "gen.generateTip": ["生成一张新图片", "Generate a new image"],
    "gen.phase.capture": ["正在读取选区…", "Reading selection…"],
    "gen.needSelection": ["请先创建选区。", "Create a selection first."],
    "gen.needDoc": ["请先打开一个 Photoshop 文档", "Open a Photoshop document first"],
    "gen.removeRef": ["移除 {name}", "Remove {name}"],
    "gen.sourceNone": ["尚未捕获输入图，将按纯文生图处理。", "No input captured yet — this will run as text-to-image."],
    "gen.sourceSel": ["已捕获选区 {w}×{h}", "Captured selection {w}×{h}"],
    "gen.sourceFile": ["已使用文件：{name}", "Using file: {name}"],
    "gen.captureFailed": ["捕获失败：{msg}", "Capture failed: {msg}"],
    "gen.captureBlankHint": [
      "选区像素读取失败：请确认选区在可见图层上，或把「生成范围」改为「所有可见图层」后重试。",
      "Could not read pixels from the selection. Make sure it covers visible layer content, or set Sampling range to All visible layers and try again."
    ],
    "gen.captureDebug": ["底层诊断：{reason}", "Diagnostics: {reason}"],
    "gen.refsAdded": ["已添加 {n} 张参考图", "Added {n} reference(s)"],
    "gen.needSource": ["该模型必须提供输入图，请先建立选区", "This model needs an input image — make a selection first"],
    "gen.needRequired": ["请填写必填项：{fields}", "Fill in the required fields: {fields}"],
    "gen.needPrompt": ["请输入提示词", "Enter a prompt"],
    "gen.waiting": ["已等待 {s}s", "{s}s elapsed"],
    "gen.phase.submit": ["正在提交任务…", "Submitting job…"],
    "gen.phase.poll": ["排队 / 生成中…", "Queued / generating…"],
    "gen.phase.download": ["正在下载生成结果…", "Downloading the result…"],
    "gen.phase.place": ["正在置入图层…", "Placing into the document…"],
    "gen.status": ["状态：{status}", "Status: {status}"],
    "gen.cancelled": ["已取消", "Cancelled"],
    "gen.cancelling": ["正在取消…", "Cancelling…"],
    "gen.placed": ["已置入图层：{name}", "Placed layer: {name}"],
    "gen.replaceLocked": ["图层已锁定，结果已保留为新图层。", "The layer is locked — the result was kept as a new layer."],
    "gen.replaceFailed": ["无法替换原图层，结果已保留为新图层。", "Could not replace the original layer — the result was kept as a new layer."],
    "gen.docClosed": ["原文档已关闭，结果已保存到插件数据目录", "The document was closed; the result was saved to the plugin data folder"],
    /* Krea 任务已完成、只是本地下载失败时的统一文案 */
    "download.title": ["图片下载失败", "Image download failed"],
    "download.retry": ["重试下载", "Retry download"],
    "download.open": ["在浏览器打开", "Open in browser"],
    "download.failed": ["生成已完成，但图片下载失败。可重试下载，不会重新扣费。", "The generation finished, but the image download failed. Retrying will not charge you again."],
    "download.failedAgain": ["下载仍然失败：{msg}", "Download still failed: {msg}"],
    "download.opened": ["已在浏览器打开结果链接", "Opened the result link in your browser"],
    "download.kept": ["结果仍保留在 Krea 服务器上；请点「重试下载」，不要重新运行 App。", "The result is still on Krea's servers. Use Retry download instead of running the app again."],
    "gen.feather": ["羽化边缘", "Feather Edges"],
    "gen.featherAmount": ["羽化量（像素）:", "Feather amount (px):"],
    "gen.featherMinus": ["减少 1 像素", "Decrease by 1 px"],
    "gen.featherPlus": ["增加 1 像素", "Increase by 1 px"],
    "gen.featherDone": ["已羽化选区边缘", "Selection edges feathered"],

    /* ------------------------------------------------------------- 错误 */
    "err.noToken": ["请先保存 Krea API Token", "Save your Krea API token first"],
    "err.auth": ["Token 已失效，请重新登录", "The token is no longer valid — sign in again"],
    "err.generic": ["出错了：{msg}", "Something went wrong: {msg}"],
    "err.psApi": ["Photoshop 接口调用失败：{msg}", "Photoshop API call failed: {msg}"],

    /* ------------------------------------------------------------- 历史 */
    "history.title": ["提示词历史", "Prompt history"],
    "history.hint": ["点击一条即可填入当前输入框。", "Tap an entry to reuse it."],
    "history.empty": ["暂无历史记录。", "No history yet."],
    "history.clear": ["清空历史", "Clear history"],
    "history.clearConfirm": ["确定清空历史记录？", "Clear the prompt history?"],
    "history.cleared": ["历史已清空", "History cleared"],
    "history.used": ["已填入提示词", "Prompt filled in"],

    /* ------------------------------------------------------------- 词库 */
    "library.title": ["提示词库", "Prompt library"],
    "library.hint": ["点击一个提示词即可使用。", "Tap a prompt to use it."],
    "library.import": ["导入词库", "Import library"],
    "library.export": ["导出词库", "Export library"],
    "library.new": ["新增提示词", "New prompt"],
    "library.edit": ["编辑提示词", "Edit prompt"],
    "library.name": ["名称", "Name"],
    "library.body": ["提示词内容", "Prompt"],
    "library.category": ["分类", "Category"],
    "library.addCategory": ["新分类名（可选）", "New category (optional)"],
    "library.orNewCategory": ["或新建", "or new"],
    "library.promptName": ["简短的名字", "Short name"],
    "library.use": ["使用", "Use"],
    "library.delete": ["删除", "Delete"],
    "library.editAction": ["编辑", "Edit"],
    "library.nameRequired": ["请填写名称", "Enter a name"],
    "library.bodyRequired": ["请填写提示词内容", "Enter the prompt"],
    "library.saved": ["已保存", "Saved"],
    "library.deleted": ["已删除", "Deleted"],
    "library.deleteConfirm": ["删除这条提示词？", "Delete this prompt?"],
    "library.restore": ["恢复默认", "Restore defaults"],
    "library.restoreConfirm": ["恢复默认词库会覆盖当前自定义内容，确定吗？", "Restoring defaults overwrites your current library. Continue?"],
    "library.restored": ["已恢复默认词库", "Default library restored"],
    "library.exportDone": ["提示词导出完成", "Prompt export complete"],
    "library.exportHint": ["可点击【打开文件夹】定位导出文件。", "Click Open folder to locate the exported file."],
    "library.openFolder": ["打开文件夹", "Open folder"],
    "library.folderOpened": ["已打开导出文件夹", "Export folder opened"],
    "library.openFailed": ["无法打开导出文件夹，请手动前往文件所在位置。", "Could not open the export folder. Open it manually."],
    "library.exportFailed": ["导出失败：{msg}", "Export failed: {msg}"],
    "library.exportEmpty": ["没有可导出的内容", "Nothing to export"],
    "library.imported": ["已导入 {n} 条提示词", "Imported {n} prompts"],
    "library.importEmpty": ["文件里没有可识别的提示词", "No usable prompts in that file"],
    "library.categoryEmpty": ["暂无内容", "Empty"],

    /* ------------------------------------------------------------- 关于 */
    "about.title": ["关于", "About"],
    "about.version": ["当前版本", "Current version"],
    "about.contact": ["联系我们", "Contact us"],
    "about.contactTopic": ["Krea for Ps 插件咨询", "Krea for Ps plugin enquiry"],
    "about.contactMessage": [
      "你好，我在使用 Krea for Ps v{version}，想咨询：",
      "Hi, I'm using Krea for Ps v{version} and would like to ask: "
    ],
    "about.contactOpening": ["正在唤起 Microsoft Teams 对话…", "Opening the Microsoft Teams chat…"],
    "about.contactFailed": [
      "无法唤起 Microsoft Teams，请确认已安装 Teams 客户端。",
      "Could not open Microsoft Teams. Make sure the Teams desktop app is installed."
    ],
    "about.upToDate": ["已是最新版本 v{version}", "You're up to date — v{version}"],
    "about.updateFound": ["发现新版本 v{version}，可在「设置 → 插件更新」中下载", "Version v{version} is available in Settings → Plugin updates"],
    "about.updateTitle": ["发现新版本", "Update available"],
    "about.updateBody": [
      "当前版本 v{current}，最新版本 v{latest}。{notes}\n\n下载后请完全退出 Photoshop，再双击 .ccx 覆盖安装。",
      "You have v{current}; the latest is v{latest}.{notes}\n\nAfter downloading, quit Photoshop completely, then double-click the .ccx to install."
    ],
    "about.updateNotes": ["\n\n更新内容：\n{notes}", "\n\nWhat's new:\n{notes}"],
    "about.updateDownload": ["下载更新", "Download update"],
    "about.updateLater": ["稍后", "Later"],
    "about.updateNoManifest": ["暂无更新信息：仓库里还没有 update.json", "No update information yet — update.json has not been published"],
    "about.updateBadManifest": ["更新信息格式错误，请检查 update.json", "Invalid update information — check update.json"],
    "about.updateTimeout": ["检测更新超时，请稍后重试", "Update check timed out; try again later"],
    "about.updateFailed": ["检测更新失败：{msg}", "Update check failed: {msg}"],
    "about.models": ["内置模型 {models} 个 · 模型注册表 {date}", "{models} built-in models · registry {date}"],
    "about.iconPack": ["图标：已加载 {n}/{total} 个 PNG", "Icons: {n}/{total} PNGs loaded"],
    "about.intro": ["插件简介", "Plugin overview"],
    "about.introBody": [
      "Krea for PS 是直连 Krea Open API 的原生 Photoshop 面板插件。支持选区驱动式 AI 图像生成与编辑，内置 44 款云端模型（Krea 2/3、Nano Banana、GPT-Image、Flux、Seedream 等），生成内容自动适配选区并以独立图层置入文档；搭载 Node App 工作流、提示词词库与边缘羽化功能，兼容 Photoshop 2021+。",
      "Krea for PS is a native Photoshop panel plugin that connects directly to the Krea Open API. It supports selection-driven AI image generation and editing with 44 cloud models (Krea 2/3, Nano Banana, GPT-Image, Flux, Seedream, etc.). Outputs auto-fit the selection and are imported as separate layers. It features Node App workflow integration, prompt library and edge feathering, compatible with Photoshop 2021+."
    ],
    "about.function": ["功能介绍", "Features"],
    "about.quickStart": ["快速开始", "Quick Start"],
    "about.why": [
      "为什么做这个插件?\n• 官方 Krea 面板把整个网页塞进 Photoshop：启动慢、依赖浏览器登录态，并要求 Photoshop 2024 以上。\n• 纯本地界面：面板打开即用，不加载任何网页。\n• 粘贴一次 API Token 即可使用，不依赖 OAuth 登录会话。\n• 支持 Photoshop 2021+（22.5）。\n• 直连 Krea 开放 API，模型注册表可一键更新。",
      "Why this plugin exists?\n• The official Krea panel embeds the entire web app in Photoshop: slow startup, browser-session dependency, and Photoshop 2024+.\n• A fully local UI: opens instantly and loads no web pages.\n• Paste an API Token once — no OAuth session required.\n• Supports Photoshop 2021+ (22.5).\n• Connects directly to Krea's open API; the model registry can be refreshed in one click."
    ],
    "about.fn.inputTitle": ["选区与输入", "Selection & input"],
    "about.fn.inputBody": [
      "• 点击「生成」时实时读取当前选区，并把选区内容作为输入图。\n• 没有选区时会提示先创建选区，与原版行为一致。\n• 可为支持参考图的模型添加多张参考图；过大的图片会自动缩放到 1024px 后再发送。\n• 图生图固定使用 0.5 的编辑强度，兼顾保留原图与重绘效果。",
      "• Reads the current selection when you click Generate and uses it as the input image.\n• No selection shows the original \"make a selection first\" error.\n• Add multiple references for models that support them; large images are scaled to 1024px before upload.\n• Image-to-image uses a fixed 0.5 strength for a balance of preservation and repainting."
    ],
    "about.fn.modelsTitle": ["模型", "Models"],
    "about.fn.modelsBody": [
      "• 内置 44 个模型，按厂商分组：Krea 2 Medium / Large / Turbo、Krea 3；Google Nano Banana 系列；OpenAI GPT-Image 系列；Flux 1.1 / Kontext；Seedream / Seededit；Ideogram、Topaz、Magnific 等。\n• 覆盖文生图、图生图、局部重绘、放大 / 增强等场景。\n• 「对话」页聚焦 Krea 自研与 Google Nano Banana 模型，自动按当前选区比例生成，适合连续出图和改图。\n• 模型参数由 Krea 智能填充，无需逐个设置 seed、步数等高级参数。",
      "• 44 built-in models grouped by vendor: Krea 2 Medium / Large / Turbo, Krea 3; Google Nano Banana; OpenAI GPT-Image; Flux 1.1 / Kontext; Seedream / Seededit; Ideogram, Topaz, Magnific and more.\n• Covers text-to-image, image-to-image, inpainting, upscale / enhance and more.\n• The Chat tab focuses on Krea and Google Nano Banana models and follows the current selection ratio for fast iterative generation and editing.\n• Model parameters are filled in by Krea, so you do not need to tune seed, steps and other advanced fields."
    ],
    "about.fn.outputTitle": ["输出与落位", "Output & placement"],
    "about.fn.outputBody": [
      "• 生成页两种输出方式：插入为新图层 / 替换原图层；对话与 App 结果还可置入新画布。\n• 结果自动缩放到选区大小并精确落位；替换模式只覆盖选区，选区外像素保留。\n• 生成后可对选区边缘执行羽化，羽化量可调。",
      "• The Generate page has two output modes: insert as a new layer / replace the original layer; Chat and App results can also be placed on a new canvas.\n• Results are scaled to the selection and placed precisely; replace mode only covers the selection and keeps pixels outside it.\n• Feather the selection edge after generation with an adjustable amount."
    ],
    "about.fn.promptTitle": ["提示词与参考图", "Prompts & references"],
    "about.fn.promptBody": [
      "• 提示词历史自动记录，方便回看和复用。\n• 提示词库支持分类、导入 / 导出与恢复默认。\n• 参考图支持多选，并按模型定义自动映射到对应字段。",
      "• Prompt history is recorded automatically for quick reuse.\n• The prompt library supports categories, import / export and restoring defaults.\n• Add multiple reference images; they are mapped to model fields automatically."
    ],
    "about.fn.appsTitle": ["Apps 工作流", "Apps workflows"],
    "about.fn.appsBody": [
      "• 直接运行 Krea Node Apps：浏览工作区 / 公开 App，搜索、收藏、置顶。\n• 按 App 的输入 Schema 自动生成表单，支持文本、数字、滑杆、下拉、图片与多图。\n• 可通过 App ID、分享链接、JSON 或文件导入 App；视频结果自动在浏览器打开。",
      "• Run Krea Node Apps directly: browse workspace / public apps, search, favourite and pin.\n• Forms are generated from each app's input schema, including text, number, slider, select, image and multi-image fields.\n• Import apps by ID, share link, JSON or file; video results open in your browser."
    ],
    "about.quickStartIntro": ["首次使用按下面 5 步完成；之后打开面板即可直接生成。", "Follow these 5 steps for first-time setup; after that the panel is ready to generate."],
    "about.step1Title": ["获取 API Token", "Get an API Token"],
    "about.step1Body": ["在 Krea 官网的 API Tokens 页面创建 Token 并复制；也可以直接在「连接 Krea API」页点击「获取 Token」。", "Create and copy a token on the Krea API Tokens page, or use Get a token on the Connect to Krea screen."],
    "about.step2Title": ["连接面板", "Connect the panel"],
    "about.step2Body": ["在 Photoshop 打开 Krea for Ps，粘贴 Token 后保存；状态显示「已连接」即完成。", "Open Krea for Ps in Photoshop, paste the token and save; the connected status confirms setup."],
    "about.step3Title": ["准备输入", "Prepare the input"],
    "about.step3Body": ["画好选区后直接点「生成」；没有选区时会提示先创建选区。需要参考图时可继续添加。", "Make a selection and click Generate; if there is no selection, the panel asks you to create one first. Add references when needed."],
    "about.step4Title": ["选择模型与提示词", "Choose a model and prompt"],
    "about.step4Body": ["在模型选择器里按厂商挑选模型；输入提示词。图生图固定使用 0.5 的编辑强度，无需额外设置。", "Pick a model by vendor and write a prompt. Image-to-image uses a fixed 0.5 edit strength; no extra setup is needed."],
    "about.step5Title": ["生成与微调", "Generate and refine"],
    "about.step5Body": ["选择输出方式（插入为新图层 / 替换原图层），点击「生成」。结果会自动落位；可用「羽化边缘」、提示词历史与词库继续调整。对话和 App 结果还可置入新画布。", "Choose the output mode (new layer / replace original layer) and click Generate. The result is placed automatically; refine it with Feather edges, prompt history and the library. Chat and App results can also be placed on a new canvas."],
    "about.quickStartTip": ["小贴士：首次使用前请确认 Token 有效；生成失败时先检查网络与 Token。大图或高分辨率模型可能需要更长时间，可在进度浮层中取消。", "Tip: make sure the token is valid before the first run. If generation fails, check the network and token first. Large images or high-resolution models may take longer; you can cancel from the progress overlay."],
    "about.fn.securityTitle": ["安全与设置", "Security & settings"],
    "about.fn.securityBody": [
      "• API Token 仅发送到 api.krea.ai。为了 PS 重启后不用重复输入，Token 会保存在本机 UXP 数据目录的 token.json（仅当前系统用户可读），并尽量另存到系统钥匙串 / 加密备份。\n• 支持检测 Token、更换 Token、打开资产历史、清空 App 缓存和重置数据。\n• 界面支持中文 / English 一键切换，设置会自动保存。",
      "• The API token is only sent to api.krea.ai. So you never have to re-enter it after a Photoshop restart, it is kept in token.json inside the local UXP data folder (readable only by your OS user), with an additional keychain / encrypted backup when available.\n• Test or replace the token, open your asset history, clear the app cache and reset data.\n• Switch between Chinese / English in one click; settings are saved automatically."
    ],

    /* ------------------------------------------------------------- 设置 */
    "settings.title": ["设置", "Settings"],
    "settings.account": ["账户", "Account"],
    "settings.changeToken": ["更换 Token", "Change token"],
    "settings.signOut": ["退出登录", "Sign out"],
    "settings.outNewLayer": ["插入为新图层", "Insert as new layer"],
    "settings.outReplace": ["替换原图层", "Replace original layer"],
    "settings.samplingVisible": ["采样所有可见图层", "Sample all visible layers"],
    "settings.samplingSelected": ["仅选中图层", "Selected layer only"],
    "settings.data": ["数据与维护", "Data & maintenance"],
    "settings.openAssets": ["打开资产历史", "Open asset history"],
    "settings.clearCache": ["清空 App 缓存", "Clear app cache"],
    "settings.dataHint": [
      "清空 App 缓存只删除本地的 App 列表；重置全部数据还会退出登录并清除历史、自定义词库、偏好和内存中的缩略图缓存。",
      "Clear app cache only removes the local app list. Reset all data also signs out and clears history, your custom library, preferences and the in-memory thumbnail cache."
    ],
    "settings.reset": ["重置全部数据", "Reset all data"],
    "settings.tokenOk": ["已配置", "Configured"],
    "settings.tokenMissing": ["未配置", "Not set"],
    "settings.signedOut": ["已退出，Token 已从本机移除", "Signed out; the token was removed from this machine"],
    "settings.resetConfirm": ["将清除 Token、App 缓存、历史、自定义词库和缩略图缓存。确定吗？", "This clears the token, app cache, history, your custom library and the thumbnail cache. Continue?"],
    "settings.resetDone": ["已重置全部数据", "All data cleared"],
    "settings.cacheCleared": ["App 缓存已清空", "App cache cleared"],
    "settings.update": ["插件更新", "Plugin updates"],
    "settings.checkUpdate": ["检测更新", "Check for updates"],
    "settings.checkingUpdate": ["正在检测更新…", "Checking for updates…"],

    /* ------------------------------------------------------------- 字段名 */
    "field.prompt": ["提示词", "Prompt"],
    "field.negative_prompt": ["反向提示词", "Negative prompt"],
    "field.seed": ["随机种子", "Seed"],
    "field.width": ["宽度", "Width"],
    "field.height": ["高度", "Height"],
    "field.aspect_ratio": ["画面比例", "Aspect ratio"],
    "field.resolution": ["分辨率", "Resolution"],
    "field.quality": ["质量", "Quality"],
    "field.creativity": ["创意度", "Creativity"],
    "field.intensity": ["强度", "Intensity"],
    "field.complexity": ["复杂度", "Complexity"],
    "field.movement": ["动感", "Movement"],
    "field.strength": ["参考强度", "Reference strength"],
    "field.guidance_scale": ["引导强度", "Guidance scale"],
    "field.steps": ["采样步数", "Steps"],
    "field.num_inference_steps": ["采样步数", "Steps"],
    "field.cfg_scale": ["提示词相关度", "CFG scale"],
    "field.denoising_strength": ["重绘幅度", "Denoising strength"],
    "field.thinking_mode": ["思考模式", "Thinking mode"],
    "field.thinking_level": ["思考深度", "Thinking level"],
    "field.regional_edit": ["区域编辑", "Regional edit"],
    "field.background": ["背景", "Background"],
    "field.image_url": ["输入图", "Input image"],
    "field.image_urls": ["输入图 / 参考图", "Input / reference images"],
    "field.input_image": ["输入图", "Input image"],
    "field.mask_url": ["蒙版", "Mask"],
    "field.scene_image_url": ["场景图", "Scene image"],
    "field.style_images": ["风格参考图", "Style images"],
    "field.image_style_references": ["风格参考图", "Style references"],
    "field.reference_images": ["参考图", "Reference images"],
    "field.character_reference_images": ["角色参考图", "Character references"],
    "field.styles": ["风格 ID", "Style IDs"],
    "field.moodboards": ["情绪板 ID", "Moodboard IDs"],
    "field.image_scaling_factor": ["放大倍数", "Scale factor"],
    "field.ai_strength": ["AI 强度", "AI strength"],
    "field.clarity_strength": ["清晰度", "Clarity"],
    "field.resemblance_strength": ["相似度", "Resemblance"],
    "field.sharpness": ["锐化", "Sharpness"],
    "field.rescale_color": ["重新校正颜色", "Rescale color"],
    "field.upscaling_activated": ["启用放大", "Enable upscaling"],
    "field.skip_prompt_expansion": ["跳过提示词扩写", "Skip prompt expansion"],
    "field.preserve_source_size": ["保持原图尺寸", "Preserve source size"],
    "field.web_search": ["联网搜索", "Web search"],
    "field.output_format": ["输出格式", "Output format"],
    "field.model": ["模型", "Model"],
    "field.mode": ["模式", "Mode"],
    "field.style": ["风格", "Style"],
    "field.subject_detection": ["主体检测", "Subject detection"],
    "field.face_enhancement": ["面部增强", "Face enhancement"],
    "field.face_enhancement_creativity": ["面部创意度", "Face creativity"],
    "field.face_enhancement_strength": ["面部强度", "Face strength"],
    "field.crop_to_fill": ["裁剪填充", "Crop to fill"],
    "field.optimized_for": ["优化场景", "Optimized for"],
    "field.enhancement_strength": ["增强强度", "Enhancement strength"],
    "field.hdr": ["HDR", "HDR"],
    "field.resemblance": ["相似度", "Resemblance"],
    "field.fractality": ["分形度", "Fractality"],
    "field.engine": ["引擎", "Engine"],
    "field.ultra_detail": ["超细节", "Ultra detail"],
    "field.smart_grain": ["智能颗粒", "Smart grain"],
    "field.flavor": ["风格倾向", "Flavor"],
    "field.autoprompt": ["自动提示词", "Autoprompt"],
    "field.face_preservation": ["保持面部", "Face preservation"],
    "field.color_preservation": ["保持颜色", "Color preservation"],
    "field.grain": ["颗粒", "Grain"],
    "field.grain_model": ["颗粒类型", "Grain model"],
    "field.grain_density": ["颗粒密度", "Grain density"],
    "field.grain_strength": ["颗粒强度", "Grain strength"],
    "field.grain_size": ["颗粒大小", "Grain size"],
    "field.reference_uri": ["参考图 URI", "Reference URI"],
    "field.fix_compression": ["修复压缩", "Fix compression"],
    "field.denoise": ["降噪", "Denoise"],
    "field.detail": ["细节", "Detail"],
    "field.texture": ["质感", "Texture"],
    "field.sharpen": ["锐化", "Sharpen"],
    "field.realism": ["真实感", "Realism"],
    "field.sharp": ["锐度", "Sharp"],
    "field.noise_scale": ["噪点比例", "Noise scale"],
    "field.video_url": ["视频 URL", "Video URL"],
    "field.audio_url": ["音频 URL", "Audio URL"],
    "field.videoHint": ["填可公开访问的视频链接（本地上传请在 Krea 网页完成）", "Publicly reachable video URL (upload locally via the Krea web app)"],
    "field.audioHint": ["填可公开访问的音频链接", "Publicly reachable audio URL"],
    "field.listHint": ["每行一个", "One per line"],
    "field.styleIdsHint": ["每行一个 ID", "One ID per line"],
    "field.jsonInvalid": ["JSON 格式错误", "Invalid JSON"],
    "field.raw": ["原始模式", "Raw mode"],
    "field.scene_transfer": ["场景迁移", "Scene transfer"],
    "field.scene_prompt": ["场景提示词", "Scene prompt"],
    "field.scene_strength": ["场景强度", "Scene strength"],
    "field.switch_background": ["替换背景", "Switch background"],
    "field.enhancement_video_type": ["视频类型", "Video type"]
  };

  /* ---------------------------------------------------------------------------
   * 模型显示名 / 一句话说明的中文词典。
   *
   * models.js 由 _work/extract-api.cjs 从 Krea 的 OpenAPI 生成，只有英文
   * summary / desc，而且 44 个模型里 29 个的 label.zh 其实就是英文名
   * （品牌名无法直译）。所以「生成」页的模型下拉框原来只能显示英文。
   *
   * 这里的 id 必须与 models.js 的 models 键完全一致（verify.cjs 会逐个核对）。
   * 英文模式仍然用 models.js 的 label.en / summary，不受影响。
   * ------------------------------------------------------------------------- */
  var MODEL_ZH = {
    "krea/krea-2/medium": { name: "Krea 2 Medium（偏快）", desc: "适合表现力强的插画，速度与画质平衡。" },
    "krea/krea-2/large": { name: "Krea 2 Large（高画质）", desc: "写实质感最好的 Krea 2 版本。" },
    "krea/krea-2/medium-turbo": { name: "Krea 2 Turbo（最快）", desc: "Krea 2 中画质里速度最快的版本。" },
    "krea/krea-3": { name: "Krea 3（编辑，8 秒级）", desc: "用 Krea 3 生成或编辑图像，单张约 8 秒。" },
    "ideogram/ideogram-4.5": { name: "Ideogram 4.5（排版强）", desc: "支持提示词与最多 5 张参考图的生成/编辑，排版和文字表现好。" },
    "bfl/flux-1-dev": { name: "Flux 1 Dev（LoRA 友好）", desc: "速度快，最适合搭配 LoRA 使用。" },
    "bfl/flux-1-kontext-dev": { name: "Flux Kontext Dev（编辑）", desc: "专为图像编辑设计的前沿模型，针对 Krea 优化。" },
    "google/nano-banana-pro": { name: "Nano Banana Pro（旗舰）", desc: "谷歌最智能的图像模型。" },
    "google/nano-banana-2": { name: "Nano Banana 2（均衡）", desc: "Nano Banana 2 是画质不错、价格更低的版本。" },
    "google/nano-banana-2.1": { name: "Nano Banana 2.1（最新）", desc: "谷歌最新图像模型，Flash 速度下达到 Pro 级画质。" },
    "google/nano-banana-flash-lite": { name: "Nano Banana 2 Lite（快速）", desc: "谷歌的快速图像模型。" },
    "google/nano-banana": { name: "Nano Banana（原版）", desc: "通用性最强的智能模型。" },
    "bfl/flux-1.1-pro": { name: "Flux 1.1 Pro（进阶）", desc: "BFL 出品，先进且高效。" },
    "bfl/flux-1.1-pro-ultra": { name: "Flux 1.1 Pro Ultra（最高画质）", desc: "BFL 画质最高的文生图模型。" },
    "ideogram/ideogram-2-turbo": { name: "Ideogram 2.0A Turbo（加速）", desc: "Ideogram 2.0 的蒸馏加速版。" },
    "ideogram/ideogram-3": { name: "Ideogram 3.0（通用）", desc: "审美出色、通用性强。" },
    "runway/gen-4-image": { name: "Runway Gen-4 Image（电影感）", desc: "支持参考图的电影感图像模型。" },
    "openai/gpt-image": { name: "ChatGPT Image（初代）", desc: "ChatGPT 最初的图像模型。" },
    "openai/gpt-image-2": { name: "ChatGPT 2（编辑）", desc: "智能、强大的图像编辑模型。" },
    "openai/gpt-image-2.5-flare": { name: "GPT Image 2.5 Flare（透明背景）", desc: "支持透明背景的 GPT Image 2.5。" },
    "openai/gpt-image-2.5-sunburst": { name: "GPT Image 2.5 Sunburst（最快）", desc: "为速度优化的 GPT Image 2.5。" },
    "xai/grok-imagine-2": { name: "Grok Imagine 2（2K 输出）", desc: "xAI 图像模型，可选画质，支持 2K 输出。" },
    "xai/grok-imagine-2-edit": { name: "Grok Imagine 2（编辑）", desc: "xAI 图像编辑模型，支持自然语言指令。" },
    "meta/muse-image": { name: "Meta Muse Image（智能体）", desc: "Meta 的智能体图像模型：会推理提示词、联网找参考，并在返回前自检。" },
    "alibaba/qwen-image-3": { name: "Qwen Image 3（通义千问）", desc: "擅长密集排版与小字清晰的文字。" },
    "alibaba/qwen-image-2.1": { name: "Qwen Image 2.1（通义千问）", desc: "透明素材，以及能保持人物一致性的编辑。" },
    "luma/uni-1": { name: "Luma UNI-1（推理）", desc: "带推理能力的文生图模型，更忠于提示词。" },
    "recraft/recraft-v4.1-flash": { name: "Recraft V4.1 Flash（快速）", desc: "Recraft 的快速档，适合插画、矢量与摄影。" },
    "bytedance/seedream-4": { name: "Seedream 4（即梦）", desc: "高画质写实与文字渲染。" },
    "bytedance/seedream-5-lite": { name: "Seedream 5 Lite（即梦）", desc: "中等画质，支持推理与联网搜索。" },
    "bytedance/seedream-5-pro": { name: "Seedream 5 Pro（即梦）", desc: "最高画质，精确的编辑控制。" },
    "qwen/2512": { name: "Qwen 2512（通义千问）", desc: "价格实惠的中等画质模型。" },
    "z-image/z-image": { name: "Z-Image（便宜快速）", desc: "速度最快，写实但多样性较低。" },
    "ideogram/ideogram-4.5-precise": { name: "Ideogram 4.5 Precise（带蒙版）", desc: "在保持分辨率与周边细节的前提下精确编辑，支持蒙版与参考图。" },
    "bytedance/seededit": { name: "SeedEdit（局部编辑）", desc: "为图像编辑设计的前沿模型。" },
    "krea/enhance": { name: "Krea Enhance（放大）", desc: "便宜好用的创意放大，能补充新细节，最高 8K。" },
    "krea/legacy-enhance": { name: "Krea Enhance Legacy（旧版）", desc: "Krea 旧版生成式放大，最高 4K。" },
    "topaz/generative-enhance": { name: "Topaz 生成式放大", desc: "最强的创意放大，最高 16K。" },
    "topaz/standard-enhance": { name: "Topaz Standard（标准放大）", desc: "忠实还原的强力放大，最高 22K，适合照片。" },
    "topaz/bloom-enhance": { name: "Topaz Bloom（创意放大）", desc: "能补充新细节的创意放大，最高 10K。" },
    "topaz/bloom-2-enhance": { name: "Topaz Bloom 2（AI 图放大）", desc: "面向 AI 生成图的创意放大，最高 10K。" },
    "topaz/wonder-35-enhance": { name: "Topaz Wonder 3.5（保真放大）", desc: "细节保真的生成式放大，最高 16K。" },
    "magnific/creative-enhance": { name: "Magnific Creative（创意放大）", desc: "最好的创意放大，最高 10K。" },
    "magnific/precise-enhance": { name: "Magnific Precise（忠实放大）", desc: "Magnific 更忠实原图的版本，最高 10K。" }
  };

  function detectLang() {
    var saved = null;
    try { saved = localStorage.getItem(LS_KEY) || localStorage.getItem(LS_KEY_LEGACY); } catch (e) { saved = null; }
    if (saved === "zh" || saved === "en") return saved;
    var locale = "";
    try { locale = require("uxp").host.uiLocale || ""; } catch (e) { locale = ""; }
    if (!locale) {
      try { locale = (typeof navigator !== "undefined" && navigator.language) || ""; } catch (e) { locale = ""; }
    }
    return /^zh/i.test(locale) ? "zh" : "en";
  }

  var lang = detectLang();
  var listeners = [];

  function t(key, vars) {
    var entry = DICT[key];
    var text = entry ? (lang === "zh" ? entry[0] : entry[1]) : null;
    if (text === null || typeof text === "undefined") text = key;
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, function (m, name) {
        return (vars[name] === null || typeof vars[name] === "undefined") ? m : String(vars[name]);
      });
    }
    return text;
  }

  /* 表单字段名：优先词典，其次 models.js 生成的 label，最后原字段名 */
  function fieldLabel(name, generated) {
    var key = "field." + name;
    if (DICT[key]) return lang === "zh" ? DICT[key][0] : DICT[key][1];
    if (generated && typeof generated === "object") return generated[lang] || generated.en || name;
    if (typeof generated === "string" && generated) return generated;
    return name;
  }

  /* 模型显示名：中文优先用 MODEL_ZH，其次 models.js 的 label.zh / label.en */
  function modelLabel(id, model) {
    var tr = MODEL_ZH[id];
    var label = (model && model.label) || {};
    if (lang === "zh") return (tr && tr.name) || label.zh || label.en || id;
    return label.en || label.zh || id;
  }

  /* 模型一句话说明：中文用词典；英文沿用 models.js 的 summary */
  function modelDesc(id, model) {
    var tr = MODEL_ZH[id];
    if (lang === "zh" && tr && tr.desc) return tr.desc;
    if (!model) return "";
    return model.summary || model.desc || "";
  }

  /**
   * 翻译静态 DOM。
   * 注意：UXP 对属性选择器（querySelectorAll("[x]")）与 TreeWalker 的支持并不保证，
   * 因此这里自己递归遍历 childNodes，只依赖最基础的 DOM 属性。
   */
  function applyDom(root) {
    var host = root;
    if (!host && typeof document !== "undefined") host = document.body || document.documentElement;
    if (!host) return;
    // 传进来的可能是 document（nodeType 9），统一降到可遍历的元素节点
    if (host.nodeType === 9) host = host.body || host.documentElement;
    if (!host) return;

    function hasElementChild(node) {
      var kids = node.childNodes;
      for (var i = 0; kids && i < kids.length; i++) if (kids[i].nodeType === 1) return true;
      return false;
    }

    function visit(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.getAttribute) {
        var key = node.getAttribute("data-i18n");
        // 只在「纯文本」元素上替换 textContent，避免破坏按钮内的 SVG 图标
        if (key && !hasElementChild(node)) {
          var text = t(key);
          if (node.textContent !== text) node.textContent = text;
        }
        var tkey = node.getAttribute("data-i18n-title");
        if (tkey) node.setAttribute("title", t(tkey));
        var pkey = node.getAttribute("data-i18n-placeholder");
        if (pkey) node.setAttribute("placeholder", t(pkey));
      }
      var kids = node.childNodes;
      for (var i = 0; kids && i < kids.length; i++) visit(kids[i]);
    }

    visit(host);
  }

  function current() { return lang; }

  function setLang(next) {
    if (next !== "zh" && next !== "en") return lang;
    lang = next;
    try { localStorage.setItem(LS_KEY, lang); } catch (e) { /* ignore */ }
    applyDom(document);
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](lang); } catch (e) { /* ignore */ }
    }
    return lang;
  }

  function toggle() { return setLang(lang === "zh" ? "en" : "zh"); }

  function onChange(fn) { listeners.push(fn); }

  return {
    t: t,
    lang: current,
    setLang: setLang,
    toggle: toggle,
    applyDom: applyDom,
    fieldLabel: fieldLabel,
    modelLabel: modelLabel,
    modelDesc: modelDesc,
    onChange: onChange,
    DICT: DICT,
    MODEL_ZH: MODEL_ZH
  };
})();
