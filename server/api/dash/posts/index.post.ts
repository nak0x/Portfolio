import { assertDashSession } from '~~/server/utils/dash-auth'
import { createPost } from '~~/server/utils/post-editor'
import type { SavePayload } from '#shared/types/dash'

export default defineEventHandler(async (event) => {
  assertDashSession(event)
  const payload = await readBody<SavePayload>(event)
  return await createPost(payload)
})
