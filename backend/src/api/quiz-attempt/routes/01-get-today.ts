export default {
  routes: [
    {
      method: 'GET',
      path: '/quiz-attempts/today',
      handler: 'quiz-attempt.getTodayQuiz',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
