export default {
  routes: [
    {
      method: 'DELETE',
      path: '/player-friendships/:id',
      handler: 'player-friendship.removeFriend',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
