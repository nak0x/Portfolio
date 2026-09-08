import { assertDashSession } from '~~/server/utils/dash-auth'
import { getIndex } from '~~/server/utils/posts'
import { contentConfig } from '~~/server/utils/config'

/** every post, drafts included, with the sha the editor needs */
export default defineEventHandler(async (event) => {
  assertDashSession(event)

  let index
  try {
    index = await getIndex()
  } catch (error) {
    // the provider surfaces the forge's own status (a 404 for a wrong repo or
    // branch, say). turn it into something that names the actual problem.
    const { provider, repo, branch, giteaUrl } = contentConfig()
    const where = provider === 'gitea' ? `${giteaUrl} ${repo}@${branch}` : `${provider} ${repo}@${branch}`
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`[dash] could not list posts from ${where}:`, error)
    throw createError({
      statusCode: 502,
      message: `could not list posts from ${where}: ${reason}`,
    })
  }

  return {
    posts: index.map((entry) => ({ ...entry.meta, sha: entry.sha })),
  }
})
