export default () => ({
  geodata: {
    enabled: true,
    resolve: './node_modules/strapi-geodata',
  },
  'users-permissions': {
    config: {
      register: {
        allowedFields: ['age'],
      },
    },
  },
});
