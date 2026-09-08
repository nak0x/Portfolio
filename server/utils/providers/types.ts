export interface RemoteFile {
  /** path relative to the repo root */
  path: string
  sha?: string
}

export interface WriteOptions {
  path: string
  content: string
  message: string
  /** blob sha of the version you are replacing; omit to create */
  sha?: string
}

export interface WriteResult {
  path: string
  /** blob sha of the version that now exists */
  sha: string
  /** commit sha, when the backend reports one */
  commit?: string
}

export interface ContentProvider {
  readonly kind: string
  /** false when no token is configured — /dash stays read-only */
  readonly writable: boolean
  /** every markdown file under the configured directory */
  list(): Promise<RemoteFile[]>
  /** raw utf-8 contents of one file */
  read(path: string): Promise<string>
  /** blob sha of one file, or null when it does not exist */
  stat(path: string): Promise<{ sha: string } | null>
  /** create (no sha) or replace (with sha) a file, as one commit */
  write(options: WriteOptions): Promise<WriteResult>
  /** delete a file, as one commit */
  remove(options: { path: string; message: string; sha: string }): Promise<void>
  /** human-facing url of the file, for a "view source" link */
  sourceUrl(path: string): string
  /** url that serves a raw asset, used to rewrite relative images */
  assetUrl(path: string): string
}

export interface ProviderOptions {
  repo: string
  branch: string
  dir: string
  token: string
  giteaUrl: string
  localDir: string
}

export function splitRepo(repo: string): { owner: string; name: string } {
  const [owner, name] = repo.split('/')
  if (!owner || !name) {
    throw new Error(`CONTENT_REPO must look like "owner/repo", got "${repo}"`)
  }
  return { owner, name }
}

/** posts/foo/bar.md + dir "posts" -> "foo/bar" */
export function normalizeDir(dir: string): string {
  return dir.replace(/^\/+|\/+$/g, '')
}

export function isMarkdown(path: string): boolean {
  return /\.mdx?$/i.test(path)
}

export function toBase64(content: string): string {
  return Buffer.from(content, 'utf8').toString('base64')
}

/** the provider needs a token to commit; say so with a useful message */
export function assertWritable(provider: ContentProvider): void {
  if (!provider.writable) {
    throw createError({
      statusCode: 503,
      message: `the ${provider.kind} provider has no write token — set CONTENT_TOKEN`,
    })
  }
}

/** $fetch throws on 404; treat that as "absent" rather than an error */
export function isNotFound(error: unknown): boolean {
  return (error as { statusCode?: number })?.statusCode === 404
}
