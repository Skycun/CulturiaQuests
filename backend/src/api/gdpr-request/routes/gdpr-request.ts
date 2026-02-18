export default {
  routes: [
    {
      method: 'POST',
      path: '/gdpr-request',
      handler: 'gdpr-request.requestData',
      config: { policies: [], middlewares: [] },
    },
  ],
};
