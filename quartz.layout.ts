import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// Explorer customizado: os títulos importados do Medium são longos e trazem aspas
// soltas, o que quebra o menu em várias linhas. Aqui limpamos as aspas e truncamos
// NO MEIO (preservando começo e fim), para que sufixos distintivos como "(Part 1)"
// e "(Part 2)" continuem visíveis. mapFn roda no cliente (é serializado via
// toString()), então precisa ser autocontido — sem referências externas.
const explorer = Component.Explorer({
  mapFn: (node) => {
    if (node.isFolder) return
    let name = node.displayName.replace(/^["']+|["']+$/g, "").trim()
    const LIMIT = 52
    if (name.length > LIMIT) {
      const head = name.slice(0, 34).trimEnd()
      const tail = name.slice(-16).trimStart()
      name = `${head}…${tail}`
    }
    node.displayName = name
  },
})

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
    explorer,
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
    explorer,
  ],
  right: [],
}
