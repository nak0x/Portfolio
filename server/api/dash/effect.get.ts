import { assertDashSession } from '~~/server/utils/dash-auth'
import { getEffectDocument } from '~~/server/utils/effect'

export default defineEventHandler((event) => {
  assertDashSession(event)
  return getEffectDocument()
})
