import { assertDashSession } from '~~/server/utils/dash-auth'
import { getPostDraft } from '~~/server/utils/post-editor'

export default defineEventHandler(async (event) => {
  assertDashSession(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'missing slug' })

  const draft = await getPostDraft(slug)
  if (!draft) throw createError({ statusCode: 404, message: 'post not found' })

  return draft
})
