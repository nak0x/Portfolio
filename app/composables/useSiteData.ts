import { defaultSiteData, type SiteData } from '#shared/site'

/**
 * Portfolio content lives in the sqlite database so /dash can edit it. The
 * seed compiled into the bundle is the fallback while the fetch is in flight.
 *
 * Keyed, so the layout and the page share one fetch.
 */
export function useSiteData() {
  const { data, refresh } = useAsyncData<SiteData>('site', () => $fetch('/api/site'), {
    default: () => defaultSiteData,
  })

  return { site: data, refresh }
}
