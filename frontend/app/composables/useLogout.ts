/**
 * Composable for handling complete logout
 * Clears JWT token, localStorage, and all Pinia stores
 */
export function useLogout() {
  const { logout: strapiLogout } = useStrapiAuth()
  const guildStore = useGuildStore()
  /**
   * Performs a complete logout:
   * 1. Clears the Strapi JWT token
   * 2. Clears all Pinia stores
   * 3. Clears localStorage
   * 4. Redirects to a specified route (default: '/')
   */
  async function logout(redirectTo: string = '/') {
    // Explicitly clear the Strapi JWT cookie
    const token = useCookie('culturia_jwt', { path: '/' })
    token.value = null

    // Clear Strapi auth (internal state)
    strapiLogout()

    // Clear all Pinia stores
    guildStore.clearAll()

    // Clear localStorage and sessionStorage
    if (import.meta.client) {
      localStorage.clear()
      sessionStorage.clear()
    }

    // Force full page reload to reset all state cleanly
    await navigateTo(redirectTo, { external: true })
  }

  return {
    logout,
  }
}
