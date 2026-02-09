/**
 * Admin route middleware
 * Protects /dashboard routes - redirects non-admin users to home
 */
export default defineNuxtRouteMiddleware(async () => {
  const user = useStrapiUser()

  if (!user.value) {
    return navigateTo('/account/login')
  }

  const { checkAdminRole } = useAdmin()
  const hasAdmin = await checkAdminRole()

  if (!hasAdmin) {
    return navigateTo('/')
  }
})
