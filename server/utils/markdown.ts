import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import GithubSlugger from 'github-slugger'
import { createHighlighter, type Highlighter } from 'shiki'
import type { TocEntry } from '#shared/types/blog'

/**
 * Languages compiled into the image. Shiki's `codeToHtml` is async but
 * markdown-it's fence rule is not, so we preload a fixed set at boot and fall
 * back to plain text for anything else.
 */
const LANGS = [
  'rust', 'typescript', 'javascript', 'vue', 'python', 'bash', 'shell',
  'json', 'yaml', 'toml', 'html', 'css', 'c', 'cpp', 'csharp', 'go',
  'sql', 'markdown', 'diff', 'docker', 'nginx', 'lua', 'glsl', 'ini',
] as const

const THEMES = { light: 'github-light', dark: 'github-dark' } as const

let highlighterPromise: Promise<Highlighter> | null = null

function useHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [THEMES.light, THEMES.dark],
    langs: [...LANGS],
  })
  return highlighterPromise
}

export interface RenderResult {
  html: string
  toc: TocEntry[]
  /** minutes, rounded up, floor of 1 */
  readingTime: number
}

export async function renderMarkdown(
  source: string,
  options: { resolveAsset?: (src: string) => string } = {},
): Promise<RenderResult> {
  const highlighter = await useHighlighter()
  const loaded = new Set(highlighter.getLoadedLanguages())
  const resolveAsset = options.resolveAsset ?? ((s: string) => s)

  // one slugger per render so duplicate headings get -1, -2 … suffixes
  const slugger = new GithubSlugger()
  const toc: TocEntry[] = []

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: false,
    highlight(code, lang) {
      const language = loaded.has(lang) ? lang : 'text'
      try {
        return highlighter.codeToHtml(code, { lang: language, themes: THEMES })
      } catch {
        return '' // let markdown-it escape it itself
      }
    },
  })

  md.use(anchor, {
    slugify: (s: string) => slugger.slug(s),
    level: [2, 3],
    permalink: anchor.permalink.linkInsideHeader({
      symbol: '#',
      class: 'heading-anchor',
      placement: 'after',
      ariaHidden: true,
    }),
    callback(token, info) {
      // `token.tag` is h2 / h3 — deeper levels are filtered out above
      toc.push({ id: info.slug, text: info.title, depth: Number(token.tag.slice(1)) })
    },
  })

  // external links open in a new tab
  const renderToken = (tokens: any, i: number, opts: any, _env: any, self: any) =>
    self.renderToken(tokens, i, opts)
  const defaultLink = md.renderer.rules.link_open ?? renderToken

  md.renderer.rules.link_open = (tokens, i, opts, env, self) => {
    const token = tokens[i]
    const href = String(token?.attrGet('href') ?? '')
    if (token && /^https?:\/\//i.test(href)) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noopener noreferrer')
    }
    return defaultLink(tokens, i, opts, env, self)
  }

  // relative images resolve against the content repo
  const defaultImage = md.renderer.rules.image ?? renderToken
  md.renderer.rules.image = (tokens, i, opts, env, self) => {
    const token = tokens[i]
    if (token) {
      const src = String(token.attrGet('src') ?? '')
      if (src && !/^(https?:)?\/\//i.test(src) && !src.startsWith('data:')) {
        token.attrSet('src', resolveAsset(src))
      }
      token.attrSet('loading', 'lazy')
    }
    return defaultImage(tokens, i, opts, env, self)
  }

  const html = md.render(source)

  const words = source.split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(words / 200))

  return { html, toc, readingTime }
}
