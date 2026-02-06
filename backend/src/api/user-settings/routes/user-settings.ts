/**
 * user-settings routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/user-settings',
      handler: 'user-settings.getSettings',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/user-settings',
      handler: 'user-settings.updateSettings',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/user-settings/avatar',
      handler: 'user-settings.uploadAvatar',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/user-settings/avatar',
      handler: 'user-settings.removeAvatar',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
