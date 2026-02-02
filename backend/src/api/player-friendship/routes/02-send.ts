export default {
  routes: [
    {
      method: 'POST',
      path: '/player-friendships/send',
      handler: 'player-friendship.sendRequest',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
