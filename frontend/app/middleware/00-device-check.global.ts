export default defineNuxtRouteMiddleware((to) => {
  const device = useDevice()
  const config = useRuntimeConfig()

  // Allow desktop access if ALLOW_DESKTOP is set to true in .env
  const allowDesktop = config.public.allowDesktop === 'true' || config.public.allowDesktop === true

  // Skip check if debug mode is enabled
  if (allowDesktop) {
    return
  }

  // Allow access to the error page itself
  if (to.path === '/pc-error') {
    return
  }

  // Check if user is on desktop (not mobile and not tablet)
  if (device.isDesktop) {
    return navigateTo('/pc-error')
  }
})
