export default {
  routes: [
    {
      method: 'PUT',
      path: '/player-friendships/:id/accept',
      handler: 'player-friendship.acceptRequest',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
