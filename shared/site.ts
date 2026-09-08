/**
 * The shape of everything the site says about you.
 *
 * The values below are the *seed*: the first database migration copies them
 * (minus the projects) into the `site_content` table, and after that the
 * database wins — edit it from `/dash`. They are also what a missing or
 * mistyped field falls back to when a stored revision is normalised.
 */

export interface ProjectLink {
  label: string
  href: string
}

export type ProjectStatus = 'active' | 'wip' | 'shipped' | 'archived'

export interface Project {
  name: string
  tagline: string
  /** one line per bullet, keep them short */
  bullets: string[]
  stack: string[]
  year: string
  href: string
  links: ProjectLink[]
  /** shown on the home page */
  featured: boolean
  status: ProjectStatus
  /** keep this repository out of the public list entirely */
  hidden?: boolean
}

export interface SkillGroup {
  label: string
  items: string[]
}

export interface NavItem {
  label: string
  href: string
}

export interface SiteData {
  handle: string
  name: string
  domain: string
  role: string
  company: { name: string; href: string }
  location: string
  timezone: string
  tagline: string
  description: string
  about: string[]
  contactEmail: string
  skills: SkillGroup[]
  links: NavItem[]
  nav: NavItem[]
  projects: Project[]
}

export const PROJECT_STATUSES: ProjectStatus[] = ['active', 'wip', 'shipped', 'archived']

export const defaultSiteData: SiteData = {
  handle: 'nak0x',
  name: 'Théo Lesage',
  domain: 'nak0x.dev',
  role: 'software engineer',
  company: { name: 'Teklia', href: 'https://teklia.com' },
  location: 'Annecy, France',
  timezone: 'Europe/Paris',

  tagline:
    'i write rust for machines that should have been retired, and vue for the ones that were not.',

  description:
    'software engineer in annecy, france. rust, vue/nuxt, and a homelab that runs more than it should. i like small binaries, linux, and making old hardware feel fast again.',

  about: [
    "i'm théo — `nak0x` most places. i build tools for myself first and then find out other people wanted them too.",
    'by day i work at teklia on document understanding infrastructure. by night it is mostly rust, self-hosted things, and shaving megabytes off pages that had no business being megabytes.',
    'i care about software that is small, legible, and survives a laptop from 2009.',
  ],

  contactEmail: 'nak0x@proton.me',

  skills: [
    { label: 'languages', items: ['rust', 'typescript', 'python', 'c#', 'glsl'] },
    { label: 'web', items: ['vue', 'nuxt', 'nitro', 'three.js', 'p5.js'] },
    { label: 'systems', items: ['linux', 'docker', 'coolify', 'gitea', 'nginx'] },
    { label: 'other', items: ['unity', 'shaders', 'iot / embedded', 'neovim'] },
  ],

  links: [
    { label: 'github', href: 'https://github.com/nak0x' },
    { label: 'gitea', href: 'https://git.nak0x.dev/Nak0x' },
    { label: 'email', href: 'mailto:nak0x@proton.me' },
    { label: 'rss', href: '/rss.xml' },
  ],

  nav: [
    { label: 'about', href: '/#about' },
    { label: 'projects', href: '/projects' },
    { label: 'blog', href: '/blog' },
  ],

  projects: [
    {
      name: 'furst',
      tagline: 'browsing the modern web on hardware that cannot run a modern browser.',
      bullets: [
        'a news page is 2–5MB over 80+ requests. the article itself is ~20KB.',
        'extract, proxy, and route media to mpv — keep the engine out of the loop.',
        'built for a core2 duo with 4GB and a minimal arch install.',
      ],
      stack: ['rust', 'http', 'readability'],
      year: '2026',
      href: 'https://git.nak0x.dev/Nak0x/Furst',
      links: [
        { label: 'guide', href: 'https://git.nak0x.dev/Nak0x/Furst/src/branch/master/GUIDE.md' },
      ],
      featured: true,
      status: 'active',
    },
    {
      name: 'faust',
      tagline: 'live markdown preview for obsidian vaults, with the look of a TUI.',
      bullets: [
        'never writes to your vault — you edit in nvim, it re-renders on disk change.',
        'gpu rendering, cold start under a blink.',
      ],
      stack: ['rust', 'wgpu', 'markdown'],
      year: '2026',
      href: 'https://github.com/nak0x/faust',
      links: [],
      featured: true,
      status: 'active',
    },
    {
      name: 'arkindex on coolify',
      tagline: 'a standalone, one-compose deployment of arkindex.',
      bullets: ['self-hosting a document-ml platform without the kubernetes tax.'],
      stack: ['docker', 'coolify', 'python'],
      year: '2026',
      href: 'https://git.nak0x.dev/Nak0x/Standalone-Arkindex-Coolify',
      links: [],
      featured: true,
      status: 'shipped',
    },
    {
      name: 'mycelia',
      tagline: 'an iot mesh that grows the way its namesake does.',
      bullets: [],
      stack: ['python', 'mqtt', 'embedded'],
      year: '2026',
      href: 'https://github.com/nak0x/mycelia-experience',
      links: [{ label: 'v1', href: 'https://github.com/nak0x/Mycelia' }],
      featured: true,
      status: 'active',
    },
    {
      name: 'mundara',
      tagline: 'an immersive AR experience for cultures we forgot.',
      bullets: ['unity + AR foundation, a website, and a very tired team.'],
      stack: ['unity', 'c#', 'vue'],
      year: '2025',
      href: 'https://github.com/nak0x/Mundara',
      links: [{ label: 'site', href: 'https://github.com/nak0x/mundara-website' }],
      featured: false,
      status: 'shipped',
    },
    {
      name: 'dbz-explorer',
      tagline: 'a dragon ball game built on a reusable engine of my own.',
      bullets: [],
      stack: ['python', 'game engine'],
      year: '2024',
      href: 'https://github.com/nak0x/dbz-explorer',
      links: [],
      featured: false,
      status: 'archived',
    },
    {
      name: 'dotfiles',
      tagline: 'neovim, wm, shell — the whole desk.',
      bullets: [],
      stack: ['lua', 'zsh', 'nix-adjacent'],
      year: 'ongoing',
      href: 'https://github.com/nak0x/dotfiles',
      links: [],
      featured: false,
      status: 'active',
    },
    {
      name: 'dither guy',
      tagline: 'graphic dithering for images and video, low-color-depth on purpose.',
      bullets: [],
      stack: ['python', 'pillow'],
      year: '2026',
      href: 'https://github.com/nak0x/dither-guy',
      links: [],
      featured: false,
      status: 'wip',
    },
  ],
}

// --- normalisation ---------------------------------------------------------
// A stored revision is plain JSON that could have come from anywhere. Anything
// missing or mistyped falls back to the seed instead of taking the site down.

const str = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.trim() ? v : fallback

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []

const linkList = (v: unknown): ProjectLink[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => ({ label: str(x.label, ''), href: str(x.href, '') }))
        .filter((x) => x.label && x.href)
    : []

function normalizeProject(input: unknown): Project | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const name = str(raw.name, '')
  if (!name) return null

  const status = raw.status
  return {
    name,
    tagline: str(raw.tagline, ''),
    bullets: strList(raw.bullets),
    stack: strList(raw.stack),
    year: str(raw.year, ''),
    href: str(raw.href, '#'),
    links: linkList(raw.links),
    featured: raw.featured === true,
    hidden: raw.hidden === true,
    status: PROJECT_STATUSES.includes(status as ProjectStatus)
      ? (status as ProjectStatus)
      : 'active',
  }
}

export function normalizeSiteData(input: unknown): SiteData {
  const d = defaultSiteData
  if (!input || typeof input !== 'object') return structuredClone(d)
  const raw = input as Record<string, unknown>

  const company = (raw.company ?? {}) as Record<string, unknown>
  const skills = Array.isArray(raw.skills)
    ? raw.skills
        .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
        .map((g) => ({ label: str(g.label, ''), items: strList(g.items) }))
        .filter((g) => g.label && g.items.length)
    : []

  const projects = Array.isArray(raw.projects)
    ? raw.projects.map((p) => normalizeProject(p)).filter((p): p is Project => p !== null)
    : []

  const about = strList(raw.about)
  const links = linkList(raw.links)
  const nav = linkList(raw.nav)

  return {
    handle: str(raw.handle, d.handle),
    name: str(raw.name, d.name),
    domain: str(raw.domain, d.domain),
    role: str(raw.role, d.role),
    company: {
      name: str(company.name, d.company.name),
      href: str(company.href, d.company.href),
    },
    location: str(raw.location, d.location),
    timezone: str(raw.timezone, d.timezone),
    tagline: str(raw.tagline, d.tagline),
    description: str(raw.description, d.description),
    about: about.length ? about : [...d.about],
    contactEmail: str(raw.contactEmail, d.contactEmail),
    skills: skills.length ? skills : structuredClone(d.skills),
    links: links.length ? links : structuredClone(d.links),
    nav: nav.length ? nav : structuredClone(d.nav),
    // an empty project list is a legitimate choice, so it is not overridden
    projects: Array.isArray(raw.projects) ? projects : structuredClone(d.projects),
  }
}

export const featuredOf = (projects: Project[]): Project[] => projects.filter((p) => p.featured)
