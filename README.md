# nak0x.dev

A monospace, terminal-shaped portfolio in Nuxt 4, with a blog whose posts live
in a separate git repo as plain markdown. Push a `.md`, a webhook fires, the
post is live. No rebuild, no CMS, no database.

```
  browser ──► nuxt (nitro, SSR)
                 │
                 ├─ /          ──► site.json  ─┐
                 ├─ /blog/*    ──► posts/*.md ─┼──► gitea api ──► content repo
                 └─ /dash      ──► edits both ─┘         ▲
                                                          │
                          push ────────────────────────────┘
                            └─ webhook ──► /api/webhook/content (busts cache)
```

Two things live in the content repo: `posts/*.md` (the blog) and `site.json`
(the portfolio — bio, skills, links, projects). `/dash` edits both and commits
through the git API. Everything else is code.

## quick start

```sh
npm install
cp .env.example .env      # then edit it
npm run dev               # http://localhost:3000
```

Out of the box `.env.example` points at Gitea. To write offline against the
`content/posts/` folder in this repo instead:

```sh
CONTENT_PROVIDER=local npm run dev
```

## where your content goes

Two repos, on purpose: the site is code, the blog is prose, and they have very
different commit rhythms.

```
Journal/                     # the content repo (git.nak0x.dev/Nak0x/Journal)
├── site.json                # portfolio content — written by /dash
└── posts/
    ├── 2026-09-08-hello.md
    └── rust-on-old-thinkpads/
        ├── index.md
        └── bench.png        # ![](./bench.png) resolves against the post's dir
```

`site.json` is optional. Without it the site uses the seed compiled into
[`shared/site.ts`](./shared/site.ts); the first save from `/dash` creates the
file. A malformed or partial `site.json` degrades field by field back to that
seed rather than taking the site down.

Frontmatter — everything is optional except, in practice, `title`:

```yaml
---
title: how this blog works
description: one line for the list view and the og tags
date: 2026-09-08              # or just name the file 2026-09-08-*.md
updated: 2026-09-09
tags: [meta, nuxt]
slug: how-this-blog-works     # defaults to the filename, date prefix stripped
draft: true                   # hidden in production, visible in dev
---
```

`content/posts/2026-09-08-hello.md` in this repo is a working example — copy it
into the content repo as your first post.

## wiring the webhook

**Gitea** — repo → Settings → Webhooks → *Add Webhook* → *Gitea*:

| field         | value                                      |
| ------------- | ------------------------------------------ |
| Target URL    | `https://nak0x.dev/api/webhook/content`    |
| HTTP Method   | `POST`                                     |
| Content Type  | `application/json`                         |
| Secret        | same value as `CONTENT_WEBHOOK_SECRET`     |
| Trigger On    | Push Events                                |
| Branch filter | `main`                                     |

**GitHub** — same URL and secret, content type `application/json`, "Just the
push event". The handler accepts both `X-Gitea-Signature` and
`X-Hub-Signature-256`.

Generate the secret with `openssl rand -hex 32`. Requests without a valid HMAC
get a 401, so the endpoint is safe to leave public.

The webhook is an optimisation, not a dependency: `CONTENT_TTL` (default 600s)
expires the cache anyway, and a stale copy is served while the refresh runs —
so a Gitea outage degrades to "slightly old posts", never to a 502.

## deploying on Coolify

1. **New Resource → Application → Dockerfile** (or *Public/Private Repository*
   with Build Pack = `Dockerfile`). Coolify picks up the `Dockerfile` at the
   repo root.
2. **Port**: `3000`. The image already sets `HOST=0.0.0.0`.
3. **Health check path**: `/healthz` (the image also has a `HEALTHCHECK`).
4. **Environment variables** — paste from `.env.example` and fill in:
   `CONTENT_PROVIDER`, `CONTENT_REPO`, `CONTENT_BRANCH`, `CONTENT_DIR`,
   `GITEA_URL`, `CONTENT_WEBHOOK_SECRET`, `NUXT_PUBLIC_SITE_URL`, plus
   `DASH_PASSWORD` and `CONTENT_TOKEN` if you want to edit from `/dash`.
5. **Build variable** — `NUXT_PUBLIC_SITE_URL` is inlined into the client
   bundle, so it also has to exist at build time. In Coolify, tick *"Build
   Variable"* on it, or set the build arg `SITE_URL`.
6. **Domain**: `https://nak0x.dev`. Coolify terminates TLS in front.

Redeploy on push to *this* repo is the usual Coolify webhook. Posts do not need
a redeploy at all — that is the whole point.

Locally, `docker compose up --build` runs the same image.

## environment

| variable                 | default                  | what it does                                        |
| ------------------------ | ------------------------ | --------------------------------------------------- |
| `NUXT_PUBLIC_SITE_URL`   | `https://nak0x.dev`      | canonical URL for rss, sitemap, og tags              |
| `CONTENT_PROVIDER`       | `gitea`                  | `gitea` \| `github` \| `local`                       |
| `CONTENT_REPO`           | `Nak0x/Journal`          | `owner/repo` of the content repo                     |
| `CONTENT_BRANCH`         | `main`                   | branch to read                                       |
| `CONTENT_DIR`            | `posts`                  | sub-directory holding the markdown (`''` = root)     |
| `GITEA_URL`              | `https://git.nak0x.dev`  | Gitea base URL (ignored for github)                  |
| `CONTENT_TOKEN`          | —                        | PAT, only for private repos or GitHub rate limits    |
| `CONTENT_TTL`            | `600`                    | seconds before a cached post goes stale              |
| `CONTENT_WEBHOOK_SECRET` | —                        | HMAC secret; without it the webhook returns 503      |
| `CONTENT_LOCAL_DIR`      | `content`                | repo root used when `CONTENT_PROVIDER=local`         |
| `CONTENT_SITE_FILE`      | `site.json`              | portfolio data, relative to the repo root            |
| `PROJECTS_GITHUB_USER`   | `nak0x`                  | github account to list repos from (`''` disables)    |
| `PROJECTS_GITEA_USER`    | `Nak0x`                  | gitea account to list repos from (`''` disables)     |
| `PROJECTS_GITEA_URL`     | `GITEA_URL`              | gitea instance to read the repos from                |
| `PROJECTS_GITHUB_TOKEN`  | —                        | PAT; lifts github's 60 req/h anonymous limit         |
| `PROJECTS_GITEA_TOKEN`   | `CONTENT_TOKEN`          | PAT for the gitea instance                           |
| `PROJECTS_EXCLUDE`       | —                        | repos to drop, comma-separated `name` or `owner/name` |
| `PROJECTS_INCLUDE_FORKS` | `false`                  | `true` lists forks as projects too                   |
| `PROJECTS_TTL`           | `900`                    | seconds before the repo list is refetched            |
| `DASH_PASSWORD`          | —                        | unset disables `/dash` entirely                      |
| `DASH_SESSION_SECRET`    | derived from password    | HMAC key for the session cookie                      |
| `DASH_SESSION_HOURS`     | `168`                    | how long a login lasts                               |
| `SHOW_DRAFTS`            | `false`                  | `true` renders `draft: true` posts in production     |

## /dash — editing without a terminal

`/dash` is a small single-user CMS for this site. It is disabled until
`DASH_PASSWORD` is set, and it can only *write* once `CONTENT_TOKEN` holds a
token with write access to the content repo (Gitea: scope `write:repository`).
Without the token it still works, read-only.

```sh
DASH_PASSWORD=$(openssl rand -hex 24)   # login
CONTENT_TOKEN=…                         # gitea/github PAT, write scope
```

| page                | what it does                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `/dash`             | repo status, post list, cache refresh, create/delete posts          |
| `/dash/posts/:slug` | markdown editor with live preview; `new` creates a post             |
| `/dash/site`        | bio, skills, links and the whole project list                       |

Every save is one commit through the git API — no separate deploy, no rebuild,
and the history is the same one you get from pushing by hand. The editor sends
the sha it loaded with each save, so if you also edited the file from nvim in
the meantime you get a 409 instead of a silent overwrite.

The preview pane posts the body to `/api/dash/preview` and renders the HTML the
published page would show, Shiki highlighting included — the client never gets a
markdown parser.

**Auth.** A password check sets an HttpOnly, SameSite=Lax, HMAC-signed cookie
(`Secure` behind an https proxy), valid for `DASH_SESSION_HOURS`. The signing
key defaults to a value derived from the password, so changing the password logs
every session out. Failed logins are rate-limited per IP (8 per 10 minutes).
`/dash` is `Disallow`ed in `robots.txt` and sends `noindex`.

Every `/api/dash/*` route checks the session server-side; the route middleware
only spares you a page that would 401 on load.

## where the project list comes from

`/projects` is not a list anybody maintains: it is every **public repository**
of `PROJECTS_GITHUB_USER` and `PROJECTS_GITEA_USER`, read from both forges on
every cache miss and merged. Forks are skipped unless
`PROJECTS_INCLUDE_FORKS=true`, and a repo on both forges is shown once (github
wins). Each repo maps to a card on its own:

| card         | comes from                                                 |
| ------------ | ---------------------------------------------------------- |
| tagline      | the repo description                                       |
| stack        | the primary language, then the repo topics                 |
| year         | the year the repo was created                              |
| status       | `archived` if archived, `active` if pushed in the last 120 days, else `shipped` |

The `projects` block in `site.json` is an **overlay** on top of that, not the
list itself. An entry whose `href` (preferred) or `name` matches a repository
replaces that repo's fields wherever it actually says something — a nicer name,
hand-written bullets, `featured: true` for the home page, `hidden: true` to drop
it from the site. An entry that matches no repository is still shown, so a
project with no repo behind it does not disappear. All of it is editable from
`/dash`.

Both forges are independent: if github rate-limits you, the gitea repos still
render and `/projects` says one source is missing. If *both* fail, the overlay
entries are all that is left — which is exactly the old hand-written list.

## editing the portfolio in code instead

[`shared/site.ts`](./shared/site.ts) holds the seed and the types. Edit it when
you want a change tracked in *this* repo rather than the content one — but note
that a `site.json` in the content repo overrides it.

## routes

| route                    | what                                        |
| ------------------------ | ------------------------------------------- |
| `/`                      | hero, about, skills, featured work, latest posts |
| `/projects`              | every public repo, github + gitea           |
| `/blog`, `/blog?tag=x`   | index, filterable by tag                    |
| `/blog/:slug`            | a post, with TOC and prev/next              |
| `/dash`, `/dash/*`       | the editor (password-protected, noindex)    |
| `/rss.xml`               | feed                                        |
| `/sitemap.xml`           | sitemap                                     |
| `/healthz`               | liveness probe                              |
| `/api/webhook/content`   | push webhook (POST, HMAC-signed)            |

## stack

Nuxt 4 · Nitro (node-server) · markdown-it + Shiki · gray-matter · hand-written
CSS. No UI framework, no client-side markdown, no database, ~zero JavaScript on
the blog pages beyond hydration.
