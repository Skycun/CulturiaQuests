export default {
  routes: [
    {
      method: 'POST',
      path: '/visits/open-chest',
      handler: 'visit.openChest',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
