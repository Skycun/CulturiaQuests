export default {
  routes: [
    {
      method: 'POST',
      path: '/player-friendships/toggle-requests',
      handler: 'player-friendship.toggleFriendRequests',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
