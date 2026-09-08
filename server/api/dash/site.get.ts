import { assertDashSession } from '~~/server/utils/dash-auth'
import { getSiteDocument } from '~~/server/utils/site'

export default defineEventHandler((event) => {
  assertDashSession(event)
  return getSiteDocument()
})
