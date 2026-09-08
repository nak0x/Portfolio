import { defaultSiteData, type SiteData } from '#shared/site'
import type { Migration } from './types'

/**
 * One row per revision of the portfolio content. The newest row *is* the
 * site; older rows are kept as history, and the row id doubles as the
 * optimistic-concurrency token /dash sends back on save.
 *
 * The first row is the seed compiled into `shared/site.ts`, minus the
 * projects: the public list comes from the forges anyway, and the overlay
 * is something you curate from /dash rather than inherit.
 */
export const siteContent: Migration = {
  name: '001-site-content',

  up(db) {
    db.exec(`
      CREATE TABLE site_content (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        content     TEXT    NOT NULL CHECK (json_valid(content)),
        message     TEXT    NOT NULL DEFAULT '',
        revised_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `)

    const initial: SiteData = { ...structuredClone(defaultSiteData), projects: [] }

    db.prepare(`INSERT INTO site_content (content, message) VALUES (?, ?)`).run(
      JSON.stringify(initial),
      'initial content',
    )
  },
}
