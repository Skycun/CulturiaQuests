export default {
  routes: [
    {
      method: 'GET',
      path: '/item-icons',
      handler: 'item.getItemIcons',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
