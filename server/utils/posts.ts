import matter from 'gray-matter'
import { dirname, join, normalize } from 'node:path/posix'
import type { Post, PostMeta } from '#shared/types/blog'
import { useContentProvider } from './providers'
import { renderMarkdown } from './markdown'
import { cached } from './cache'

const INDEX_KEY = 'posts:index'
const postKey = (slug: string) => `posts:post:${slug}`

interface IndexEntry {
  meta: PostMeta
  path: string
  /** blob sha, for optimistic concurrency when editing from /dash */
  sha: string
}

function ttl(): number {
  return contentConfig().ttl
}

function showDrafts(): boolean {
  return process.env.SHOW_DRAFTS === 'true' || import.meta.dev
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** `2026-09-08-hello-world.md` -> `hello-world` */
function slugFromPath(path: string): string {
  const base = path.split('/').pop() ?? path
  return slugify(base.replace(/\.mdx?$/i, '').replace(/^\d{4}-\d{2}-\d{2}[-_]/, ''))
}

function dateFromPath(path: string): string | null {
  const match = /(\d{4}-\d{2}-\d{2})/.exec(path.split('/').pop() ?? '')
  return match?.[1] ?? null
}

function toIso(value: unknown, fallback: string): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString()
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!Number.isNaN(d.valueOf())) return d.toISOString()
  }
  return fallback
}

function toTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
  if (typeof value === 'string') {
    return value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  }
  return []
}

/** first paragraph of the body, for posts without a `description:` */
function excerpt(body: string, max = 180): string {
  const text = body
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length <= max) return text
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`
}

function parse(path: string, raw: string): { meta: PostMeta; body: string } {
  const provider = useContentProvider()
  const { data, content } = matter(raw)

  const fallbackDate = dateFromPath(path) ?? '1970-01-01'
  const words = content.split(/\s+/).filter(Boolean).length

  const meta: PostMeta = {
    slug: String(data.slug || slugFromPath(path)),
    title: String(data.title || slugFromPath(path).replace(/-/g, ' ')),
    description: String(data.description || data.summary || excerpt(content)),
    date: toIso(data.date, new Date(fallbackDate).toISOString()),
    updated: data.updated ? toIso(data.updated, '') || undefined : undefined,
    tags: toTags(data.tags),
    draft: data.draft === true || data.published === false,
    readingTime: Math.max(1, Math.ceil(words / 200)),
    path,
    sourceUrl: provider.sourceUrl(path),
  }

  return { meta, body: content }
}

async function loadIndex(): Promise<IndexEntry[]> {
  const provider = useContentProvider()
  const files = await provider.list()

  const entries = await Promise.all(
    files.map(async (file) => {
      try {
        const raw = await provider.read(file.path)
        const { meta } = parse(file.path, raw)
        return { meta, path: meta.path, sha: file.sha ?? '' }
      } catch (error) {
        console.error(`[posts] could not read ${file.path}:`, error)
        return null
      }
    }),
  )

  return entries
    .filter((e): e is IndexEntry => e !== null)
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date))
}

export async function getIndex(): Promise<IndexEntry[]> {
  return cached(INDEX_KEY, ttl(), loadIndex)
}

/** the index row for a slug — path and sha included, for the editor */
export async function findEntry(slug: string): Promise<IndexEntry | null> {
  return (await getIndex()).find((e) => e.meta.slug === slug) ?? null
}

export { parse as parsePost }
export type { IndexEntry }

export async function listPosts(
  options: { tag?: string; includeDrafts?: boolean } = {},
): Promise<PostMeta[]> {
  const index = await getIndex()
  const drafts = options.includeDrafts ?? showDrafts()

  return index
    .map((e) => e.meta)
    .filter((m) => drafts || !m.draft)
    .filter((m) => !options.tag || m.tags.includes(options.tag.toLowerCase()))
}

export async function listTags(): Promise<Array<{ tag: string; count: number }>> {
  const posts = await listPosts()
  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export async function getPost(slug: string): Promise<Post | null> {
  const index = await getIndex()
  const entry = index.find((e) => e.meta.slug === slug)
  if (!entry) return null
  if (entry.meta.draft && !showDrafts()) return null

  return cached(postKey(slug), ttl(), async () => {
    const provider = useContentProvider()
    const raw = await provider.read(entry.path)
    const { meta, body } = parse(entry.path, raw)

    const baseDir = dirname(entry.path)
    const { html, toc, readingTime } = await renderMarkdown(body, {
      resolveAsset: (src) => provider.assetUrl(normalize(join(baseDir, src))),
    })

    return { ...meta, html, toc, readingTime }
  })
}

/** previous / next in reverse-chronological order */
export async function getNeighbours(slug: string): Promise<{
  previous: PostMeta | null
  next: PostMeta | null
}> {
  const posts = await listPosts()
  const i = posts.findIndex((p) => p.slug === slug)
  if (i === -1) return { previous: null, next: null }
  return {
    previous: posts[i + 1] ?? null, // older
    next: posts[i - 1] ?? null, // newer
  }
}
