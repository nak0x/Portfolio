import { clearDashSession } from '~~/server/utils/dash-auth'

export default defineEventHandler((event) => {
  clearDashSession(event)
  return { ok: true }
})
