import { databasePath, useDb, closeDb } from '../utils/db'

/**
 * Open and migrate the database before the first request. `useDb()` would do
 * it lazily anyway, but doing it here means a broken migration fails the
 * deploy loudly instead of 500ing the first visitor.
 */
export default defineNitroPlugin((nitro) => {
  useDb()
  console.info(`[db] ready at ${databasePath()}`)
  nitro.hooks.hook('close', closeDb)
})
