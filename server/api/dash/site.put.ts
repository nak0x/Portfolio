import { assertDashSession } from '~~/server/utils/dash-auth'
import { putSiteData } from '~~/server/utils/site'
import type { SiteData } from '#shared/site'

export default defineEventHandler(async (event) => {
  assertDashSession(event)

  const { data, revision, message } = await readBody<{
    data: SiteData
    revision?: number | null
    message?: string
  }>(event)

  if (!data || typeof data !== 'object') {
    throw createError({ statusCode: 422, message: 'missing site data' })
  }

  if (revision != null && !Number.isInteger(revision)) {
    throw createError({ statusCode: 422, message: 'revision must be an integer' })
  }

  return putSiteData(data, {
    revision,
    message: message?.trim() || 'update portfolio content',
  })
})
