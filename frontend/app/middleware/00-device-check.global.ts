export default defineNuxtRouteMiddleware((to) => {
  const user = useStrapiUser()

  // Define public routes accessible without authentication
  const publicRoutes = [
    '/',
    '/error',
    '/account/login',
    '/account/register',
    '/CGU'
  ]

  // Check authentication
  if (!user.value) {
    // If user is not authenticated and trying to access a protected route
    if (!publicRoutes.includes(to.path)) {
      return navigateTo('/account/login')
    }
  }
})
