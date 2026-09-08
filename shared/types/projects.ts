import type { Project } from '../site'

export type ProjectSource = 'github' | 'gitea' | 'manual'

/**
 * A project as the site shows it: a public repository read from a forge,
 * optionally enriched by a matching entry in the portfolio content.
 *
 * `manual` entries are the other way round — a /dash project that has no
 * repository behind it (or whose forge was unreachable).
 */
export interface RepoProject extends Project {
  source: ProjectSource
  /** "owner/name", as the forge reports it */
  fullName: string
  stars: number
  /** ISO date of the last push, '' for manual entries */
  pushedAt: string
  archived: boolean
}

export interface ProjectSourceStatus {
  kind: ProjectSource
  /** the account the repos were read from */
  account: string
  ok: boolean
  count: number
  /** why it failed, when it did */
  error?: string
}

export interface ProjectsPayload {
  projects: RepoProject[]
  /** one row per configured forge, so the page can admit a source is down */
  sources: ProjectSourceStatus[]
}
