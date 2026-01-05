export default {
  routes: [
    {
      method: 'DELETE',
      path: '/guilds/:id',
      handler: 'guild.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
