export default {
  routes: [
    {
      method: 'POST',
      path: '/guilds/setup',
      handler: 'guild.setup',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
