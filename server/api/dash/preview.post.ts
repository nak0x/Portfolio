import { assertDashSession } from '~~/server/utils/dash-auth'
import { renderMarkdown } from '~~/server/utils/markdown'
import { useContentProvider } from '~~/server/utils/providers'

/**
 * The editor has no markdown renderer of its own — it posts the body here and
 * gets back exactly the HTML the published page would show, Shiki included.
 */
export default defineEventHandler(async (event) => {
  assertDashSession(event)

  const { body = '', path = '' } = await readBody<{ body?: string; path?: string }>(event)
  const provider = useContentProvider()
  const baseDir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''

  const { html, toc, readingTime } = await renderMarkdown(body, {
    resolveAsset: (src) => provider.assetUrl(baseDir ? `${baseDir}/${src}` : src),
  })

  return { html, toc, readingTime }
})
