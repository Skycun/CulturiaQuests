export default {
  routes: [
    {
      method: 'GET',
      path: '/statistics/summary',
      handler: 'statistic.getSummary',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
