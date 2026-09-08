import { dashEnabled, hasValidSession } from '~~/server/utils/dash-auth'
import { useContentProvider } from '~~/server/utils/providers'
import { contentConfig } from '~~/server/utils/config'

/** what the dashboard needs before it can render anything */
export default defineEventHandler((event) => {
  const enabled = dashEnabled()
  const authenticated = enabled && hasValidSession(event)

  if (!authenticated) return { enabled, authenticated, writable: false }

  const content = contentConfig()
  let writable = false
  let kind = content.provider
  try {
    const provider = useContentProvider()
    writable = provider.writable
    kind = provider.kind
  } catch (error) {
    console.error('[dash] provider unavailable:', error)
  }

  return {
    enabled,
    authenticated,
    writable,
    provider: kind,
    repo: content.repo,
    branch: content.branch,
    dir: content.dir,
    siteFile: content.siteFile,
    ttl: content.ttl,
    webhook: !!content.webhookSecret,
  }
})
