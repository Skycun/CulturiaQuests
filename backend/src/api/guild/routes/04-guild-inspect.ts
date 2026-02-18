export default {
  routes: [
    {
      method: 'GET',
      path: '/guilds/inspect/:documentId',
      handler: 'guild.getPublicProfile',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
