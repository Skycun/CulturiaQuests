/**
 * character controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::character.character', ({ strapi }) => ({
  /**
   * Find characters - restricts to user's guild
   */
  async find(ctx) {
    const user = ctx.state.user;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
      // Fetch the user's guild first to ensure robust filtering
      const userGuild = await strapi.db.query('api::guild.guild').findOne({
        where: { user: { id: user.id } },
        select: ['documentId'],
      });

      if (!userGuild) {
        // If user has no guild, they can't have characters in this context
        return { data: [], meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } } };
      }

      sanitizedQuery.filters = {
        ...(sanitizedQuery.filters as any || {}),
        guild: {
          documentId: userGuild.documentId
        }
      };
    }

    const results = await strapi.documents('api::character.character').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Find one character - restricts to user's guild
   */
  async findOne(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
      // Fetch the user's guild first
      const userGuild = await strapi.db.query('api::guild.guild').findOne({
        where: { user: { id: user.id } },
        select: ['documentId'],
      });

      if (!userGuild) {
         return ctx.notFound('Guild not found for user');
      }

      sanitizedQuery.filters = {
        ...(sanitizedQuery.filters as any || {}),
        guild: {
          documentId: userGuild.documentId
        }
      };
    }

    const document = await strapi.documents('api::character.character').findOne({
      documentId: id,
      ...sanitizedQuery,
    });

    if (!document) {
      return ctx.notFound('Character not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
