export default {
  routes: [
    {
      method: 'GET',
      path: '/quiz-attempts/history',
      handler: 'quiz-attempt.getMyHistory',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
