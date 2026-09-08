import { assertDashSession } from '~~/server/utils/dash-auth'
import { bustCache } from '~~/server/utils/cache'
import { getIndex } from '~~/server/utils/posts'
import { getProjects } from '~~/server/utils/repos'

/** drop everything cached from the content repo and read it again */
export default defineEventHandler(async (event) => {
  assertDashSession(event)

  const cleared = bustCache()

  // warm both again; a broken post source is reported, not fatal
  const [posts] = await Promise.allSettled([getIndex(), getProjects()])
  const postsError =
    posts.status === 'rejected'
      ? posts.reason instanceof Error
        ? posts.reason.message
        : String(posts.reason)
      : null

  return { ok: true, cleared, postsError }
})
