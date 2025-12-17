export default {
  routes: [
    {
      method: 'GET',
      path: '/guilds/me', 
      handler: 'guild.me',
      config: {
        policies: [],
        middlewares: [],
      },
    }
  ]
}
