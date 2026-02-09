/**
 * Composable for checking admin role status
 * Uses the Strapi user object to determine if the current user has the admin role
 */
export function useAdmin() {
  const user = useStrapiUser()
  const client = useStrapiClient()

  const isAdmin = ref(false)
  const adminChecked = ref(false)

  /**
   * Check if the current user has the admin role
   * Fetches the user's role from the /api/users/me endpoint with role populated
   */
  async function checkAdminRole() {
    if (!user.value) {
      isAdmin.value = false
      adminChecked.value = true
      return false
    }

    try {
      const me = await client<any>('/users/me', {
        method: 'GET',
        params: { populate: ['role'] },
      })
      isAdmin.value = me?.role?.type === 'admin'
    } catch {
      isAdmin.value = false
    }

    adminChecked.value = true
    return isAdmin.value
  }

  return {
    isAdmin,
    adminChecked,
    checkAdminRole,
  }
}
