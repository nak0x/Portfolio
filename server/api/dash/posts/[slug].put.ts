import { assertDashSession } from '~~/server/utils/dash-auth'
import { updatePost } from '~~/server/utils/post-editor'
import type { SavePayload } from '#shared/types/dash'

export default defineEventHandler(async (event) => {
  assertDashSession(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'missing slug' })

  const payload = await readBody<SavePayload>(event)
  return await updatePost(slug, payload)
})
