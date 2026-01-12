/**
 * statistic controller
 */

export default {
  async getSummary(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in to view statistics');
    }

    try {
      const stats = await strapi.service('api::statistic.statistic').getSummary(user.id);
      return ctx.send(stats);
    } catch (error) {
      strapi.log.error('Failed to fetch statistics:', error);
      return ctx.internalServerError('Failed to fetch statistics');
    }
  },
};
