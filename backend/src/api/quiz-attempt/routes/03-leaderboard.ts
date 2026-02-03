export default {
  routes: [
    {
      method: 'GET',
      path: '/quiz-attempts/leaderboard',
      handler: 'quiz-attempt.getTodayLeaderboard',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
