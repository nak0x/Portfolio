import type { PostMeta } from './blog'
import type { SiteData } from '../site'

export interface DashSession {
  /** false when DASH_PASSWORD is unset — the dashboard is off */
  enabled: boolean
  authenticated: boolean
  /** false when the provider has no write token — posts become read-only */
  writable: boolean
  provider?: string
  repo?: string
  branch?: string
  dir?: string
  ttl?: number
  webhook?: boolean
}

/** one revision of the portfolio content, as stored in sqlite */
export interface SiteDocument {
  data: SiteData
  /** row id; send it back on save so a concurrent edit is refused with a 409 */
  revision: number
  revisedAt: string
  message: string
}

export interface DashPost extends PostMeta {
  sha: string
}

export interface PostFrontmatterInput {
  title: string
  description: string
  date: string
  updated: string
  tags: string[]
  slug: string
  draft: boolean
}

export interface PostDraft {
  path: string
  sha: string
  sourceUrl: string
  frontmatter: PostFrontmatterInput
  body: string
}

export interface SavePayload {
  frontmatter: Partial<PostFrontmatterInput>
  body: string
  message?: string
  /** the sha the editor loaded; omit on create */
  sha?: string
}

export interface SaveResult {
  slug: string
  path: string
  sha: string
  commit?: string
}
