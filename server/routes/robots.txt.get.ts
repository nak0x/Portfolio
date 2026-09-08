export default defineEventHandler((event) => {
  const base = useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /dash',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n')
})
