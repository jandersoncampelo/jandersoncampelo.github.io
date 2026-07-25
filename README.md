# jandersoncampelo.github.io

Site do meu digital garden (Obsidian + **Quartz v5**), publicado no **GitHub Pages**.

| Destino | O que publica | Acesso |
| --- | --- | --- |
| **GitHub Pages** (`jandersoncampelo.github.io`) | só notas com `publish: true` | público |

Este repo guarda **apenas configuração** — nenhuma nota. O conteúdo é clonado do repo do vault (`jandersoncampelo/the-vault`, privado e separado) em tempo de build, existe só no runner efêmero, e o build vai pro Pages.

> **Histórico:** houve um segundo destino privado (vault completo atrás de login, via Azure Static Web Apps). Foi **abandonado** — o build completo do v5 dava 728 MB, acima do limite de 250 MB do SWA Free. Hoje é só o Pages público. O `spec.md` ainda descreve o design de dois destinos (parcialmente superseded).

## Postura de segurança: opt-in

Uma nota **só** vira pública se tiver `publish: true` no frontmatter (default-nega):

```yaml
---
title: Meu artigo
publish: true    # <- sem isto, NÃO aparece no site
---
```

Esse gate (`explicit-publish`) é o **único** controle que mantém o vault privado fora da web. O pipeline tem um **guard** que aborta o build se o gate não estiver correto. Além dele: `ignorePatterns` bloqueia arquivos não-`.md` (tooling `.py`, `.json`, `.base`) que o Quartz senão copiaria como assets sem filtro; e `canvas-page`/`bases-page` ficam desligados (vazam `.canvas`/`.base`).

## Setup (uma vez)

### 1. PAT de leitura do vault

O vault é um repo **privado separado**, então o `GITHUB_TOKEN` automático não o alcança. Crie um **fine-grained PAT**:

- GitHub → Settings → Developer settings → Fine-grained tokens → Generate
- **Repository access**: só `jandersoncampelo/the-vault`
- **Permissions**: `Contents` → **Read-only**

### 2. Secret

Neste repo → Settings → Secrets and variables → Actions:

- `VAULT_REPO_PAT` — o PAT do passo 1 (é o **único** secret necessário)

### 3. Ligar o GitHub Pages

Settings → Pages → **Source: GitHub Actions**.

### 4. Rodar

Commit + push (dispara ao mudar config), ou **Actions → Deploy site (GitHub Pages) → Run workflow**. Como o vault mora em outro repo, `push` de nota **não** dispara o pipeline — daí o cron de 6h (ou disparo manual).

## Desenvolvimento local (Quartz v5)

Precisa **Node ≥ 22**. O `content/` é ignorado pelo git; aponte-o pro seu vault via junction (não exige admin no Windows):

```powershell
git clone https://github.com/jackyzha0/quartz.git quartz-build
# fixe no MESMO commit da produção (env QUARTZ_REF no deploy.yml)
git -C quartz-build checkout <QUARTZ_REF>
Copy-Item quartz.config.yaml quartz-build/quartz.config.yaml -Force
# apontar content/ pro vault (remova o content/ que vem no clone antes)
Remove-Item -Recurse -Force quartz-build/content
New-Item -ItemType Junction -Path quartz-build/content -Target "C:\caminho\para\the-vault"
cd quartz-build
npm ci
npm install @quartz-themes/sanctum   # temas sao pacotes npm separados (flavor: theme: sanctum.yellow)
npm run install-plugins                 # gera .quartz/plugins (npx quartz build nao dispara o prebuild)
npx quartz build --serve
```

Abre em **http://localhost:8080**. O `--serve` faz hot-reload conforme você edita o vault.

## Checklist anti-vazamento

O `explicit-publish` remove as notas não-publicadas, mas há bordas a revisar na primeira publicação de uma nota nova:

- [ ] Grafo e busca não mostram títulos de notas privadas
- [ ] Nenhum wikilink público aponta `[[Nota Privada]]` (o *texto* do link ainda vai pro HTML)
- [ ] Nenhum arquivo de tooling/dados (`tools/`, `scratch/`, `.py`, `.json`, `.base`) acessível — cobertos por `ignorePatterns`, mas confira ao adicionar pastas novas ao vault
