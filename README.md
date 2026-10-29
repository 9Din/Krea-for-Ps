# Krea for Ps

Native Photoshop UXP panel for Krea — run Krea Apps, generate images from a text
prompt or the current selection, and place results straight into the document as
layers.

## Install

Download the latest `Krea-for-Ps-<version>.ccx` from
[Releases](https://github.com/9Din/Krea-for-Ps/releases), quit Photoshop
completely, then double-click the file. Creative Cloud will show an
"unverified" warning; choose **Install locally**.

Requires Photoshop 22.5+ (UXP).

## Features

- **Apps** — browse Krea's featured apps plus your own and workspace apps, fill
  the form generated from each app's OpenAPI schema, and place the generated
  image into the current document. Image fields can use the current selection.
- **Live app catalog** — the featured list is synced from
  [`featured-apps.json`](featured-apps.json) on startup (cached for 6 hours) and
  whenever you press refresh. New or removed public apps appear without updating
  the plugin. Private/user apps are excluded from this catalog and stay in the
  Workspace tab.
- **Latest app definitions** — opening an app first asks the API for the app by
  ID, so the form and execution use the current `node_app_version_id`; the
  version stored in the catalog is only a compatibility fallback.
- **Generate** — 44 image models grouped by task, prompt presets, reference
  images, selection-aware layer sampling, feathering, and new-layer/replace-layer
  output.
- **Chat** — **AI chat** with Krea Agent. Attach the current selection or an
  uploaded image, ask the Agent to analyse it, write prompts, or continue a
  multi-turn conversation. Replies can be copied or sent straight to the Generate
  prompt. Agent defaults to Auto; a documented LLM can be pinned from the model
  picker.
- **Assets, history and prompt library** — thumbnails, retry/cancel, prompt
  history, a searchable personal prompt library, favourites, and app search.
- **Video/audio filtering** — apps that only produce video/audio (or only accept
  it) are hidden because Photoshop cannot place those results as layers.
- **Local-first settings** — UI language, model choice, favourites, the Apps
  filter visibility and history are stored in the UXP data folder. Settings can
  hide **All** and/or **Favourites** independently, and the panel follows the
  Photoshop light/dark theme.

## Updates

The panel checks
[`update.json`](https://raw.githubusercontent.com/9Din/Krea-for-Ps/main/update.json)
on startup (silently) and from **Settings → Plugin updates → Check for updates**.
A new version opens the GitHub download page; `.ccx` files cannot be replaced
silently, so installation stays a user action. The in-panel check only reports the
new version — Creative Cloud performs the actual install when you open the
downloaded `.ccx`. There is no in-plugin update or self-uninstall API in UXP.

The manifest supports a Chinese and an English changelog. `notes` stays the
default/Chinese text so older plugin builds keep working; `notes_en` is used when
the panel language is English:

```json
{
  "version": "2.4.1",
  "notes": "中文更新说明",
  "notes_en": "English release notes",
  "download": "https://github.com/9Din/Krea-for-Ps/releases/download/v2.4.1/Krea-for-Ps-2.4.1.ccx",
  "page": "https://github.com/9Din/Krea-for-Ps/releases/tag/v2.4.1"
}
```

## App catalog sync

`featured-apps.json` is a static JSON file served from the `main` branch:

```json
{
  "schema": 1,
  "updated_at": "2026-10-26T14:01:12.359Z",
  "source": "https://www.krea.ai/nodes?tab=apps",
  "apps": [
    {
      "id": "…",
      "name": "…",
      "slug": "…",
      "scope": "public",
      "username": "…",
      "description": "…",
      "version": 1,
      "node_app_version_id": "…",
      "category": "video",
      "example_outputs": ["…"]
    }
  ]
}
```

The plugin only reads data — no remote code is executed. If the request fails or
the JSON is invalid, it falls back to the last local cache and then to the built-in
snapshot compiled into `assets/main.js`, so the Apps tab still works offline. The
status line shows **Offline list** while a fallback is active.

To publish a new catalog, edit `featured-apps.json`, update `updated_at`, and
commit it to `main`. No new `.ccx` release is required. `category: "video"` marks
known video/audio apps; schema inspection still catches anything the catalog
misses.

## Privacy and network access

- The Krea API token is sent only to `api.krea.ai`.
- AI chat uses Krea Agent. When you attach a selection or image, the plugin first
  uploads it to Krea Assets (`POST /assets`) so the Agent can read it.
- Update and app-catalog requests go to `raw.githubusercontent.com` and never
  include the token.
- The token is stored locally in the UXP data folder (`token.json` plus the
  available keychain/encrypted backup). **Settings → Reset all data** removes it
  together with history, the prompt library and caches.

## Contact

**About → Contact us** opens a Microsoft Teams chat with the author, prefilled
with the running plugin version. The Teams desktop app (or a browser signed in
to Teams) must be available.

## Versioning

Patch numbers stay single-digit for easy verbal reference:
`2.3.6 → 2.3.7 → 2.3.8 → 2.3.9 → 2.4.0 → 2.4.1`. Do not use `2.4.10`.

Release naming:

- Tag: `v2.4.1`
- Title: `Krea for Ps 2.4.1`
- Asset: `Krea-for-Ps-2.4.1.ccx`

## Source layout

```
manifest.json        UXP manifest
index.html           panel shell (generated from _work/index.template.html)
featured-apps.json   app catalog synced by the panel at runtime
assets/              api / i18n / models / ps / store / main / css
icons/               panel and UI PNGs
update.json          update manifest served to installed copies
```

`_work/` contains local build, packaging and test scripts and is not shipped in
the `.ccx`.

