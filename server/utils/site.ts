import { normalizeSiteData, type SiteData } from '#shared/site'
import type { SiteDocument } from '#shared/types/dash'
import { bustCache } from './cache'
import { useDb } from './db'

/**
 * The portfolio content lives in SQLite, one row per revision (see the
 * `001-site-content` migration). The newest row is what the site shows.
 */

interface Row {
  id: number
  content: string
  message: string
  revised_at: string
}

function toDocument(row: Row): SiteDocument {
  let parsed: unknown = null
  try {
    parsed = JSON.parse(row.content)
  } catch (error) {
    // the CHECK constraint makes this unreachable, but the seed is a better
    // answer than a 500 if it ever happens
    console.error(`[site] revision ${row.id} is not valid JSON, using the seed:`, error)
  }
  return {
    data: normalizeSiteData(parsed),
    revision: row.id,
    revisedAt: row.revised_at,
    message: row.message,
  }
}

export function getSiteDocument(): SiteDocument {
  const row = useDb()
    .prepare('SELECT id, content, message, revised_at FROM site_content ORDER BY id DESC LIMIT 1')
    .get() as Row | undefined

  if (!row) {
    // the migration guarantees a first row; if it is gone, that is a real bug
    throw createError({ statusCode: 500, message: 'site_content is empty — run the migrations' })
  }
  return toDocument(row)
}

export function getSiteData(): SiteData {
  return getSiteDocument().data
}

export function putSiteData(
  input: unknown,
  options: { message: string; revision?: number | null },
): SiteDocument {
  const db = useDb()
  const data = normalizeSiteData(input)

  const latest = db.prepare('SELECT MAX(id) AS id FROM site_content').get() as { id: number | null }

  // the client sends the revision it loaded; anything newer means somebody
  // else saved in between (another tab, most likely)
  if (options.revision != null && latest.id != null && options.revision !== latest.id) {
    throw createError({
      statusCode: 409,
      message: 'the content changed since you loaded it — reload and reapply',
    })
  }

  const result = db
    .prepare('INSERT INTO site_content (content, message) VALUES (?, ?)')
    .run(JSON.stringify(data), options.message)

  const row = db
    .prepare('SELECT id, content, message, revised_at FROM site_content WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as Row | undefined

  if (!row) {
    throw createError({ statusCode: 500, message: 'saved revision could not be read back' })
  }

  // the project list is built on top of the content, so it is stale now
  bustCache('projects:')
  return toDocument(row)
}
