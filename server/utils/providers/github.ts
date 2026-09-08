import type {
  ContentProvider,
  ProviderOptions,
  RemoteFile,
  WriteOptions,
  WriteResult,
} from './types'
import { isMarkdown, isNotFound, normalizeDir, splitRepo, toBase64 } from './types'

interface GithubTree {
  tree?: Array<{ path: string; type: 'blob' | 'tree'; sha: string }>
  truncated?: boolean
}

interface GithubFileResponse {
  content?: { sha?: string } | null
  commit?: { sha?: string }
}

export function createGithubProvider(opts: ProviderOptions): ContentProvider {
  const { owner, name } = splitRepo(opts.repo)
  const api = `https://api.github.com/repos/${owner}/${name}`
  const dir = normalizeDir(opts.dir)

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nak0x.dev',
  }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`

  return {
    kind: 'github',
    writable: !!opts.token,

    async list(): Promise<RemoteFile[]> {
      const tree = await $fetch<GithubTree>(
        `${api}/git/trees/${encodeURIComponent(opts.branch)}`,
        { headers, query: { recursive: '1' } },
      )

      if (tree.truncated) {
        console.warn('[github] tree response was truncated — some posts may be missing')
      }

      return (tree.tree ?? [])
        .filter((e) => e.type === 'blob' && isMarkdown(e.path))
        .filter((e) => (dir ? e.path.startsWith(`${dir}/`) : true))
        .map((e) => ({ path: e.path, sha: e.sha }))
    },

    async read(path: string): Promise<string> {
      return await $fetch<string>(`${api}/contents/${encodeURI(path)}`, {
        headers: { ...headers, Accept: 'application/vnd.github.raw' },
        query: { ref: opts.branch },
        responseType: 'text',
      })
    },

    async stat(path: string) {
      try {
        const file = await $fetch<{ sha?: string }>(`${api}/contents/${encodeURI(path)}`, {
          headers,
          query: { ref: opts.branch },
        })
        return file?.sha ? { sha: file.sha } : null
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },

    async write({ path, content, message, sha }: WriteOptions): Promise<WriteResult> {
      const body: Record<string, unknown> = {
        content: toBase64(content),
        message,
        branch: opts.branch,
      }
      if (sha) body.sha = sha

      const res = await $fetch<GithubFileResponse>(`${api}/contents/${encodeURI(path)}`, {
        method: 'PUT',
        headers,
        body,
      })

      return {
        path,
        sha: res?.content?.sha ?? '',
        commit: res?.commit?.sha,
      }
    },

    async remove({ path, message, sha }) {
      await $fetch(`${api}/contents/${encodeURI(path)}`, {
        method: 'DELETE',
        headers,
        body: { message, sha, branch: opts.branch },
      })
    },

    sourceUrl(path: string): string {
      return `https://github.com/${owner}/${name}/blob/${opts.branch}/${encodeURI(path)}`
    },

    assetUrl(path: string): string {
      return `https://raw.githubusercontent.com/${owner}/${name}/${opts.branch}/${encodeURI(path)}`
    },
  }
}
