export default {
  routes: [
    {
      method: 'GET',
      path: '/player-friendships/search',
      handler: 'player-friendship.searchUser',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
