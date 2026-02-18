/**
 * Composable for handling complete account deletion
 * Calls the backend DELETE /api/user/me endpoint, then logs out
 */
export function useDeleteAccount() {
  const { logout } = useLogout()
  const client = useStrapiClient()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function deleteAccount() {
    loading.value = true
    error.value = null

    try {
      await client('/user-settings/me', {
        method: 'DELETE',
      })
      await logout('/')
    } catch (e: any) {
      error.value = e?.data?.error?.message || e?.message || 'Erreur lors de la suppression du compte'
    } finally {
      loading.value = false
    }
  }

  return { deleteAccount, loading, error }
}
