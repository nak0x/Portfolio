import { normalizeSiteData, defaultSiteData, type SiteData } from '#shared/site'
import { useContentProvider } from './providers'
import { cached, bustCache } from './cache'
import { contentConfig } from './config'

const SITE_KEY = 'site:data'

export interface SiteDocument {
  data: SiteData
  /** blob sha of site.json, or null when the file does not exist yet */
  sha: string | null
  /** false when the repo has no site.json and the built-in seed is in use */
  fromRepo: boolean
}

async function loadSite(): Promise<SiteDocument> {
  const provider = useContentProvider()
  const path = contentConfig().siteFile

  let raw: string
  try {
    raw = await provider.read(path)
  } catch {
    // no site.json in the repo yet — the seed in shared/site.ts is the site
    return { data: structuredClone(defaultSiteData), sha: null, fromRepo: false }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    console.error(`[site] ${path} is not valid JSON, falling back to the seed:`, error)
    return { data: structuredClone(defaultSiteData), sha: null, fromRepo: false }
  }

  const stat = await provider.stat(path).catch(() => null)
  return { data: normalizeSiteData(parsed), sha: stat?.sha ?? null, fromRepo: true }
}

export async function getSiteDocument(): Promise<SiteDocument> {
  return cached(SITE_KEY, contentConfig().ttl, loadSite)
}

export async function getSiteData(): Promise<SiteData> {
  return (await getSiteDocument()).data
}

export function serializeSiteData(data: SiteData): string {
  return `${JSON.stringify(data, null, 2)}\n`
}

export async function putSiteData(
  input: unknown,
  options: { message: string; sha?: string | null },
): Promise<{ sha: string; commit?: string; data: SiteData }> {
  const provider = useContentProvider()
  const path = contentConfig().siteFile
  const data = normalizeSiteData(input)

  // trust the live sha over whatever the client believed, unless the client
  // sent one — then it acts as the optimistic-concurrency check.
  const current = await provider.stat(path).catch(() => null)
  const sha = options.sha === undefined ? current?.sha : (options.sha ?? undefined)

  if (options.sha && current?.sha && options.sha !== current.sha) {
    throw createError({
      statusCode: 409,
      message: 'site.json changed in the repo since you loaded it — reload and reapply',
    })
  }

  const result = await provider.write({
    path,
    content: serializeSiteData(data),
    message: options.message,
    sha,
  })

  bustCache('site:')
  // the project list is built on top of site.json, so it is stale too
  bustCache('projects:')
  return { sha: result.sha, commit: result.commit, data }
}
