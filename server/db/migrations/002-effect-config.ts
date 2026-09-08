import { defaultEffectConfig } from '#shared/effect'
import type { Migration } from './types'

/**
 * Same shape as `site_content`: one row per revision, newest wins. The seed
 * has no image, so the home page draws a procedural ridge until one is
 * uploaded from /dash/effect.
 */
export const effectConfig: Migration = {
  name: '002-effect-config',

  up(db) {
    db.exec(`
      CREATE TABLE effect_config (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        content     TEXT    NOT NULL CHECK (json_valid(content)),
        message     TEXT    NOT NULL DEFAULT '',
        revised_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `)

    db.prepare(`INSERT INTO effect_config (content, message) VALUES (?, ?)`).run(
      JSON.stringify(defaultEffectConfig),
      'initial effect config',
    )
  },
}
