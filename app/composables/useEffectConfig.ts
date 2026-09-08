import { defaultEffectConfig, type EffectConfig } from '#shared/effect'

/** the home-page point cloud settings, edited from /dash/effect */
export function useEffectConfig() {
  const { data, refresh } = useAsyncData<EffectConfig>('effect', () => $fetch('/api/effect'), {
    default: () => ({ ...defaultEffectConfig, enabled: false }),
  })
  return { effect: data, refresh }
}
