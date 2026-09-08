import { listPosts } from '~~/server/utils/posts'

export default defineEventHandler(async (event) => {
  const base = useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')
  const posts = await listPosts()

  const urls = [
    { loc: `${base}/`, lastmod: new Date().toISOString() },
    { loc: `${base}/projects`, lastmod: new Date().toISOString() },
    { loc: `${base}/blog`, lastmod: posts[0]?.date ?? new Date().toISOString() },
    ...posts.map((p) => ({ loc: `${base}/blog/${p.slug}`, lastmod: p.updated ?? p.date })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})
