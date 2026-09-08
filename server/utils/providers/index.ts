import type { ContentProvider, ProviderOptions } from './types'
import { createGiteaProvider } from './gitea'
import { createGithubProvider } from './github'
import { createLocalProvider } from './local'

let cachedProvider: ContentProvider | null = null

export function useContentProvider(): ContentProvider {
  if (cachedProvider) return cachedProvider

  const content = contentConfig()
  const opts: ProviderOptions = {
    repo: content.repo,
    branch: content.branch,
    dir: content.dir,
    token: content.token,
    giteaUrl: content.giteaUrl,
    localDir: content.localDir,
  }

  switch (content.provider) {
    case 'github':
      cachedProvider = createGithubProvider(opts)
      break
    case 'local':
      cachedProvider = createLocalProvider(opts)
      break
    case 'gitea':
      cachedProvider = createGiteaProvider(opts)
      break
    default:
      throw new Error(
        `unknown CONTENT_PROVIDER "${content.provider}" — expected gitea, github or local`,
      )
  }

  return cachedProvider
}

export function resetContentProvider(): void {
  cachedProvider = null
}
