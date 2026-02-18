/**
 * Admin route middleware
 * Protects /dashboard routes - redirects non-admin users to home
 */
export default defineNuxtRouteMiddleware(() => {
  // Skip SSR: useStrapiToken can't read the cookie name from the private runtimeConfig
  // (which only has `url`). The client will re-run this middleware on hydration.
  if (import.meta.server) return

  const user = useStrapiUser()

  if (!user.value) {
    return navigateTo('/account/login')
  }

  const { checkAdminRole } = useAdmin()
  if (!checkAdminRole()) {
    return navigateTo('/')
  }
})
