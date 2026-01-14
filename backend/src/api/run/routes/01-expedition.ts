export default {
  routes: [
    {
      method: 'POST',
      path: '/runs/start-expedition',
      handler: 'run.startExpedition',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/runs/end-expedition',
      handler: 'run.endExpedition',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/runs/active',
      handler: 'run.getActiveRun',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
