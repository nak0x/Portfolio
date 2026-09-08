import { assertDashSession } from '~~/server/utils/dash-auth'
import { getIndex } from '~~/server/utils/posts'

/** every post, drafts included, with the sha the editor needs */
export default defineEventHandler(async (event) => {
  assertDashSession(event)

  const index = await getIndex()
  return {
    posts: index.map((entry) => ({ ...entry.meta, sha: entry.sha })),
  }
})
