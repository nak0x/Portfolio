import type { Migration } from './types'
import { siteContent } from './001-site-content'
import { effectConfig } from './002-effect-config'

/**
 * Applied in order, once each, at boot. Never edit or reorder an entry that
 * has shipped — add a new one.
 */
export const migrations: Migration[] = [siteContent, effectConfig]
