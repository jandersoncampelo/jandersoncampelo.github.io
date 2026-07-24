# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is a **config-only** repository for a Quartz v4 digital garden. It contains **no content** — no notes, no markdown vault. The prose and detailed rationale live in `README.md` (setup) and `spec.md` (full architecture spec, in Portuguese). Read `spec.md` before making architectural changes.

The three tracked artifacts are the entire product:

- `quartz.config.ts` — Quartz configuration, copied over a freshly-cloned Quartz at build time.
- `.github/workflows/deploy.yml` — the single pipeline that builds and deploys both targets.
- `staticwebapp.config.json` — Azure SWA route/auth gate, injected only into the private build.

## Core architecture: one source, two destinations

Content comes from a **separate private vault repo** (an Obsidian vault), cloned into `content/` at build time via a fine-grained PAT and discarded after. This repo can be public precisely because it never holds notes. The same Quartz generator runs **twice in one job**, switched by env var:

| Env | Filter | Output | Destination | Access |
| --- | --- | --- | --- | --- |
| `QUARTZ_PUBLIC=true` | `ExplicitPublish` (only `publish: true`) | `dist-public/` | GitHub Pages | public |
| `QUARTZ_PUBLIC=false` | `RemoveDrafts` (all except `draft: true`) | `dist-private/` | Azure Static Web Apps | private (GitHub login, `leitor` role) |

The public/private split is the whole point of the design. The two controls are independent (`quartz.config.ts:80-82` selects the filter; `staticwebapp.config.json` gates the private site) so one failing does not leak the full vault. Publication is **default-deny**: a note is private unless its frontmatter has `publish: true`.

## Two security rules that must not be broken

1. **Never commit vault content here.** `content/`, `dist-*/`, `quartz-build/` are gitignored. The public destination filter (`ExplicitPublish`) is the only thing keeping private notes off the public web — do not weaken it or switch to folder-based selection.
2. **The SWA gate must use a custom role granted by invite**, never the built-in `authenticated` role. `authenticated` admits any account from the provider; the custom role is granted only by manual invite. The role name in `staticwebapp.config.json` (`allowedRoles`) must match the invited role exactly, and login must use the same provider the role was granted on. Current setup: role **`leitor`**, provider **GitHub**, login redirect `/.auth/login/github`. (`spec.md` §7/AD-4 describes the same principle with the original Entra + `reader` naming.)

Residual known risk: a public note linking `[[Private Note]]` leaks the *title* (not content) into public HTML. `spec.md` §13 tracks an anti-leak CI check as future work.

## Build note

`npx quartz build` does **not** run against this repo directly. The pipeline clones Quartz into `quartz-build/`, copies `quartz.config.ts` (and `quartz.layout.ts` if present) over it, clones the vault into `quartz-build/content/`, then runs `npm ci` + `npx quartz build` from inside `quartz-build/`. There is no `package.json` in this repo — it comes from Quartz.

## Local preview

`README.md` "Desenvolvimento local" has the exact PowerShell steps: clone Quartz to `quartz-build/`, copy the config, symlink `quartz-build/content` to a local vault, `npm ci`, then:

```powershell
$env:QUARTZ_PUBLIC="true"; npx quartz build --serve
```

Set `QUARTZ_PUBLIC` to preview whichever subset you want (`true` = what the world sees; `false` = full vault).

## Before trusting a deploy

The `deploy.yml` `env:` block has placeholders that must be set for a real deploy: `VAULT_REPO`, `SWA_HOSTNAME` (currently `SEU_HOST.azurestaticapps.net`), and `QUARTZ_REF` (pinning to a known Quartz commit is recommended over the moving `v4` branch — see `spec.md` §13). Secrets `VAULT_REPO_PAT` and `AZURE_SWA_TOKEN` must exist in repo settings.

The default branch is `main`, which matches the `push` trigger in `deploy.yml`.
