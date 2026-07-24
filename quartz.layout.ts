import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { h } from "preact"
import { resolveRelative } from "./quartz/util/path"
import type { FullSlug } from "./quartz/util/path"
import type { QuartzComponent, QuartzComponentProps } from "./quartz/components/types"

// ---------------------------------------------------------------------------
// Explorer customizado agrupado pela propriedade `type` do frontmatter.
// O Explorer nativo do Quartz monta a árvore a partir das PASTAS e não expõe
// `type`; então substituímos por um componente SSR que lê `allFiles` (que traz
// o frontmatter completo) e agrupa por tipo em <details> colapsáveis (HTML puro,
// sem JS). Arquivo é .ts, logo sem JSX — usamos h() do preact.
// ---------------------------------------------------------------------------

// Tipos dominantes do vault (o resto cai em "Outros"). Rótulos em pt-BR.
const TYPE_GROUPS: { key: string; label: string }[] = [
  { key: "source", label: "Fontes" },
  { key: "concept", label: "Conceitos" },
  { key: "entity", label: "Entidades" },
  { key: "synthesis", label: "Sínteses" },
  { key: "overview", label: "Visões gerais" },
]
const KNOWN = new Set(TYPE_GROUPS.map((g) => g.key))
const OTHER = "__outros__"

// Limpa aspas soltas dos títulos importados e trunca no meio, preservando o fim
// (ex.: "(Part 1)" vs "(Part 2)" continuam distinguíveis).
function cleanTitle(raw: string): string {
  let name = (raw ?? "").replace(/^["']+|["']+$/g, "").trim()
  const LIMIT = 52
  if (name.length > LIMIT) {
    name = `${name.slice(0, 34).trimEnd()}…${name.slice(-16).trimStart()}`
  }
  return name
}

const TypeExplorer: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  const current = fileData.slug

  // Distribui os arquivos nos baldes por tipo normalizado.
  const buckets = new Map<string, typeof allFiles>()
  for (const g of TYPE_GROUPS) buckets.set(g.key, [])
  buckets.set(OTHER, [])
  for (const f of allFiles) {
    if ((f.slug ?? "").startsWith("tags/")) continue
    const t = String(f.frontmatter?.type ?? "").toLowerCase().trim()
    const key = KNOWN.has(t) ? t : OTHER
    buckets.get(key)!.push(f)
  }

  const groups = [...TYPE_GROUPS, { key: OTHER, label: "Outros" }]

  return h(
    "div",
    { class: `${displayClass ?? ""} type-explorer` },
    h("h2", {}, "Explorar por tipo"),
    groups.map((g) => {
      const files = (buckets.get(g.key) ?? []).slice().sort((a, b) =>
        (a.frontmatter?.title ?? "").localeCompare(b.frontmatter?.title ?? "", undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      )
      if (files.length === 0) return null
      const hasCurrent = files.some((f) => f.slug === current)
      return h(
        "details",
        { class: "type-group", open: hasCurrent ? true : undefined },
        h(
          "summary",
          {},
          h("span", { class: "type-label" }, g.label),
          h("span", { class: "type-count" }, String(files.length)),
        ),
        h(
          "ul",
          { class: "type-list" },
          files.map((f) => {
            const href = resolveRelative(current, f.slug as FullSlug)
            const active = f.slug === current
            return h(
              "li",
              {},
              h(
                "a",
                { href, class: active ? "active" : undefined },
                cleanTitle(f.frontmatter?.title ?? (f.slug as string)),
              ),
            )
          }),
        ),
      )
    }),
  )
}

TypeExplorer.css = `
.type-explorer h2 { font-size: 1rem; margin: 0 0 0.5rem 0; }
.type-explorer .type-group { border-bottom: 1px solid var(--lightgray); }
.type-explorer .type-group > summary {
  cursor: pointer;
  list-style: none;
  padding: 0.35rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.type-explorer .type-group > summary::-webkit-details-marker { display: none; }
.type-explorer .type-count {
  opacity: 0.55;
  font-weight: 400;
  font-size: 0.75rem;
  background: var(--lightgray);
  border-radius: 6px;
  padding: 0 0.4rem;
}
.type-explorer .type-list { list-style: none; margin: 0 0 0.5rem 0; padding-left: 0.5rem; }
.type-explorer .type-list li { margin: 0.15rem 0; line-height: 1.25; }
.type-explorer .type-list a { font-size: 0.85rem; color: var(--darkgray); }
.type-explorer .type-list a:hover { color: var(--secondary); }
.type-explorer .type-list a.active { color: var(--secondary); font-weight: 700; }
`

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jandersoncampelo",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    TypeExplorer,
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    TypeExplorer,
  ],
  right: [],
}
