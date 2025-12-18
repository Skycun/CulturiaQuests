/**
 * guild controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::guild.guild', ({ strapi }) => ({
  async me(ctx) {
    console.log('DEBUG: Guild.me controller reached. User context:', ctx.state.user);
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('No user authenticated');
    }

    try {
      const guild = await strapi.db.query('api::guild.guild').findOne({
        where: {
          user: user.id,
        },
        populate: true, // or specify fields like ['characters', 'items']
      });

      if (!guild) {
        return ctx.notFound('No guild found for this user');
      }

      const sanitizedEntity = await this.sanitizeOutput(guild, ctx);
      return this.transformResponse(sanitizedEntity);
    } catch (err) {
      ctx.body = err;
    }
  },
}));