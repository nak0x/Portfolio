import { featuredOf } from '#shared/site'
import type { ProjectsPayload, RepoProject } from '#shared/types/projects'

const EMPTY: ProjectsPayload = { projects: [], sources: [] }

/** how many projects the home page shows when nothing is flagged featured */
const FEATURED_FALLBACK = 4

/**
 * Every public repo of the configured github + gitea accounts, enriched by
 * the portfolio content. Keyed, so the home page and /projects share one fetch.
 */
export function useProjects() {
  const { data, refresh } = useAsyncData<ProjectsPayload>(
    'projects',
    () => $fetch('/api/projects'),
    { default: () => EMPTY },
  )

  const projects = computed<RepoProject[]>(() => data.value?.projects ?? [])

  // nothing flagged from /dash => the top of the sort is the selection
  const featured = computed<RepoProject[]>(() => {
    const flagged = featuredOf(projects.value) as RepoProject[]
    return flagged.length ? flagged : projects.value.slice(0, FEATURED_FALLBACK)
  })

  const failed = computed(() => (data.value?.sources ?? []).filter((s) => !s.ok))

  return { projects, featured, sources: computed(() => data.value?.sources ?? []), failed, refresh }
}
