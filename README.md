# jandersoncampelo.github.io

Site do meu digital garden (Obsidian + Quartz), com **dois destinos a partir de uma única workflow**:

| Destino | O que publica | Acesso |
| --- | --- | --- |
| **GitHub Pages** (`jandersoncampelo.github.io`) | só notas com `publish: true` | público |
| **Azure Static Web Apps** | vault completo, menos `draft: true` | privado (só eu, via Entra) |

Este repo guarda **apenas configuração** — nenhuma nota. O conteúdo é clonado do repo do vault (privado, separado) em tempo de build, existe só no runner efêmero, e cada build vai pro destino certo.

## Postura de segurança: opt-in

Uma nota **só** vira pública se tiver `publish: true` no frontmatter (default-nega). A privada mostra tudo, exceto o que estiver marcado como `draft: true`.

```yaml
---
title: Meu artigo
publish: true    # <- sem isto, NÃO aparece no site público
---
```

## Setup (uma vez)

### 1. Ajustar os placeholders

Em `.github/workflows/deploy.yml`, bloco `env:`:

- `VAULT_REPO` — `owner/repo` do vault (ex.: `jandersoncampelo/obsidian-vault`)
- `SWA_HOSTNAME` — pegue com:

```powershell
az staticwebapp show --name swa-vault-janderson --resource-group rg-obsidian-vault --query "defaultHostname" -o tsv
```

### 2. Criar o PAT de leitura do vault

Como o vault é um repo **privado separado**, o `GITHUB_TOKEN` automático não o alcança. Crie um **fine-grained PAT**:

- GitHub → Settings → Developer settings → Fine-grained tokens → Generate
- **Repository access**: só o repo do vault
- **Permissions**: `Contents` → **Read-only**

### 3. Cadastrar os secrets

Neste repo → Settings → Secrets and variables → Actions:

- `VAULT_REPO_PAT` — o PAT do passo 2
- `AZURE_SWA_TOKEN` — deployment token do SWA:

```powershell
az staticwebapp secrets list --name swa-vault-janderson --resource-group rg-obsidian-vault --query "properties.apiKey" -o tsv
```

### 4. Ligar o GitHub Pages

Settings → Pages → **Source: GitHub Actions**. (Não precisa de secret — usa o `GITHUB_TOKEN`.)

### 5. Trancar o SWA pra só você

Só precisa fazer **depois do primeiro deploy** (o `staticwebapp.config.json` bloqueia até você aceitar o convite):

Portal → seu Static Web App → **Role management** → **Invite** (ou via `az staticwebapp users invite`)
- Provider: **GitHub**
- Username: o seu (ex.: `jandersoncampelo`)
- Role: **`leitor`** (⚠️ não use `authenticated` — deixaria entrar qualquer conta GitHub)
- Gere o link, abra logado na sua conta GitHub e aceite. Depois faça logout/login (`/.auth/logout` → `/.auth/login/github`) para a sessão pegar a role.

> A role concedida (`leitor`) precisa bater **exatamente** com a `allowedRoles` do `staticwebapp.config.json`, e o login precisa ser pelo mesmo provider em que a role foi concedida (GitHub).

### 6. Rodar

Commit + push, ou dispare manualmente em **Actions → Deploy vault → Run workflow**.

## Desenvolvimento local

O `content/` é ignorado pelo git. Pra testar localmente, aponte-o pro seu vault (symlink no Windows):

```powershell
git clone --depth 1 --branch v4 https://github.com/jackyzha0/quartz.git quartz-build
Copy-Item quartz.config.ts quartz-build/ -Force
New-Item -ItemType SymbolicLink -Path quartz-build/content -Target "C:\caminho\para\seu\vault"
cd quartz-build
npm ci

# Prévia do site PÚBLICO (o que o mundo veria):
$env:QUARTZ_PUBLIC="true"; npx quartz build --serve
```

## Checklist antes de confiar no site público

O `ExplicitPublish` remove as notas não-publicadas do grafo, mas se uma nota **pública** linka `[[Nota Privada]]`, o *texto* do link ainda vai pro HTML. Na primeira publicação, revise à mão:

- [ ] Grafo e busca não mostram títulos de notas privadas
- [ ] Nenhum backlink aponta pra fora do subset público
- [ ] Nenhum wikilink quebrado revelando nome de nota interna

## Gatilho instantâneo (opcional)

Como o vault mora em outro repo, `push` aqui não reflete mudança de nota — por isso o cron de 6h. Pra rebuild imediato quando você commita no vault, adicione uma workflow **no repo do vault** que chame o `repository_dispatch` deste repo.
