import { assertDashSession } from '~~/server/utils/dash-auth'
import { bustCache } from '~~/server/utils/cache'
import { getIndex } from '~~/server/utils/posts'
import { getSiteDocument } from '~~/server/utils/site'
import { getProjects } from '~~/server/utils/repos'

/** drop everything cached from the content repo and read it again */
export default defineEventHandler(async (event) => {
  assertDashSession(event)

  const cleared = bustCache()
  await Promise.all([getIndex(), getSiteDocument(), getProjects()])

  return { ok: true, cleared }
})
