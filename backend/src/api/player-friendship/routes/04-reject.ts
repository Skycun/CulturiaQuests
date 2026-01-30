export default {
  routes: [
    {
      method: 'PUT',
      path: '/player-friendships/:id/reject',
      handler: 'player-friendship.rejectRequest',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
