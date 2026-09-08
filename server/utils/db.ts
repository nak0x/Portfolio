import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { migrations } from '../db/migrations'

/**
 * One SQLite file, opened once per process, migrated before it is handed out.
 *
 * `node:sqlite` is synchronous and in-process — no pool, no driver, no native
 * build step. This site has one writer (you, from /dash) and a handful of
 * readers, which is exactly the shape SQLite is happiest with.
 */

let db: DatabaseSync | null = null

export function databasePath(): string {
  const baked = useRuntimeConfig().db
  return resolve(process.cwd(), process.env.DATABASE_PATH || baked.path)
}

export function useDb(): DatabaseSync {
  if (db) return db

  const path = databasePath()
  mkdirSync(dirname(path), { recursive: true })

  const opened = new DatabaseSync(path)
  // WAL lets readers keep going while a save is in flight
  opened.exec('PRAGMA journal_mode = WAL')
  opened.exec('PRAGMA foreign_keys = ON')
  opened.exec('PRAGMA busy_timeout = 5000')

  migrate(opened)
  db = opened
  return db
}

/**
 * Runs every migration that has not been recorded yet, each in its own
 * transaction. A failure throws — the plugin that calls this at boot lets it
 * crash the process, because serving a site against a half-migrated schema is
 * worse than not serving it.
 */
export function migrate(target: DatabaseSync): string[] {
  target.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `)

  const done = new Set(
    (target.prepare('SELECT name FROM migrations').all() as { name: string }[]).map((r) => r.name),
  )
  const record = target.prepare('INSERT INTO migrations (name) VALUES (?)')
  const applied: string[] = []

  for (const migration of migrations) {
    if (done.has(migration.name)) continue

    target.exec('BEGIN')
    try {
      migration.up(target)
      record.run(migration.name)
      target.exec('COMMIT')
    } catch (error) {
      target.exec('ROLLBACK')
      throw new Error(`migration "${migration.name}" failed: ${String(error)}`, { cause: error })
    }

    applied.push(migration.name)
    console.info(`[db] applied migration ${migration.name}`)
  }

  return applied
}

export function closeDb(): void {
  db?.close()
  db = null
}
