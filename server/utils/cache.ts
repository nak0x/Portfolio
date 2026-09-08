/**
 * A tiny stale-while-revalidate cache.
 *
 * The blog lives in a git repo we do not own the request cycle of, so:
 *  - fresh entries are served straight away
 *  - stale entries are served immediately and refreshed in the background
 *  - if the refresh fails we keep serving the stale copy rather than 500ing
 *  - the webhook calls `bustCache()` so a push shows up without a redeploy
 */

interface Entry<T> {
  value: T
  storedAt: number
}

const store = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const ttl = Math.max(0, ttlSeconds) * 1000
  const hit = store.get(key) as Entry<T> | undefined
  const isFresh = hit && Date.now() - hit.storedAt < ttl

  if (hit && isFresh) return hit.value

  const refresh = () => {
    const running = inflight.get(key) as Promise<T> | undefined
    if (running) return running

    const p = load()
      .then((value) => {
        store.set(key, { value, storedAt: Date.now() })
        return value
      })
      .finally(() => inflight.delete(key))

    inflight.set(key, p)
    return p
  }

  // nothing cached yet — we have to wait
  if (!hit) return refresh()

  // stale: hand back the old copy, warm the new one behind it
  refresh().catch((error) => {
    console.error(`[cache] background refresh of "${key}" failed:`, error)
  })

  return hit.value
}

export function bustCache(prefix?: string): number {
  if (!prefix) {
    const n = store.size
    store.clear()
    return n
  }

  let n = 0
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key)
      n++
    }
  }
  return n
}

export function cacheKeys(): string[] {
  return [...store.keys()]
}
