import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import type { ContentProvider, ProviderOptions, RemoteFile, WriteOptions, WriteResult } from './types'
import { isMarkdown, normalizeDir } from './types'

/**
 * Reads and writes posts on the local filesystem. Useful for drafting before
 * the repo exists, and for CI where you do not want to hit the network.
 *
 * There is no git here, so "sha" is just a content hash — enough to give the
 * dashboard the same optimistic-concurrency guarantee as the git backends.
 */
export function createLocalProvider(opts: ProviderOptions): ContentProvider {
  // `localDir` stands in for the repo root, so paths look exactly like the git
  // backends': `posts/foo.md`, `site.json`.
  const root = resolve(process.cwd(), opts.localDir)
  const dir = normalizeDir(opts.dir)

  const hash = (content: string) => createHash('sha256').update(content).digest('hex').slice(0, 40)

  function safeResolve(path: string): string {
    const full = resolve(root, path)
    if (full !== root && !full.startsWith(root + sep)) {
      throw new Error(`refusing to touch a path outside ${root}`)
    }
    return full
  }

  async function walk(current: string): Promise<string[]> {
    const entries = await readdir(current, { withFileTypes: true }).catch(() => [])
    const out: string[] = []
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) out.push(...(await walk(full)))
      else if (isMarkdown(entry.name)) out.push(full)
    }
    return out
  }

  const toRepoPath = (full: string) => relative(root, full).split(sep).join('/')

  return {
    kind: 'local',
    writable: true,

    async list(): Promise<RemoteFile[]> {
      const files = await walk(dir ? join(root, dir) : root)
      return await Promise.all(
        files.map(async (full) => ({
          path: toRepoPath(full),
          sha: hash(await readFile(full, 'utf8')),
        })),
      )
    },

    async read(path: string): Promise<string> {
      return await readFile(safeResolve(path), 'utf8')
    },

    async stat(path: string) {
      try {
        return { sha: hash(await readFile(safeResolve(path), 'utf8')) }
      } catch {
        return null
      }
    },

    async write({ path, content }: WriteOptions): Promise<WriteResult> {
      const full = safeResolve(path)
      await mkdir(dirname(full), { recursive: true })
      await writeFile(full, content, 'utf8')
      return { path, sha: hash(content) }
    },

    async remove({ path }) {
      await rm(safeResolve(path), { force: true })
    },

    sourceUrl(path: string): string {
      return `file://${join(root, path)}`
    },

    assetUrl(path: string): string {
      return `/${path}`
    },
  }
}
