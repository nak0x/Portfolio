import { assertDashSession } from '~~/server/utils/dash-auth'
import { putSiteData } from '~~/server/utils/site'
import { useContentProvider } from '~~/server/utils/providers'
import { assertWritable } from '~~/server/utils/providers/types'
import type { SiteData } from '#shared/site'

export default defineEventHandler(async (event) => {
  assertDashSession(event)
  assertWritable(useContentProvider())

  const { data, sha, message } = await readBody<{
    data: SiteData
    sha?: string | null
    message?: string
  }>(event)

  if (!data || typeof data !== 'object') {
    throw createError({ statusCode: 422, message: 'missing site data' })
  }

  return await putSiteData(data, {
    sha,
    message: message?.trim() || 'site: update portfolio content',
  })
})
