/**
 * progression controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::progression.progression', ({ strapi }) => ({
  /**
   * Find progressions - restricts to user's guild
   */
  async find(ctx) {
    const user = ctx.state.user;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
      const userGuild = await strapi.db.query('api::guild.guild').findOne({
        where: { user: { id: user.id } },
        select: ['documentId'],
      });

      if (!userGuild) {
        return { data: [], meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } } };
      }

      sanitizedQuery.filters = {
        ...(sanitizedQuery.filters as any || {}),
        guild: {
          documentId: userGuild.documentId
        }
      };
    }

    const results = await strapi.documents('api::progression.progression').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Find one progression - restricts to user's guild
   */
  async findOne(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
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

    const document = await strapi.documents('api::progression.progression').findOne({
      documentId: id,
      ...sanitizedQuery,
    });

    if (!document) {
      return ctx.notFound('Progression not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Create progression - ensures it's assigned to user's guild
   */
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in to create a progression');
    }

    const userGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId'],
    });

    if (!userGuild) {
      return ctx.badRequest('You must have a guild to create a progression');
    }

    const { data } = ctx.request.body;

    // Force the guild to be the user's guild
    const progressionData = {
      ...data,
      guild: userGuild.documentId,
    };

    const entity = await strapi.documents('api::progression.progression').create({
      data: progressionData,
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Update progression - only allow for user's own guild
   */
  async update(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;

    if (!user) {
      return ctx.unauthorized('You must be logged in to update a progression');
    }

    const userGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId'],
    });

    if (!userGuild) {
      return ctx.badRequest('You must have a guild');
    }

    // Verify the progression belongs to the user's guild
    const existing = await strapi.documents('api::progression.progression').findOne({
      documentId: id,
      populate: ['guild'],
    });

    if (!existing || existing.guild?.documentId !== userGuild.documentId) {
      return ctx.notFound('Progression not found');
    }

    const { data } = ctx.request.body;

    const entity = await strapi.documents('api::progression.progression').update({
      documentId: id,
      data,
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Delete progression - only allow for user's own guild
   */
  async delete(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;

    if (!user) {
      return ctx.unauthorized('You must be logged in to delete a progression');
    }

    const userGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId'],
    });

    if (!userGuild) {
      return ctx.badRequest('You must have a guild');
    }

    // Verify the progression belongs to the user's guild
    const existing = await strapi.documents('api::progression.progression').findOne({
      documentId: id,
      populate: ['guild'],
    });

    if (!existing || existing.guild?.documentId !== userGuild.documentId) {
      return ctx.notFound('Progression not found');
    }

    await strapi.documents('api::progression.progression').delete({
      documentId: id,
    });

    return ctx.send({ message: 'Progression deleted successfully' });
  },
}));
