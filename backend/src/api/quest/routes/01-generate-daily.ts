export default {
  routes: [
    {
      method: 'POST',
      path: '/quests/generate-daily',
      handler: 'quest.generateDaily',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
