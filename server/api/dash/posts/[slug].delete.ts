import { assertDashSession } from '~~/server/utils/dash-auth'
import { deletePost } from '~~/server/utils/post-editor'

export default defineEventHandler(async (event) => {
  assertDashSession(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'missing slug' })

  const body = await readBody<{ message?: string }>(event).catch(() => null)
  return await deletePost(slug, body?.message)
})
