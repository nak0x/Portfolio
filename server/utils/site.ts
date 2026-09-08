import { normalizeSiteData, type SiteData } from '#shared/site'
import type { SiteDocument } from '#shared/types/dash'
import { bustCache } from './cache'
import { insertRevision, latestRevision } from './revisions'

/**
 * The portfolio content lives in SQLite, one row per revision (see the
 * `001-site-content` migration). The newest row is what the site shows.
 */

export function getSiteDocument(): SiteDocument {
  return latestRevision('site_content', normalizeSiteData)
}

export function getSiteData(): SiteData {
  return getSiteDocument().data
}

export function putSiteData(
  input: unknown,
  options: { message: string; revision?: number | null },
): SiteDocument {
  const doc = insertRevision('site_content', normalizeSiteData(input), normalizeSiteData, options)
  // the project list is built on top of the content, so it is stale now
  bustCache('projects:')
  return doc
}
