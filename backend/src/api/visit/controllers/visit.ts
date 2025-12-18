/**
 * visit controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::visit.visit', ({ strapi }) => ({
  /**
   * Find visits - restricts to user's guild
   */
  async find(ctx) {
    const user = ctx.state.user;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
      sanitizedQuery.filters = {
        ...(sanitizedQuery.filters as any || {}),
        guild: {
          user: {
            id: user.id
          }
        }
      };
    }

    const results = await strapi.documents('api::visit.visit').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Find one visit - restricts to user's guild
   */
  async findOne(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
      sanitizedQuery.filters = {
        ...(sanitizedQuery.filters as any || {}),
        guild: {
          user: {
            id: user.id
          }
        }
      };
    }

    const document = await strapi.documents('api::visit.visit').findOne({
      documentId: id,
      ...sanitizedQuery,
    });

    if (!document) {
      return ctx.notFound('Visit not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
