export default {
  routes: [
    {
      method: 'GET',
      path: '/admin-dashboard/check',
      handler: 'admin-dashboard.check',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/admin-dashboard/overview',
      handler: 'admin-dashboard.getOverview',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/admin-dashboard/players',
      handler: 'admin-dashboard.getPlayers',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/admin-dashboard/players/:id',
      handler: 'admin-dashboard.getPlayerDetail',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/admin-dashboard/players/:id/toggle-block',
      handler: 'admin-dashboard.toggleBlockPlayer',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/admin-dashboard/players/:id/role',
      handler: 'admin-dashboard.changePlayerRole',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
