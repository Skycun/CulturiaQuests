export default defineNuxtRouteMiddleware((to) => {
  const device = useDevice()
  const config = useRuntimeConfig()
  const user = useStrapiUser()

  // Allow desktop access if ALLOW_DESKTOP is set to true in .env
  // Handle both string 'true' and boolean true
  const allowDesktop = String(config.public.allowDesktop) === 'true'

  // Check if user is on desktop and desktop access is not allowed
  if (!allowDesktop && device.isDesktop) {
    // Only allow access to /pc-error for desktop users
    if (to.path !== '/pc-error') {
      return navigateTo('/pc-error')
    }
    return
  }

  // Prevent access to /pc-error if user is not a desktop or desktop is allowed
  if (to.path === '/pc-error') {
    return navigateTo('/')
  }

  // Define public routes accessible without authentication
  const publicRoutes = [
    '/',
    '/error',
    '/pc-error',
    '/account/login',
    '/account/register'
  ]

  // Check authentication
  if (!user.value) {
    // If user is not authenticated and trying to access a protected route
    if (!publicRoutes.includes(to.path)) {
      return navigateTo('/account/login')
    }
  }
})
