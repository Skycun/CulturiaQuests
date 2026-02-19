/**
 * Composable for checking admin role status.
 * Uses two strategies:
 * 1. Sync: reads role.type from the user state (fast path)
 * 2. Async: calls /admin-dashboard/check endpoint (reliable fallback)
 */
export function useAdmin() {
  const user = useStrapiUser()
  const isAdminVerified = useState<boolean>('is_admin_verified', () => false)
  const verifyPending = ref(false)

  const isAdmin = computed(() => {
    const u = user.value as any
    return u?.role?.type === 'admin' || isAdminVerified.value
  })

  const adminChecked = computed(() => !!user.value)

  async function verifyAdmin() {
    if (!user.value || verifyPending.value) return
    verifyPending.value = true
    try {
      const client = useStrapiClient()
      const result: any = await client('/admin-dashboard/check')
      isAdminVerified.value = result?.isAdmin === true
    } catch {
      isAdminVerified.value = false
    } finally {
      verifyPending.value = false
    }
  }

  function checkAdminRole(): boolean {
    if (!user.value) return false
    return (user.value as any)?.role?.type === 'admin' || isAdminVerified.value
  }

  // Auto-verify on client when user is connected but not yet verified
  if (import.meta.client && user.value && !isAdminVerified.value) {
    verifyAdmin()
  }

  return {
    isAdmin,
    adminChecked,
    checkAdminRole,
    verifyAdmin,
  }
}
