# Krea for Ps

![Version](https://img.shields.io/badge/version-2.4.2-blue)
![Photoshop](https://img.shields.io/badge/Photoshop-22.5%2B-31A8FF)
![UXP](https://img.shields.io/badge/UXP-Manifest%205-lightgrey)

Krea for Ps is a native Photoshop panel plugin (UXP) that talks directly to the Krea Open API. It drives selection-aware AI image generation and editing with 44 cloud models, adapts results to your selection and places them back into the document as layers. It also ships a Node App workflow, a Krea Agent chat, a prompt library and edge feathering.

- **Architecture**: pure front-end SPA calling `api.krea.ai` with your own Krea API token (not a web-subscription login)
- **Compatibility**: Photoshop 22.5+ (2021+), dockable or floating panel
- **Languages**: Simplified Chinese / English, follows the Photoshop UI language, switchable at any time

---

## Features

### Generate
- **Selection-driven**: clicking Generate reads the current selection in real time as the input image; a missing selection prompts you to create one first
- **44 cloud models**: grouped by vendor, covering text-to-image, image-to-image, local repaint (inpainting) and upscale/enhance (see [Models](#models))
- **Reference images**: multiple references supported; files over 8 MB are rejected, large images are auto-scaled to a 1024 px long edge before upload
- **Image-to-image**: fixed 0.5 editing strength for a balance between preserving the original and repainting
- **Upscale / enhance models**: `image_scaling_factor` (default ≥2×) and `upscaling_activated` are now sent explicitly, so "upscale" models actually upscale
- **Output modes**: insert as a new layer / replace the original layer (if replace fails the result is kept as a new layer with a clear toast); App results can also be placed into a new document
- **Feather edges**: builds a feathered mask from the selection or an existing mask, matching the original panel behaviour
- **Progress & cancel**: job polling is capped at 30 minutes (timeout suggests checking the Assets page instead of resubmitting and paying twice); both the submit and the polling phase can be cancelled

### Chat · Krea Agent
- Multi-turn conversations with Krea Agent: analyse images, write prompts, keep asking follow-ups
- Attachments: the current selection or an uploaded image, auto-uploaded to Krea Assets so the Agent can read them
- Model: defaults to Auto, or pin a specific LLM; falls back to Auto with a notice when your plan does not include it
- Actions: copy a reply, or send it straight into the Generate prompt ("Use in Generate")
- Cancellable while waiting; the session is kept so you can continue afterwards

### Apps
- Browse Krea's featured apps plus your own workspace apps; the form is generated from each app's OpenAPI schema
- The featured catalog syncs from `featured-apps.json` in this repo (cached at startup + manual refresh), so the app list can change without a plugin release
- Opening an app first asks the API for the latest schema and `node_app_version_id`; the catalog version is only a compatibility fallback
- Debounced search, favourites / workspace filters, pagination; video / audio-only apps are hidden because Photoshop cannot place those results as layers

### Assets & history
- Generation history thumbnails: download, place as a layer, delete, retry
- Expired result URLs are refreshed automatically before placement

### Prompt library & history
- Categorised library: add / edit / delete, search, import from a JSON file, one-click restore to defaults
- Prompt history: recorded automatically, one-click refill

### Settings
- Account: token status check, change token, sign out
- Data & maintenance: open asset history, clear app cache, reset all data
- Visibility: hide the "All" / "Favourites" filters, hide the Assets tab (old single switch is migrated on upgrade)
- Updates: manual update check
- Language: one-click Chinese / English toggle

### Reliability
- **Multi-document safety**: switching documents mid-generation never misplaces a result — capture bounds are clamped against the snapshot document, the target document is activated before placement, and a closed original document raises a clear error
- **Download-failure recovery**: the recovery confirmation no longer blocks task state; a successful retry still places into the original task's document and selection
- **Write-failure rollback**: failed disk writes for the library / history / reset roll back the in-memory state and show a toast
- **Stale-response protection**: request sequence numbers discard responses from switched tabs or rapid clicks
- **Theme adaptive**: light/dark detection with automatic icon switching

---

## Quick start

### Install
1. Download the latest `Krea-for-Ps-<version>.ccx` from [Releases](https://github.com/9Din/Krea-for-Ps/releases)
2. Quit Photoshop completely
3. Double-click the `.ccx`; when Creative Cloud shows "unverified", choose **Install locally**

### First run (5 steps)
1. **Get an API token**: create and copy one at [krea.ai/settings/api-tokens](https://krea.ai/settings/api-tokens) (the panel can also open the page for you)
2. **Connect**: open Krea for Ps in Photoshop, paste the token and save; the status shows "Connected"
3. **Prepare input**: make a selection and click Generate; add reference images as needed
4. **Pick a model & prompt**: choose a model by vendor and enter a prompt (image-to-image strength is fixed at 0.5 — nothing to configure)
5. **Generate & refine**: choose the output mode (new layer / replace) and click Generate; feather edges, prompt history and the library are available for fine-tuning

> The token stays on this machine only (see [Data & privacy](#data--privacy)); generation is billed to the Krea API credit of the token's account.

---

## Models

**44 models** (35 image + 9 upscale/enhance) grouped by vendor (source: Krea official OpenAPI, generated 2026-10-16):

| Group | Models |
|---|---|
| Upscale / Enhance | Krea Enhance (incl. Legacy), Topaz (Generative / Standard / Bloom / Bloom 2 / Wonder 3.5), Magnific (Creative / Precise) |
| Krea | Krea 2 Medium / Large / Medium-Turbo, Krea 3 |
| Google | Nano Banana Pro / 2 / 2.1 / Flash-Lite / Nano Banana |
| OpenAI | GPT-Image, GPT-Image 2, GPT-Image 2.5 Flare / Sunburst |
| Ideogram | — |
| Black Forest Labs | Flux 1.1 / Kontext, etc. |
| ByteDance | Seedream / Seededit, etc. |
| xAI | — |
| Meta | Muse Image, etc. |
| Alibaba | Tongyi series |
| Luma | — |
| Recraft | — |
| Qwen | — |
| Z-Image | — |
| Runway | — |

> Model parameters are filled automatically from the OpenAPI schema — no need to set seed, steps or other advanced fields by hand.

---

## UI overview

Top navigation: **Apps · Generate · Chat · Assets** (the Assets tab can be hidden in Settings); the top-right corner holds the language toggle and Settings.

| Page | Purpose |
|---|---|
| Apps | Featured / workspace app browsing and running (forms generated from schemas) |
| Generate | Main selection-driven generation / editing flow |
| Chat | Krea Agent multi-turn chat (attachments: selection or uploaded image) |
| Assets | Generation history: download, place, delete, retry |
| Settings | Token, data maintenance, visibility switches, update check, language |

---

## Error reference

### Chat (Krea Agent)

| Status / code | When it happens | In-panel message | What to do |
|---|---|---|---|
| **402** | Not enough Agent compute credits, or the free message limit is reached | "Not enough Agent compute units, or the free message limit is reached." | Top up Agent credits on the Krea website and retry |
| **403** | Your plan does not include the chosen Agent model | "Your plan does not include this model. Choose Auto or another model." | The plugin automatically switches back to **Auto** (and clears the previous choice); the model list afterwards only shows models your plan allows — just resend |
| **404** | The Agent cannot find the attached image | "The Agent could not find the attached image. Upload it again." | Re-upload the image or re-make the selection, then send again |
| **409** | The previous turn is still running | "The previous turn is still running. Wait for it to finish." | Wait for the previous turn to finish before sending |
| **422** | Invalid request parameters | "Invalid Agent request: {msg}" | Check your input and attachment per the message, then retry |
| `cancelled` | You cancelled manually | "Stopped waiting. The turn may still finish in Krea; try again later." | The session is kept — you can continue the conversation later |
| `agent_timeout` | A single turn exceeds ~10 minutes | "Timed out. The turn may still be running in Krea; try again later." | Resend later (the turn may already have finished in the background) |

### Generate / Apps / API

| Status / code | When it happens | In-panel message | What to do |
|---|---|---|---|
| **401** / `unauthorized` | API token invalid or expired | Token invalid notice | Paste a fresh token in Settings (from krea.ai/settings/api-tokens) |
| **403** / `http_403` | Your plan does not include the chosen model (Generate / Apps) | "Krea API 403: …" | Switch to a model inside your plan; this is a permission issue, not a token issue — a new token will not help |
| **429** / `rate_limited` | Request rate limit exceeded | "Krea API 429: …" | Wait a moment and retry |
| `timeout` | Single request timed out (5 min); job polling exceeded **30 minutes** | "Task not finished after 30 minutes; it may still be running in the background. Check the Assets page instead of resubmitting." | Check the Assets page for the result; do not resubmit immediately (avoids double billing) |
| `network` | Network failure | "Network request failed: …" | Check your connection / proxy and retry |
| `cancelled` | You clicked Cancel | "Cancelled" | — |
| `no_token` | No token configured | "No Krea API token configured." | Paste and save a token in Settings |
| `bad_model` | Model ID not in the registry | "Unknown model: …" | Refresh the panel / update the plugin |
| `no_job` | API returned no job_id | "Krea returned no job_id" | Retry once; if it persists, try again later |
| `no_result` | Job finished but returned no image URL | "The job finished but returned no image URL." | Check the Assets page / retry |
| `job_failed` / `job_cancelled` | Job failed or was cancelled | "Job failed / cancelled: …" | See the specific reason; failed jobs are not billed |
| `download` | Result download failed (the job itself finished) | Download failed with a recovery bar | Use the recovery bar to retry **download only — no double billing** (the job is already complete) |
| `upload` | Image upload failed | "Image upload failed: …" | Check your connection and the file (>8 MB is rejected) |

> Note on **401 vs 403**: 401 means the token itself is invalid (paste a new one); 403 means your plan lacks permission (switch models / upgrade the plan). The plugin distinguishes the two, so a permission issue is never misreported as a token problem.

---

## Data & privacy

- **Token transport**: sent only as `Authorization: Bearer` to `api.krea.ai`, never to third parties
- **Token storage**: four-level fallback `keychain → AES-256-GCM → XOR obfuscation → plaintext`; a security warning is shown when plaintext is used; keychain access has a 2.5 s timeout fallback and writes an encrypted backup when available (self-healing)
- **Network whitelist** (manifest): `api.krea.ai`, `krea.ai`, `*.krea.ai`, `app-uploads.krea.ai`, `gen.krea.ai`, `raw.githubusercontent.com`
- **Update / catalog requests**: hit `raw.githubusercontent.com` only, never carrying the token
- **No third-party reporting**: no analytics, no tracking, no remote code (no eval / WebSocket)
- **Reset**: Settings → Reset all data removes the token, app cache, history, library and thumbnail cache

---

## Updates

- Silent check at startup plus a manual check in Settings, reading [`update.json`](update.json) from the `main` branch
- `update.json` supports bilingual release notes (`notes` / `notes_en`); stable builds never accept pre-release versions
- A new version opens the GitHub Releases page; `.ccx` files cannot be replaced silently, so installation stays a user action
- Release convention: tag `v2.4.2` · title `Krea for Ps 2.4.2` · asset `Krea-for-Ps-2.4.2.ccx`

---

## Development / build

### Source layout

```
manifest.json            UXP manifest (version stamp / permission whitelist)
index.html               panel shell (contains the buildStamp version stamp)
assets/
  main.js                controller (UI / state / flows)
  api.js                 Krea REST client (submit / poll / upload / Agent)
  ps.js                  Photoshop integration (selection capture / placement / feather)
  store.js               token & preference storage (four-level fallback)
  models.js              model registry (generated from the Krea OpenAPI — do not hand-edit)
  i18n.js                zh/en dictionary
  app.css                styles
icons/                   panel icons (including ui/, ui/light/, ui/dark/ theme icons)
```

### Version stamp (must match in three places)
`version` in `manifest.json` = `data-version` in `index.html` = `VERSION` in `assets/main.js`.

### Packaging notes
- A `.ccx` is a ZIP; always include the full `icons/ui/light/` and `icons/ui/dark/` icon sets, otherwise UI icons 404 in light/dark themes
- Before a release, run `node --check` on every JS file and hash-compare the package against the source directory

### Companion repo files
`featured-apps.json` (featured app catalog, synced at runtime) and `update.json` (update manifest) are statically hosted on the `main` branch; commit changes and they take effect without a new `.ccx`. `featured-apps.json` shape:

```json
{
  "schema": 1,
  "updated_at": "ISO timestamp",
  "apps": [
    {
      "id": "…", "name": "…", "slug": "…", "scope": "public",
      "username": "…", "description": "…", "version": 1,
      "node_app_version_id": "…", "category": "…", "example_outputs": ["…"]
    }
  ]
}
```

The plugin only reads data — no remote code is executed. On failure it falls back to the local cache and then to the built-in snapshot, so the Apps tab still works offline.

---

## Known limitations & roadmap

- **Agent replies are text-only for now**: images generated by the Agent are not yet displayed or placed inside the chat stream; to generate an image, use "Use in Generate" to carry the prompt to the Generate page (in-chat image placement is planned)
- **Chat history is not persisted**: Agent sessions live in memory only and are cleared when the plugin restarts
- **Per-turn Agent wait cap**: about 10 minutes, with a timeout note that the turn may still be running in the background
- **Billing**: generation is billed against your Krea API token, independent of web-subscription credits

---

## Contact

- Issues / feature requests: [GitHub Issues](https://github.com/9Din/Krea-for-Ps/issues)
- In-panel "About → Contact us" opens a Teams chat with the author (requires Teams on this machine)

---

## License

This repository currently ships without an open-source license; contact the author for redistribution or commercial use.