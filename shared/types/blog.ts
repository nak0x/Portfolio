export interface TocEntry {
  id: string
  text: string
  depth: number
}

export interface PostMeta {
  /** url slug, from the frontmatter or the filename */
  slug: string
  title: string
  description: string
  /** ISO date */
  date: string
  updated?: string
  tags: string[]
  draft: boolean
  /** minutes, rounded up */
  readingTime: number
  /** path of the .md inside the content repo */
  path: string
  /** link back to the file in gitea/github */
  sourceUrl?: string
}

export interface Post extends PostMeta {
  html: string
  toc: TocEntry[]
}
