import { getProjects } from '~~/server/utils/repos'

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'public, max-age=300')
  return await getProjects()
})
