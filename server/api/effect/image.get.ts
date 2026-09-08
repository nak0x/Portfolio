import { getEffectImage } from '~~/server/utils/effect'

/** the uploaded source image; `?v=<revision>` in the url makes it cacheable */
export default defineEventHandler((event) => {
  const image = getEffectImage()
  if (!image) throw createError({ statusCode: 404, message: 'no image uploaded' })

  setHeader(event, 'content-type', image.mime)
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return image.bytes
})
