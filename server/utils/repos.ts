/**
 * The project list is the public repositories of the configured github and
 * gitea accounts — not a list anybody maintains by hand.
 *
 * The portfolio content still has a say: an entry there whose `href` or `name` matches a
 * repository *enriches* it (bullets, a nicer name, a status, the featured
 * flag). Entries that match nothing are kept as `manual` projects, so a thing
 * with no repo behind it can still be shown.
 *
 * Both forges are optional and independent: one being down or rate-limited
 * means the other's repos still render, and the failure is reported instead of
 * swallowed.
 */
import type { Project, ProjectStatus } from '#shared/site'
import type {
  ProjectSourceStatus,
  ProjectsPayload,
  RepoProject,
} from '#shared/types/projects'
import { cached } from './cache'
import { projectsConfig, type ProjectsConfig } from './config'
import { getSiteData } from './site'

const PROJECTS_KEY = 'projects:list'

/** a repo pushed to within this many days counts as alive */
const ACTIVE_DAYS = 120

/** the subset of the forge payloads we actually use — both speak it */
interface ForgeRepo {
  name?: string
  full_name?: string
  description?: string | null
  html_url?: string
  homepage?: string | null
  website?: string | null
  language?: string | null
  topics?: string[] | null
  fork?: boolean
  archived?: boolean
  private?: boolean
  stargazers_count?: number
  stars_count?: number
  created_at?: string
  pushed_at?: string
  updated_at?: string
}

// --- forges ----------------------------------------------------------------

async function fetchGithubRepos(cfg: ProjectsConfig): Promise<ForgeRepo[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nak0x.dev',
  }
  if (cfg.githubToken) headers.Authorization = `Bearer ${cfg.githubToken}`

  const out: ForgeRepo[] = []
  for (let page = 1; page <= 10; page++) {
    const batch = await $fetch<ForgeRepo[]>(
      `https://api.github.com/users/${encodeURIComponent(cfg.githubUser)}/repos`,
      { headers, query: { per_page: 100, page, type: 'owner', sort: 'pushed' } },
    )
    if (!Array.isArray(batch) || !batch.length) break
    out.push(...batch)
    if (batch.length < 100) break
  }
  return out
}

async function fetchGiteaRepos(cfg: ProjectsConfig): Promise<ForgeRepo[]> {
  const base = cfg.giteaUrl.replace(/\/+$/, '')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (cfg.giteaToken) headers.Authorization = `token ${cfg.giteaToken}`

  const out: ForgeRepo[] = []
  for (let page = 1; page <= 10; page++) {
    const batch = await $fetch<ForgeRepo[]>(
      `${base}/api/v1/users/${encodeURIComponent(cfg.giteaUser)}/repos`,
      { headers, query: { limit: 50, page } },
    )
    if (!Array.isArray(batch) || !batch.length) break
    out.push(...batch)
    if (batch.length < 50) break
  }
  // a token turns this endpoint into "everything i can see", so filter again
  return out.filter((r) => !r.private)
}

// --- mapping ---------------------------------------------------------------

const yearOf = (iso: string): string => {
  const year = new Date(iso).getFullYear()
  return Number.isFinite(year) ? String(year) : ''
}

function deriveStatus(repo: ForgeRepo, pushedAt: string): ProjectStatus {
  if (repo.archived) return 'archived'
  const age = (Date.now() - Date.parse(pushedAt)) / 86_400_000
  // anything quiet for a while is "done" rather than "abandoned"; /dash can
  // still call it 'wip' if that is closer to the truth
  return Number.isFinite(age) && age <= ACTIVE_DAYS ? 'active' : 'shipped'
}

function toProject(repo: ForgeRepo, source: 'github' | 'gitea'): RepoProject | null {
  const name = repo.name?.trim()
  const href = repo.html_url?.trim()
  if (!name || !href) return null

  const pushedAt = repo.pushed_at || repo.updated_at || repo.created_at || ''
  const site = (repo.homepage || repo.website || '').trim()
  const topics = (repo.topics ?? []).filter((t) => typeof t === 'string' && t.trim())
  const language = repo.language?.trim()

  return {
    name,
    tagline: repo.description?.trim() || '',
    bullets: [],
    // the language first, then whatever topics the repo declares
    stack: [...new Set([language, ...topics].filter((s): s is string => !!s))].slice(0, 5),
    year: yearOf(repo.created_at || pushedAt),
    href,
    links: site && site !== href ? [{ label: 'site', href: site }] : [],
    featured: false,
    status: deriveStatus(repo, pushedAt),
    source,
    fullName: repo.full_name?.trim() || name,
    stars: repo.stargazers_count ?? repo.stars_count ?? 0,
    pushedAt,
    archived: repo.archived === true,
  }
}

// --- portfolio overrides ---------------------------------------------------

const normalizeHref = (href: string): string =>
  href.trim().toLowerCase().replace(/\.git$/, '').replace(/\/+$/, '')

/** the /dash entry wins wherever it actually says something */
function enrich(base: RepoProject, override: Project): RepoProject {
  return {
    ...base,
    name: override.name || base.name,
    tagline: override.tagline || base.tagline,
    bullets: override.bullets.length ? override.bullets : base.bullets,
    stack: override.stack.length ? override.stack : base.stack,
    year: override.year || base.year,
    links: override.links.length ? override.links : base.links,
    featured: override.featured,
    hidden: override.hidden,
    // `status` is never absent after normalisation, so it always overrides
    status: override.status,
  }
}

function asManual(project: Project): RepoProject {
  return {
    ...project,
    source: 'manual',
    fullName: project.name,
    stars: 0,
    pushedAt: '',
    archived: project.status === 'archived',
  }
}

// --- assembly --------------------------------------------------------------

const rank: Record<ProjectStatus, number> = { active: 0, wip: 1, shipped: 2, archived: 3 }

function sortProjects(projects: RepoProject[]): RepoProject[] {
  return projects.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      Number(b.featured) - Number(a.featured) ||
      (Date.parse(b.pushedAt) || 0) - (Date.parse(a.pushedAt) || 0) ||
      b.stars - a.stars ||
      a.name.localeCompare(b.name),
  )
}

async function readSource(
  kind: 'github' | 'gitea',
  account: string,
  cfg: ProjectsConfig,
  load: () => Promise<ForgeRepo[]>,
): Promise<{ status: ProjectSourceStatus; projects: RepoProject[] }> {
  if (!account) {
    return { status: { kind, account: '', ok: true, count: 0 }, projects: [] }
  }

  try {
    const repos = await load()
    const projects = repos
      .filter((r) => !r.private)
      .filter((r) => cfg.includeForks || !r.fork)
      .filter(
        (r) =>
          !cfg.exclude.includes((r.name ?? '').toLowerCase()) &&
          !cfg.exclude.includes((r.full_name ?? '').toLowerCase()),
      )
      .map((r) => toProject(r, kind))
      .filter((p): p is RepoProject => p !== null)

    return { status: { kind, account, ok: true, count: projects.length }, projects }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[projects] ${kind} (${account}) failed:`, message)
    return {
      status: { kind, account, ok: false, count: 0, error: message },
      projects: [],
    }
  }
}

async function loadProjects(): Promise<ProjectsPayload> {
  const cfg = projectsConfig()

  const [github, gitea, site] = await Promise.all([
    readSource('github', cfg.githubUser, cfg, () => fetchGithubRepos(cfg)),
    readSource('gitea', cfg.giteaUser, cfg, () => fetchGiteaRepos(cfg)),
    Promise.resolve(getSiteData()),
  ])

  // same repo mirrored on both forges: github is the public-facing one
  const byKey = new Map<string, RepoProject>()
  for (const project of [...github.projects, ...gitea.projects]) {
    const key = project.name.toLowerCase()
    if (!byKey.has(key)) byKey.set(key, project)
  }

  const byHref = new Map<string, Project>()
  const byName = new Map<string, Project>()
  for (const project of site.projects) {
    const href = normalizeHref(project.href)
    if (href) byHref.set(href, project)
    const name = project.name.trim().toLowerCase()
    if (name && !byName.has(name)) byName.set(name, project)
  }

  // urls first: a url names exactly one repo, where a name can match several
  // (`mycelia` and `mycelia-experience` both answer to "mycelia")
  const used = new Set<Project>()
  const matched = [...byKey.values()].map((repo) => {
    const override = byHref.get(normalizeHref(repo.href)) ?? null
    if (override) used.add(override)
    return { repo, override }
  })

  const projects = matched.map(({ repo, override }) => {
    if (override) return enrich(repo, override)
    // fall back to the name, but never let one entry claim a second repo
    const byname = byName.get(repo.name.toLowerCase())
    if (!byname || used.has(byname)) return repo
    used.add(byname)
    return enrich(repo, byname)
  })

  // things with no repository behind them (or whose forge is down) still count
  const orphans = site.projects.filter((p) => !used.has(p)).map(asManual)

  return {
    projects: sortProjects([...projects, ...orphans].filter((p) => !p.hidden)),
    sources: [github.status, gitea.status].filter((s) => s.account),
  }
}

export async function getProjects(): Promise<ProjectsPayload> {
  return cached(PROJECTS_KEY, projectsConfig().ttl, loadProjects)
}
