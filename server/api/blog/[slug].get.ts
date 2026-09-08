import { getNeighbours, getPost } from '~~/server/utils/posts'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'missing slug' })

  const post = await getPost(slug)
  if (!post) throw createError({ statusCode: 404, message: 'post not found' })

  const neighbours = await getNeighbours(slug)
  return { post, ...neighbours }
})
