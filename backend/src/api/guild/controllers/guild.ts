/**
 * guild controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::guild.guild', ({ strapi }) => ({
  /**
   * Find guilds - for authenticated users, returns only their guild
   */
  async find(ctx) {
    const user = ctx.state.user;

    // Sanitize the query parameters first (handles populate, sort, etc.)
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
      // Force filter by the authenticated user's ID
      // We assume sanitizedQuery.filters is an object (it usually is after sanitization)
      sanitizedQuery.filters = {
        ...(sanitizedQuery.filters as any || {}),
        user: {
          id: user.id
        }
      };
    }

    // Use the Document Service to fetch the data
    const results = await strapi.documents('api::guild.guild').findMany(sanitizedQuery);

    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Find one guild - ensures users can only access their own guild
   */
  async findOne(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;

    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
      // Force filter by the authenticated user's ID
      sanitizedQuery.filters = {
        ...(sanitizedQuery.filters as any || {}),
        user: {
          id: user.id
        }
      };
    }

    // Use the Document Service to fetch the data
    const document = await strapi.documents('api::guild.guild').findOne({
      documentId: id,
      ...sanitizedQuery,
    });

    if (!document) {
      return ctx.notFound('Guild not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));