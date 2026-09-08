import { assertDashSession } from '~~/server/utils/dash-auth'
import { getSiteDocument } from '~~/server/utils/site'

export default defineEventHandler(async (event) => {
  assertDashSession(event)
  return await getSiteDocument()
})
