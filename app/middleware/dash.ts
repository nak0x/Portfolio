import type { DashSession } from '#shared/types/dash'

/**
 * Guards the editor pages. The real enforcement is server-side on every
 * /api/dash route — this only spares you a page that would 401 on load.
 */
export default defineNuxtRouteMiddleware(async () => {
  const requestFetch = useRequestFetch()
  const session = await requestFetch<DashSession>('/api/dash/session').catch(() => null)

  if (!session?.authenticated) {
    return navigateTo('/dash')
  }
})
