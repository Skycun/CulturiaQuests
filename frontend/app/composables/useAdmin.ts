/**
 * Composable for checking admin role status
 * Reads the role directly from the user state (populated via /api/users/me with role).
 * Strapi's JWT strategy returns the user with role populated by default.
 */
export function useAdmin() {
  const user = useStrapiUser()

  const isAdmin = computed(() => {
    const u = user.value as any
    return u?.role?.type === 'admin'
  })

  const adminChecked = computed(() => !!user.value)

  function checkAdminRole(): boolean {
    if (!user.value) return false
    return (user.value as any)?.role?.type === 'admin'
  }

  return {
    isAdmin,
    adminChecked,
    checkAdminRole,
  }
}
