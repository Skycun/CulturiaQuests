export default {
  routes: [
    {
      method: 'POST',
      path: '/guilds/toggle-debug',
      handler: 'guild.toggleDebugMode',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
