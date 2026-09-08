import { getPublicEffectConfig } from '~~/server/utils/effect'

export default defineEventHandler((event) => {
  setHeader(event, 'cache-control', 'public, max-age=60')
  return getPublicEffectConfig()
})
