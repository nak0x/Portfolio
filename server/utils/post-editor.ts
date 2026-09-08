import matter from 'gray-matter'
import type { PostDraft, PostFrontmatterInput, SavePayload } from '#shared/types/dash'
import { useContentProvider } from './providers'
import { assertWritable } from './providers/types'
import { contentConfig } from './config'
import { bustCache } from './cache'
import { findEntry, getIndex, slugify } from './posts'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const today = () => new Date().toISOString().slice(0, 10)

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim().toLowerCase()).filter(Boolean)
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)
  }
  return []
}

function asDate(value: unknown, fallback: string): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10)
  }
  const text = String(value ?? '').trim()
  if (DATE_RE.test(text)) return text
  if (text) {
    const parsed = new Date(text)
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10)
  }
  return fallback
}

/** what the editor sends -> what actually goes in the file */
function cleanFrontmatter(
  input: Partial<PostFrontmatterInput>,
  fallbackSlug: string,
): PostFrontmatterInput {
  const title = String(input.title ?? '').trim()
  if (!title) {
    throw createError({ statusCode: 422, message: 'a post needs a title' })
  }

  const slug = slugify(String(input.slug ?? '').trim() || title) || fallbackSlug
  if (!slug) {
    throw createError({ statusCode: 422, message: 'could not derive a slug from that title' })
  }

  return {
    title,
    description: String(input.description ?? '').trim(),
    date: asDate(input.date, today()),
    updated: input.updated ? asDate(input.updated, '') : '',
    tags: asStringList(input.tags),
    slug,
    draft: input.draft === true,
  }
}

/** drop empty fields so the file stays readable */
function serialize(frontmatter: PostFrontmatterInput, body: string): string {
  const data: Record<string, unknown> = {
    title: frontmatter.title,
    date: frontmatter.date,
    slug: frontmatter.slug,
  }
  if (frontmatter.description) data.description = frontmatter.description
  if (frontmatter.updated) data.updated = frontmatter.updated
  if (frontmatter.tags.length) data.tags = frontmatter.tags
  if (frontmatter.draft) data.draft = true

  return matter.stringify(`${body.trimEnd()}\n`, data)
}

export async function getPostDraft(slug: string): Promise<PostDraft | null> {
  const entry = await findEntry(slug)
  if (!entry) return null

  const provider = useContentProvider()
  const raw = await provider.read(entry.path)
  const { data, content } = matter(raw)

  return {
    path: entry.path,
    sha: entry.sha,
    sourceUrl: provider.sourceUrl(entry.path),
    frontmatter: {
      title: String(data.title ?? entry.meta.title),
      description: String(data.description ?? data.summary ?? ''),
      date: asDate(data.date, entry.meta.date.slice(0, 10)),
      updated: data.updated ? asDate(data.updated, '') : '',
      tags: asStringList(data.tags),
      slug: entry.meta.slug,
      draft: data.draft === true || data.published === false,
    },
    body: content.replace(/^\n+/, ''),
  }
}

export async function createPost(payload: SavePayload) {
  const provider = useContentProvider()
  assertWritable(provider)

  const frontmatter = cleanFrontmatter(payload.frontmatter, '')
  const dir = contentConfig().dir.replace(/^\/+|\/+$/g, '')
  const path = `${dir ? `${dir}/` : ''}${frontmatter.date}-${frontmatter.slug}.md`

  const index = await getIndex()
  if (index.some((e) => e.meta.slug === frontmatter.slug)) {
    throw createError({ statusCode: 409, message: `a post already uses the slug "${frontmatter.slug}"` })
  }
  if (await provider.stat(path)) {
    throw createError({ statusCode: 409, message: `${path} already exists in the repo` })
  }

  const result = await provider.write({
    path,
    content: serialize(frontmatter, payload.body ?? ''),
    message: payload.message?.trim() || `post: add ${frontmatter.slug}`,
  })

  bustCache('posts:')
  return { slug: frontmatter.slug, path, sha: result.sha, commit: result.commit }
}

export async function updatePost(slug: string, payload: SavePayload) {
  const provider = useContentProvider()
  assertWritable(provider)

  const entry = await findEntry(slug)
  if (!entry) throw createError({ statusCode: 404, message: 'post not found' })

  const frontmatter = cleanFrontmatter(payload.frontmatter, slug)

  // the file keeps its path even when the slug changes — the `slug:` field is
  // what drives the url, so renaming never orphans a commit history.
  const live = await provider.stat(entry.path)
  if (payload.sha && live?.sha && payload.sha !== live.sha) {
    throw createError({
      statusCode: 409,
      message: 'this post changed in the repo since you opened it — reload and reapply',
    })
  }

  if (frontmatter.slug !== slug) {
    const clash = (await getIndex()).find(
      (e) => e.meta.slug === frontmatter.slug && e.path !== entry.path,
    )
    if (clash) {
      throw createError({ statusCode: 409, message: `the slug "${frontmatter.slug}" is taken` })
    }
  }

  const result = await provider.write({
    path: entry.path,
    content: serialize(frontmatter, payload.body ?? ''),
    message: payload.message?.trim() || `post: update ${frontmatter.slug}`,
    sha: live?.sha ?? entry.sha,
  })

  bustCache('posts:')
  return { slug: frontmatter.slug, path: entry.path, sha: result.sha, commit: result.commit }
}

export async function deletePost(slug: string, message?: string) {
  const provider = useContentProvider()
  assertWritable(provider)

  const entry = await findEntry(slug)
  if (!entry) throw createError({ statusCode: 404, message: 'post not found' })

  const live = await provider.stat(entry.path)
  await provider.remove({
    path: entry.path,
    message: message?.trim() || `post: remove ${slug}`,
    sha: live?.sha ?? entry.sha,
  })

  bustCache('posts:')
  return { slug, path: entry.path }
}
