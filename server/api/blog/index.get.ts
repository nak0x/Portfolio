import { listPosts, listTags } from '~~/server/utils/posts'

export default defineEventHandler(async (event) => {
  const { tag } = getQuery(event) as { tag?: string }

  try {
    const [posts, tags] = await Promise.all([listPosts({ tag }), listTags()])
    return { posts, tags }
  } catch (error) {
    console.error('[api/blog] failed to list posts:', error)
    throw createError({
      statusCode: 502,
      message: 'the content repository is unreachable',
    })
  }
})
