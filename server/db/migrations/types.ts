import type { DatabaseSync } from 'node:sqlite'

export interface Migration {
  /** unique, stable — it is what gets recorded in the `migrations` table */
  name: string
  /** runs inside a transaction; throw to abort the whole boot */
  up(db: DatabaseSync): void
}
