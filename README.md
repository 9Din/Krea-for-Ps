# Krea for Ps

Native Photoshop UXP panel for Krea — selection-driven AI image generation and
editing, with outputs inserted as separate layers.

## Install

Download the latest `Krea-for-Ps-<version>.ccx` from
[Releases](https://github.com/9Din/Krea-for-Ps/releases), quit Photoshop
completely, then double-click the file. Creative Cloud will show an
"unverified" warning; choose **Install locally**.

Requires Photoshop 22.5+ (UXP).

## Updates

The panel checks
[`update.json`](https://raw.githubusercontent.com/9Din/Krea-for-Ps/main/update.json)
on startup (silently) and from **Settings → About → Check for updates**.
A new version opens the GitHub download page; `.ccx` files cannot be replaced
silently, so installation stays a user action.

## Versioning

Patch numbers stay single-digit for easy verbal reference:
`2.3.3 → 2.3.4 → … → 2.3.9 → 2.4.0`. Do not use `2.3.10`.

Release naming:

- Tag: `v2.3.3`
- Title: `Krea for Ps 2.3.3`
- Asset: `Krea-for-Ps-2.3.3.ccx`

## Source layout

```
manifest.json        UXP manifest
index.html           panel shell (generated from _work/index.template.html)
assets/              api / i18n / models / ps / store / main / css
icons/               panel and UI PNGs
update.json          update manifest served to installed copies
```
