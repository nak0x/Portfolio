import {
  assertNotRateLimited,
  clearFailures,
  dashEnabled,
  issueSession,
  passwordMatches,
  recordFailure,
} from '~~/server/utils/dash-auth'

export default defineEventHandler(async (event) => {
  if (!dashEnabled()) {
    throw createError({ statusCode: 503, message: 'DASH_PASSWORD is not configured' })
  }

  assertNotRateLimited(event)

  const { password } = await readBody<{ password?: string }>(event)
  if (!password || !passwordMatches(password)) {
    recordFailure(event)
    throw createError({ statusCode: 401, message: 'wrong password' })
  }

  clearFailures(event)
  issueSession(event)
  return { ok: true }
})
