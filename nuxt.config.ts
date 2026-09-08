export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },
  ssr: true,

  future: { compatibilityVersion: 4 },

  css: ['~/assets/css/main.css'],

  nitro: {
    preset: 'node-server',
    compressPublicAssets: true,
  },

  runtimeConfig: {
    // --- blog source (server only) ---------------------------------------
    content: {
      // 'gitea' | 'github' | 'local'
      provider: process.env.CONTENT_PROVIDER || 'gitea',
      // "owner/repo"
      repo: process.env.CONTENT_REPO || 'Nak0x/Journal',
      branch: process.env.CONTENT_BRANCH || 'main',
      // sub-directory inside the repo holding the .md files
      dir: process.env.CONTENT_DIR || 'posts',
      // base url of the gitea instance (ignored for github)
      giteaUrl: process.env.GITEA_URL || 'https://git.nak0x.dev',
      // optional PAT — only needed for private repos / gh rate-limits
      token: process.env.CONTENT_TOKEN || '',
      // cache lifetime in seconds; the webhook busts it early
      ttl: Number(process.env.CONTENT_TTL || 600),
      // shared secret for the gitea/github webhook
      webhookSecret: process.env.CONTENT_WEBHOOK_SECRET || '',
      // folder used when provider === 'local' (handy for writing offline)
      localDir: process.env.CONTENT_LOCAL_DIR || 'content',
      // portfolio data (bio, skills, links, projects), edited from /dash.
      // relative to the repo root, not to CONTENT_DIR.
      siteFile: process.env.CONTENT_SITE_FILE || 'site.json',
    },

    // --- projects: public repos, read from the forges ---------------------
    projects: {
      // account names; leave one empty to switch that source off
      githubUser: process.env.PROJECTS_GITHUB_USER || 'nak0x',
      giteaUser: process.env.PROJECTS_GITEA_USER || 'Nak0x',
      // defaults to the gitea instance the content repo lives on
      giteaUrl: process.env.PROJECTS_GITEA_URL || '',
      // optional PATs — mostly to escape github's 60/h anonymous rate limit
      githubToken: process.env.PROJECTS_GITHUB_TOKEN || '',
      giteaToken: process.env.PROJECTS_GITEA_TOKEN || '',
      // comma-separated; matches "name" or "owner/name"
      exclude: process.env.PROJECTS_EXCLUDE || '',
      // forks are somebody else's project
      includeForks: process.env.PROJECTS_INCLUDE_FORKS === 'true',
      ttl: Number(process.env.PROJECTS_TTL || 900),
    },

    // --- /dash (server only) ----------------------------------------------
    dash: {
      // unset => /dash is disabled entirely
      password: process.env.DASH_PASSWORD || '',
      // optional; defaults to a key derived from the password
      sessionSecret: process.env.DASH_SESSION_SECRET || '',
      // session lifetime in hours
      sessionHours: Number(process.env.DASH_SESSION_HOURS || 168),
    },

    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://nak0x.dev',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'alternate', type: 'application/rss+xml', title: 'nak0x.dev', href: '/rss.xml' },
      ],
      script: [
        {
          // set the theme before first paint, no flash
          innerHTML: `(function(){try{var s=localStorage.getItem("theme");var d=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",s||(d?"dark":"light"))}catch(e){}})()`,
          tagPosition: 'head',
        },
      ],
    },
  },
})
