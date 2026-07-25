# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is a **config-only** repository for a **Quartz v5** digital garden. It contains **no content** — no notes, no markdown vault. Prose and rationale live in `README.md` (setup) and `spec.md` (original architecture spec, in Portuguese — **partly superseded**, see its top banner). See also the persistent memory notes `quartz-v5-notes` and `hosting-limits`.

The tracked artifacts are the entire product:

- `quartz.config.yaml` — the Quartz **v5** config (YAML), copied over a freshly-cloned Quartz at build time.
- `.github/workflows/deploy.yml` — the single pipeline that builds and deploys.

## Architecture: one source, one public destination

Content comes from a **separate private vault repo** (`jandersoncampelo/the-vault`, an Obsidian vault), cloned into `content/` at build time via a fine-grained PAT and discarded after. This repo can be public precisely because it never holds notes.

The site builds **once** and deploys to **GitHub Pages** (public). Only notes with `publish: true` in frontmatter are published — **default-deny**. There is **no private/authenticated destination** (an Azure SWA "full vault" destination existed in an earlier design but was abandoned — see History at the bottom).

## Quartz v5 — critical, non-obvious facts

The repo migrated from Quartz v4 (TypeScript config) to **v5 (YAML config, npm-package plugins)**. Gotchas that will bite you:

- **Config is `quartz.config.yaml`** (YAML), not `quartz.config.ts`. Plugins are `@quartz-community/*` npm packages declared with `enabled`/`options`/`order`/`layout`. Layout is declarative in the YAML.
- **`note-properties` IS the frontmatter parser** (not just a properties table). Disabling it breaks ALL titles ("Sem título") and the `publish` gate. Keep `enabled: true` with `hidePropertiesView: true`.
- **Themes are separate npm packages** (`@quartz-themes/sanctum`); `@quartz-themes/core` is only the engine. The pipeline runs `npm install @quartz-themes/sanctum`. Current theme: **sanctum.yellow** (dark, yellow accent). Flavored themes (e.g. `sanctum.yellow`) install the base package (`@quartz-themes/sanctum`) and set the flavored name as the `theme:` option value.
- **`QUARTZ_REF` is pinned to the v5 branch HEAD, not the `v5.0.0` tag** — the tag has a bug (`install-plugins` crashes on `.scss` loading the config under tsx; the branch has the fallback fix).
- **`npx quartz build` does NOT run the prebuild** → the pipeline runs `npm run install-plugins` manually to generate `.quartz/plugins/index.ts` (a barrel imported by `Head.tsx`).

## The one security rule that must not be broken

**The publish gate is the only thing keeping private notes off the public web.** The build MUST have `explicit-publish` enabled and `remove-draft` disabled in `quartz.config.yaml`. `deploy.yml` has a **guard** that aborts the build if the gate is wrong, rather than leaking the whole vault. Publication is default-deny: a note is private unless its frontmatter has `publish: true`.

Two related, non-obvious leak vectors — already handled, do not undo:

- **Non-`.md` files leak as assets.** Quartz copies non-markdown files (`tools/*.py`, `.json`, `.base`, …) as assets WITHOUT the publish filter. `ignorePatterns` in `quartz.config.yaml` denylists tooling dirs + code/data extensions. (This was an *active production leak* before the fix — see `quartz-v5-notes`.)
- **`canvas-page` and `bases-page` are disabled** — they emit `.canvas`/`.base` bypassing the publish filter. Keep them off.

Residual known risk: a public note linking `[[Private Note]]` leaks the *title* into public HTML (`spec.md` §7/§13).

## Build note

`npx quartz build` does **not** run against this repo directly. The pipeline clones Quartz at the pinned commit into `quartz-build/`, copies `quartz.config.yaml` over it, clones the vault into `quartz-build/content/`, runs `npm ci` + `npm install @quartz-themes/sanctum` + `npm run install-plugins`, then a single `npx quartz build` → `dist-public/` → GitHub Pages. There is no `package.json` in this repo — it comes from Quartz.

## Local preview

See `README.md` "Desenvolvimento local" for the exact v5 PowerShell steps: clone Quartz at the pinned commit, copy `quartz.config.yaml`, junction `quartz-build/content` to a local vault, `npm ci`, `npm install @quartz-themes/sanctum`, `npm run install-plugins`, then `npx quartz build --serve`. Node **≥ 22** required.

## Sizing / hosting

GitHub Pages allows a 1 GB published site (soft 100 GB/mo bandwidth, 10-min deploy timeout). The public subset is tiny (opt-in publish), so space is not a concern. Graph, tag-page and og-image are enabled. See memory `hosting-limits`.

## History: the abandoned private destination

An earlier design (still described in most of `spec.md`) served the **full vault** privately via Azure Static Web Apps behind GitHub login (custom `leitor` role). That destination was **abandoned**: the full v5 build was 728 MB, over SWA Free's 250 MB hard limit, and the private-access objective was dropped. `staticwebapp.config.json` and `quartz.config.public.yaml` were removed; the `AZURE_SWA_TOKEN` secret and the Azure SWA resource are now unused and can be deleted.

The default branch is `main`, which matches the `push` trigger in `deploy.yml`.
