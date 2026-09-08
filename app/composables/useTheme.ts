type Theme = 'light' | 'dark'

/**
 * The theme is applied by an inline script in `nuxt.config.ts` before first
 * paint, so there is no flash. This composable only mirrors and flips it.
 */
export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')
  const mounted = useState<boolean>('theme:mounted', () => false)

  onMounted(() => {
    const current = document.documentElement.getAttribute('data-theme')
    theme.value = current === 'dark' ? 'dark' : 'light'
    mounted.value = true
  })

  function set(next: Theme) {
    theme.value = next
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // private mode, blocked storage — the toggle still works for this session
    }
  }

  const toggle = () => set(theme.value === 'dark' ? 'light' : 'dark')

  return { theme, mounted, set, toggle }
}
