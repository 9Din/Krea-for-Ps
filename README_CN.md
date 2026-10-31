# Krea for Ps

![Version](https://img.shields.io/badge/version-2.4.2-blue)
![Photoshop](https://img.shields.io/badge/Photoshop-22.5%2B-31A8FF)
![UXP](https://img.shields.io/badge/UXP-Manifest%205-lightgrey)

Krea for Ps 是直连 Krea Open API 的原生 Photoshop 面板插件（UXP）。支持选区驱动式 AI 图像生成与编辑，内置 44 款云端模型，生成内容自动适配选区并以独立图层置入文档；搭载 Node App 工作流、Krea Agent 对话、提示词词库与边缘羽化功能。

- **技术形态**：纯前端 SPA，直接调用 `api.krea.ai` 开放 API，使用你自己的 Krea API Token（非网页订阅登录）
- **兼容性**：Photoshop 22.5+（2021+），面板停靠/浮动均可
- **语言**：中英双语，跟随 Photoshop 界面语言，可手动切换

---

## 特性

### 生成页（Generate）
- **选区驱动**：点击「生成」实时读取当前选区作为输入图；无选区时提示先创建选区
- **44 款云端模型**：按厂商分组，覆盖文生图、图生图、局部重绘、放大 / 增强等场景（详见[模型](#模型)）
- **参考图**：支持多张参考图，超过 8MB 拒绝，大图自动缩放到最长边 1024px 后发送
- **图生图**：固定使用 0.5 编辑强度，兼顾保留原图与重绘效果
- **放大 / 增强模型**：自动发送 `image_scaling_factor`（默认 ≥2 倍）与 `upscaling_activated`，让「放大」模型真正放大
- **输出方式**：插入为新图层 / 替换原图层（替换失败时结果保留为新图层并明确提示）；App 结果还可置入新画布
- **羽化边缘**：基于选区或已有蒙版生成羽化蒙版，对齐原版面板行为
- **进度与取消**：任务轮询上限 30 分钟（超时提示可到资产页查看，避免重复提交扣费）；提交阶段与等待阶段均可取消

### 对话页（Chat · Krea Agent）
- 与 Krea Agent 多轮对话：分析图片、写提示词、继续追问
- 附件：可附加当前选区或上传图片，自动上传到 Krea Assets 供 Agent 读取
- 模型：默认「自动选择」，可固定指定 LLM；套餐不含时自动回退并提示
- 操作：回复可一键复制，或直接「填入生成页」提示词框
- 等待期间可取消，取消后保留会话可继续追问

### Apps
- 浏览 Krea 精选 App 与你的工作区 App，按 OpenAPI schema 自动生成表单并运行
- 精选列表从 GitHub 仓库 `featured-apps.json` 同步（启动缓存 + 手动刷新），无需发布新版本即可更新 App 目录
- 打开 App 时按 ID 拉取最新 schema 与 `node_app_version_id`，目录版本仅作兼容回退
- 搜索防抖、收藏夹 / 工作区筛选、分页加载；视频 / 音频类 App 自动隐藏（PS 无法置入）

### 资产与历史（Assets）
- 生成历史缩略图：下载、置入图层、删除、重试
- 结果 URL 过期自动刷新后置入

### 提示词词库与历史（Library / History）
- 分类词库：新增 / 编辑 / 删除、搜索、从 JSON 文件导入、一键恢复默认
- 提示词历史：自动记录、一键回填

### 设置（Settings）
- 账号：Token 状态检测、更换、退出登录
- 数据与维护：打开资产历史、清空 App 缓存、重置全部数据
- 隐藏与显示：隐藏「全部」/「收藏夹」筛选、隐藏「资产」页签（升级迁移兼容旧开关）
- 插件更新：手动检测更新
- 语言：一键切换中 / 英

### 可靠性设计
- **多文档安全**：生成期间切换文档不会错置结果——抓图按快照文档收敛边界，置入前强制激活目标文档，原文档已关闭时明确报错
- **下载失败恢复**：恢复确认栏不再阻塞任务状态，恢复成功仍置入到原任务的文档与选区
- **写盘失败回滚**：词库 / 历史 / 重置等写盘失败自动回滚内存状态并提示
- **请求序号防过期**：切换 Tab / 快速连点时的过期响应自动丢弃，不会污染列表
- **主题自适应**：深浅色主题检测 + 图标自动切换

---

## 快速开始

### 安装
1. 从 [Releases](https://github.com/9Din/Krea-for-Ps/releases) 下载最新 `Krea-for-Ps-<version>.ccx`
2. 完全退出 Photoshop
3. 双击 `.ccx` 文件，Creative Cloud 提示「未验证」时选择 **本地安装**（Install locally）

### 首次使用（5 步）
1. **获取 API Token**：在 [krea.ai/settings/api-tokens](https://krea.ai/settings/api-tokens) 创建并复制 Token（面板内也可跳转获取）
2. **连接面板**：在 Photoshop 打开 Krea for Ps → 粘贴 Token → 保存，状态显示「已连接」
3. **准备输入**：画好选区后点「生成」；需要参考图可继续添加
4. **选择模型与提示词**：按厂商挑选模型，输入提示词（图生图固定 0.5 强度，无需设置）
5. **生成与微调**：选择输出方式（新图层 / 替换），点「生成」；可用羽化边缘、提示词历史与词库继续调整

> Token 仅保存在本机（见[数据与隐私](#数据与隐私)）；生成计费归属你账户下的 Krea API 额度。

---

## 模型

内置 **44 个模型**（图像 35 + 放大 / 增强 9），按厂商分组（数据源：Krea 官方 OpenAPI，2026-10-16 生成）：

| 分组 | 模型 |
|---|---|
| 放大 / 增强 | Krea Enhance（含 Legacy）、Topaz（Generative / Standard / Bloom / Bloom 2 / Wonder 3.5）、Magnific（Creative / Precise） |
| Krea 自研 | Krea 2 Medium / Large / Medium-Turbo、Krea 3 |
| Google | Nano Banana Pro / 2 / 2.1 / Flash-Lite / Nano Banana |
| OpenAI | GPT-Image、GPT-Image 2、GPT-Image 2.5 Flare / Sunburst |
| Ideogram | — |
| Black Forest Labs | Flux 1.1 / Kontext 等 |
| ByteDance | Seedream / Seededit 等 |
| xAI | — |
| Meta | Muse Image 等 |
| Alibaba | 通义系列 |
| Luma | — |
| Recraft | — |
| Qwen | — |
| Z-Image | — |
| Runway | — |

> 模型参数由插件按 OpenAPI schema 自动填充，无需手动设置 seed、步数等高级参数。

---

## 界面总览

顶部导航：**Apps · 生成 · 对话 · 资产**（资产页签可在设置中隐藏），右上角为语言切换与设置。

| 页面 | 用途 |
|---|---|
| Apps | 精选 / 工作区 App 浏览与运行（表单由 schema 自动生成） |
| 生成 | 选区驱动的图像生成 / 编辑主流程 |
| 对话 | Krea Agent 多轮对话（附件支持选区 / 上传图） |
| 资产 | 生成历史：下载、置入、删除、重试 |
| 设置 | Token、数据维护、隐藏开关、更新检查、语言 |

---

## 错误指南

### 对话页（Krea Agent）

| 状态码 / 代码 | 触发场景 | 界面提示 | 建议处理 |
|---|---|---|---|
| **402** | Agent 计算额度不足，或免费额度已用完 | 「Agent 计算额度不足，或免费额度已用完。」 | 在 Krea 官网查看 / 购买 Agent 额度后重试 |
| **403** | 当前套餐不包含所选的 Agent 模型 | 「当前套餐不包含这个模型，请改选『自动』或其它模型。」 | 插件会自动切回「自动选择」（并清空上次选的模型），此后模型列表只显示套餐允许的模型；直接重新发送即可 |
| **404** | Agent 找不到附件图片 | 「Agent 找不到附件图片，请重新上传。」 | 重新上传图片或重新选择选区后再发送 |
| **409** | 上一轮仍在处理中 | 「上一轮还在处理中，请等它完成后再发送。」 | 等待上一轮结束后再发消息 |
| **422** | 请求参数无效 | 「Agent 请求参数无效：{msg}」 | 按提示检查输入与附件后重试 |
| `cancelled` | 用户主动取消 | 「已停止等待。任务仍可能在 Krea 后台继续，稍后可以再问一次。」 | 会话保留，可稍后继续追问 |
| `agent_timeout` | 单轮等待超过约 10 分钟 | 「等待超时。任务可能仍在 Krea 后台运行，稍后可以再试。」 | 稍后重发（上一轮可能在后台已完成） |

### 生成页 / Apps / API

| 状态码 / 代码 | 触发场景 | 界面提示 | 建议处理 |
|---|---|---|---|
| **401** / `unauthorized` | API Token 无效或已过期 | 提示 Token 失效 | 到设置页重新粘贴有效 Token（从 krea.ai/settings/api-tokens 获取） |
| **403** / `http_403` | 套餐不包含所选模型（生成 / Apps） | 「Krea API 403：…」 | 更换套餐内模型；这是权限问题而非 Token 问题，换 Token 无效 |
| **429** / `rate_limited` | 请求频率超限 | 「Krea API 429：…」 | 稍等片刻后重试 |
| `timeout` | 单次请求超时（5 分钟）；任务轮询超过 **30 分钟** | 「任务 30 分钟仍未完成，可能仍在后台运行；请稍后到资产页查看，避免重复提交」 | 到资产页查看结果，不要立即重复提交（避免重复扣费） |
| `network` | 网络连接失败 | 「网络请求失败：…」 | 检查网络 / 代理后重试 |
| `cancelled` | 用户点击取消 | 「已取消」 | — |
| `no_token` | 尚未配置 Token | 「尚未配置 Krea API Token」 | 到设置页粘贴并保存 Token |
| `bad_model` | 模型 ID 不在注册表 | 「未知模型：…」 | 刷新页面 / 更新插件 |
| `no_job` | API 未返回 job_id | 「Krea 未返回 job_id」 | 重试一次；仍失败则稍后再试 |
| `no_result` | 任务完成但未返回图片地址 | 「任务已完成但未返回图片地址」 | 到资产页查看 / 重试 |
| `job_failed` / `job_cancelled` | 任务失败或已被取消 | 「任务 failed / cancelled：…」 | 查看具体原因；失败任务不会扣费 |
| `download` | 结果下载失败（任务已完成） | 生成页显示下载失败并弹出恢复栏 | 用恢复栏只重试下载，**不会重复扣费**（任务已完成） |
| `upload` | 图片上传失败 | 「图片上传失败：…」 | 检查网络与文件（>8MB 会被拒绝）后重试 |

> 说明：**401 与 403 的区别**——401 是 Token 本身失效（重新粘贴即可）；403 是套餐无权限（换模型 / 升级套餐），插件对两者做了明确区分，不会把权限问题误判为 Token 问题。

---

## 数据与隐私

- **Token 传输**：仅通过 `Authorization: Bearer` 发送到 `api.krea.ai`，不落任何第三方服务器
- **Token 存储**：四级降级存储 `keychain → AES-256-GCM → XOR 混淆 → 明文`；明文时界面显示安全告警；钥匙串读写带 2.5s 超时兜底，可用时同时写加密备份（自愈恢复）
- **网络白名单**（manifest）：`api.krea.ai`、`krea.ai`、`*.krea.ai`、`app-uploads.krea.ai`、`gen.krea.ai`、`raw.githubusercontent.com`
- **更新 / App 目录请求**：仅访问 `raw.githubusercontent.com`，不携带 Token
- **无第三方上报**：无统计、无追踪、无远程代码（无 eval / WebSocket）
- **重置**：设置 → 重置全部数据 可清除 Token、App 缓存、历史、词库与缩略图缓存

---

## 更新机制

- 启动时静默检查 + 设置页手动检查，读取 GitHub `main` 分支的 [`update.json`](update.json)
- `update.json` 支持中英双语更新说明（`notes` / `notes_en`），稳定版不会接收预发布版本
- 检测到新版本跳转 GitHub Releases 下载页；`.ccx` 不能静默替换，安装始终由用户完成
- 发布约定：Tag `v2.4.2` · 标题 `Krea for Ps 2.4.2` · 产物 `Krea-for-Ps-2.4.2.ccx`

---

## 开发 / 构建

### 目录结构

```
manifest.json            UXP manifest（版本戳 / 权限白名单）
index.html               面板壳（含 buildStamp 版本戳）
assets/
  main.js                控制器（UI / 状态 / 流程）
  api.js                 Krea REST 客户端（提交 / 轮询 / 上传 / Agent）
  ps.js                  Photoshop 集成层（选区捕获 / 置入 / 羽化）
  store.js               Token 与偏好存储（四级降级）
  models.js              模型注册表（由 Krea OpenAPI 生成，勿手改）
  i18n.js                中英双语词库
  app.css                样式
icons/                   面板图标（含 ui/ 与 ui/light/、ui/dark/ 主题图标）
```

### 版本戳（三处必须一致）
`manifest.json` 的 `version` = `index.html` 的 `data-version` = `assets/main.js` 的 `VERSION`。

### 打包注意
- `.ccx` 即 ZIP；打包时必须包含 `icons/ui/light/` 与 `icons/ui/dark/` 全部主题图标，否则浅 / 深色主题下 UI 图标 404
- 发布前建议用 `node --check` 校验全部 JS，并与 `.ccx` 逐文件哈希比对

### 关联仓库文件
`featured-apps.json`（App 精选目录，运行时同步）与 `update.json`（更新清单）由 `main` 分支静态托管；修改后提交即可生效，无需发布新 `.ccx`。`featured-apps.json` 的结构：

```json
{
  "schema": 1,
  "updated_at": "ISO 时间戳",
  "apps": [
    {
      "id": "…", "name": "…", "slug": "…", "scope": "public",
      "username": "…", "description": "…", "version": 1,
      "node_app_version_id": "…", "category": "…", "example_outputs": ["…"]
    }
  ]
}
```

插件只读取数据，不执行远程代码；请求失败时回退到本地缓存与内置快照，离线仍可用。

---

## 已知限制与路线图

- **对话页 Agent 回复目前仅展示文本**：Agent 生成的图片暂不支持在对话流中展示 / 置入；如需出图，请用「填入生成」把提示词带到生成页（图片置入能力在规划中）
- **对话历史不持久化**：Agent 会话记录仅存内存，重启插件后清空
- **Agent 单轮等待上限**：约 10 分钟，超时提示「任务可能仍在后台运行」
- **模型计费**：使用你的 Krea API Token 计费，与网页订阅额度相互独立

---

## 联系

- 问题 / 建议请开 [GitHub Issues](https://github.com/9Din/Krea-for-Ps/issues)
- 面板内「关于 → 联系我们」会打开与作者的 Teams 会话（需本机可用 Teams）

---

## License

本仓库当前未附带开源许可证；如需二次分发或商用，请联系作者。