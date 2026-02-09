/**
 * Composable for checking admin role status
 * Calls the /admin-dashboard/check endpoint which is restricted to the admin role.
 * If the call succeeds (200) the user is admin, if it fails (403) they are not.
 */
export function useAdmin() {
  const user = useStrapiUser()
  const client = useStrapiClient()

  const isAdmin = ref(false)
  const adminChecked = ref(false)

  async function checkAdminRole() {
    if (!user.value) {
      isAdmin.value = false
      adminChecked.value = true
      return false
    }

    try {
      await client<{ isAdmin: boolean }>('/admin-dashboard/check', {
        method: 'GET',
      })
      isAdmin.value = true
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
