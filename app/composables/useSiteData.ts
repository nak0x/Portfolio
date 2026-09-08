import { defaultSiteData, type SiteData } from '#shared/site'

/**
 * Portfolio content lives in the content repo (`site.json`) so /dash can edit
 * it. The seed compiled into the bundle is the fallback, which means the page
 * still renders if the repo is unreachable.
 *
 * Keyed, so the layout and the page share one fetch.
 */
export function useSiteData() {
  const { data, refresh } = useAsyncData<SiteData>('site', () => $fetch('/api/site'), {
    default: () => defaultSiteData,
  })

  return { site: data, refresh }
}
