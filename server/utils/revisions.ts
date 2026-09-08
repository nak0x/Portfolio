import { useDb } from './db'

/**
 * Both editable documents (the portfolio content, the home-page effect) use
 * the same shape: one table, one row per revision, newest row wins. This is
 * the bit they share; each caller adds its own normalisation.
 */

export interface Revision<T> {
  data: T
  /** row id; send it back on save so a concurrent edit is refused with a 409 */
  revision: number
  revisedAt: string
  message: string
}

interface Row {
  id: number
  content: string
  message: string
  revised_at: string
}

/** only ever called with the two table names this codebase owns */
type Table = 'site_content' | 'effect_config'

function toRevision<T>(row: Row, normalize: (input: unknown) => T): Revision<T> {
  let parsed: unknown = null
  try {
    parsed = JSON.parse(row.content)
  } catch (error) {
    // the CHECK constraint makes this unreachable, but the seed beats a 500
    console.error(`[db] revision ${row.id} is not valid JSON, using the seed:`, error)
  }
  return { data: normalize(parsed), revision: row.id, revisedAt: row.revised_at, message: row.message }
}

export function latestRevision<T>(table: Table, normalize: (input: unknown) => T): Revision<T> {
  const row = useDb()
    .prepare(`SELECT id, content, message, revised_at FROM ${table} ORDER BY id DESC LIMIT 1`)
    .get() as Row | undefined

  if (!row) {
    // the migration guarantees a first row; if it is gone, that is a real bug
    throw createError({ statusCode: 500, message: `${table} is empty — run the migrations` })
  }
  return toRevision(row, normalize)
}

export function insertRevision<T>(
  table: Table,
  data: T,
  normalize: (input: unknown) => T,
  options: { message: string; revision?: number | null },
): Revision<T> {
  const db = useDb()
  const latest = db.prepare(`SELECT MAX(id) AS id FROM ${table}`).get() as { id: number | null }

  // the client sends the revision it loaded; anything newer means somebody
  // else saved in between (another tab, most likely)
  if (options.revision != null && latest.id != null && options.revision !== latest.id) {
    throw createError({
      statusCode: 409,
      message: 'the content changed since you loaded it — reload and reapply',
    })
  }

  const result = db
    .prepare(`INSERT INTO ${table} (content, message) VALUES (?, ?)`)
    .run(JSON.stringify(data), options.message)

  const row = db
    .prepare(`SELECT id, content, message, revised_at FROM ${table} WHERE id = ?`)
    .get(Number(result.lastInsertRowid)) as Row | undefined

  if (!row) {
    throw createError({ statusCode: 500, message: 'saved revision could not be read back' })
  }
  return toRevision(row, normalize)
}
