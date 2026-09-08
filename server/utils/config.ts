/**
 * Nuxt only overrides runtimeConfig from `NUXT_`-prefixed variables, and the
 * `process.env.X` fallbacks written in `nuxt.config.ts` are frozen at build
 * time. That is a bad fit for Coolify, where you set plain `CONTENT_*` vars on
 * an already-built image — so read them here, at request time, and fall back to
 * whatever the build baked in.
 */
export interface ContentConfig {
  provider: string
  repo: string
  branch: string
  dir: string
  giteaUrl: string
  token: string
  ttl: number
  webhookSecret: string
  localDir: string
  siteFile: string
}

export interface ProjectsConfig {
  githubUser: string
  giteaUser: string
  giteaUrl: string
  githubToken: string
  giteaToken: string
  exclude: string[]
  includeForks: boolean
  ttl: number
}

export interface DashConfig {
  password: string
  sessionSecret: string
  sessionHours: number
}

export function contentConfig(): ContentConfig {
  const baked = useRuntimeConfig().content
  const env = process.env

  return {
    provider: env.CONTENT_PROVIDER || baked.provider,
    repo: env.CONTENT_REPO || baked.repo,
    branch: env.CONTENT_BRANCH || baked.branch,
    dir: env.CONTENT_DIR ?? baked.dir,
    giteaUrl: env.GITEA_URL || baked.giteaUrl,
    token: env.CONTENT_TOKEN || baked.token,
    ttl: Number(env.CONTENT_TTL || baked.ttl) || 600,
    webhookSecret: env.CONTENT_WEBHOOK_SECRET || baked.webhookSecret,
    localDir: env.CONTENT_LOCAL_DIR || baked.localDir,
    siteFile: env.CONTENT_SITE_FILE || baked.siteFile,
  }
}

export function projectsConfig(): ProjectsConfig {
  const baked = useRuntimeConfig().projects
  const env = process.env
  const content = contentConfig()

  return {
    githubUser: env.PROJECTS_GITHUB_USER ?? baked.githubUser,
    giteaUser: env.PROJECTS_GITEA_USER ?? baked.giteaUser,
    // no dedicated instance configured => reuse the content repo's
    giteaUrl: env.PROJECTS_GITEA_URL || baked.giteaUrl || content.giteaUrl,
    githubToken: env.PROJECTS_GITHUB_TOKEN || baked.githubToken,
    // the content token only helps here if it belongs to the same instance
    giteaToken:
      env.PROJECTS_GITEA_TOKEN ||
      baked.giteaToken ||
      (content.provider === 'gitea' ? content.token : ''),
    exclude: (env.PROJECTS_EXCLUDE ?? baked.exclude)
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    includeForks: env.PROJECTS_INCLUDE_FORKS
      ? env.PROJECTS_INCLUDE_FORKS === 'true'
      : baked.includeForks,
    ttl: Number(env.PROJECTS_TTL || baked.ttl) || 900,
  }
}

export function dashConfig(): DashConfig {
  const baked = useRuntimeConfig().dash
  const env = process.env

  return {
    password: env.DASH_PASSWORD || baked.password,
    sessionSecret: env.DASH_SESSION_SECRET || baked.sessionSecret,
    sessionHours: Number(env.DASH_SESSION_HOURS || baked.sessionHours) || 168,
  }
}
