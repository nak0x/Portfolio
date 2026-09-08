import type {
  ContentProvider,
  ProviderOptions,
  RemoteFile,
  WriteOptions,
  WriteResult,
} from './types'
import { isMarkdown, isNotFound, normalizeDir, splitRepo, toBase64 } from './types'

interface GiteaTree {
  tree?: Array<{ path: string; type: 'blob' | 'tree'; sha: string }>
  truncated?: boolean
}

interface GiteaContents {
  sha: string
  content?: string
}

interface GiteaFileResponse {
  content?: GiteaContents | null
  commit?: { sha?: string }
}

export function createGiteaProvider(opts: ProviderOptions): ContentProvider {
  const { owner, name } = splitRepo(opts.repo)
  const base = opts.giteaUrl.replace(/\/+$/, '')
  const api = `${base}/api/v1/repos/${owner}/${name}`
  const dir = normalizeDir(opts.dir)

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.token) headers.Authorization = `token ${opts.token}`

  return {
    kind: 'gitea',
    writable: !!opts.token,

    async list(): Promise<RemoteFile[]> {
      const tree = await $fetch<GiteaTree>(
        `${api}/git/trees/${encodeURIComponent(opts.branch)}`,
        { headers, query: { recursive: 'true', per_page: 1000 } },
      )

      if (tree.truncated) {
        console.warn('[gitea] tree response was truncated — some posts may be missing')
      }

      return (tree.tree ?? [])
        .filter((e) => e.type === 'blob' && isMarkdown(e.path))
        .filter((e) => (dir ? e.path.startsWith(`${dir}/`) : true))
        .map((e) => ({ path: e.path, sha: e.sha }))
    },

    async read(path: string): Promise<string> {
      // the raw endpoint returns the file verbatim and honours the token
      return await $fetch<string>(`${api}/raw/${encodeURI(path)}`, {
        headers: opts.token ? { Authorization: `token ${opts.token}` } : {},
        query: { ref: opts.branch },
        responseType: 'text',
      })
    },

    async stat(path: string) {
      try {
        const file = await $fetch<GiteaContents>(`${api}/contents/${encodeURI(path)}`, {
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

      const res = await $fetch<GiteaFileResponse>(`${api}/contents/${encodeURI(path)}`, {
        method: sha ? 'PUT' : 'POST',
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
      return `${base}/${owner}/${name}/src/branch/${opts.branch}/${encodeURI(path)}`
    },

    assetUrl(path: string): string {
      return `${base}/${owner}/${name}/raw/branch/${opts.branch}/${encodeURI(path)}`
    },
  }
}
