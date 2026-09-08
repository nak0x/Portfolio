export default defineEventHandler(() => ({
  ok: true,
  uptime: Math.round(process.uptime()),
  provider: contentConfig().provider,
}))
