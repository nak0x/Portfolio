import { getSiteData } from '~~/server/utils/site'

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'public, max-age=60')
  return await getSiteData()
})
