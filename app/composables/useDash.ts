import type { DashSession } from '#shared/types/dash'

export const EMPTY_SESSION: DashSession = {
  enabled: true,
  authenticated: false,
  writable: false,
}

export async function dashLogin(password: string): Promise<void> {
  await $fetch('/api/dash/login', { method: 'POST', body: { password } })
}

export async function dashLogout(): Promise<void> {
  await $fetch('/api/dash/logout', { method: 'POST' })
}

/** turn an h3 error into something worth showing a human */
export function errorText(error: unknown, fallback = 'something went wrong'): string {
  const e = error as {
    data?: { statusMessage?: string; message?: string }
    statusMessage?: string
    message?: string
  }
  return (
    e?.data?.message || e?.data?.statusMessage || e?.message || e?.statusMessage || fallback
  )
}
