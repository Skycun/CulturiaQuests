export default {
  routes: [
    {
      method: 'GET',
      path: '/character-icons',
      handler: 'character.getCharacterIcons',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
