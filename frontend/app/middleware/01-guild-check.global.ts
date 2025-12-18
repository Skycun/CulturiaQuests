export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useStrapiUser()
  const guildStore = useGuildStore()
  
  // Allow access to login/register pages without checks
  // (Assuming standard strapi-auth routes or custom ones)
  // If user is not logged in, we do nothing and let other guards handle it
  // EXCEPTION: We now allow /tests/create-guild because it handles registration too
  if (!user.value) {
    if (to.path === '/tests/create-guild') {
      return // Allow access
    }
    return
  }

  // Prevent infinite redirects
  if (to.path === '/tests/create-guild') {
    // If user already has a guild, redirect them to home
    // We double check the store state. 
    if (guildStore.hasGuild) {
      return navigateTo('/')
    }
    return
  }

  // If user is logged in, check if they have a guild
  if (!guildStore.hasGuild) {
    // Attempt to fetch guild info if we haven't checked yet or if store is empty
    // But be careful not to spam API on every route change if they really don't have one.
    // We can rely on 'fetchGuild' which sets the state.
    
    await guildStore.fetchGuild()
    
    if (!guildStore.hasGuild) {
      return navigateTo('/tests/create-guild')
    }
  }
})
