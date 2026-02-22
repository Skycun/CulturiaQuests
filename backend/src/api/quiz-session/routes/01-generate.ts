export default {
  routes: [
    {
      method: 'POST',
      path: '/quiz-sessions/generate',
      handler: 'quiz-session.generate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
