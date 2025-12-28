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

  /**
   * Get character icons from media library
   * Filters image files from the "characters" folder
   */
  async getCharacterIcons(ctx) {
    try {
      // Find the "characters" folder
      const folder = await strapi.db.query('plugin::upload.folder').findOne({
        where: { name: 'characters' },
        select: ['id'],
      });

      if (!folder) {
        return ctx.send({
          data: [],
          meta: { total: 0 },
        });
      }

      // Get files in that folder
      const files = await strapi.db.query('plugin::upload.file').findMany({
        where: {
          folder: { id: folder.id },
          mime: { $startsWith: 'image/' },
        },
        select: ['id', 'documentId', 'name', 'url', 'width', 'height'],
        orderBy: { name: 'asc' },
      });

      return ctx.send({
        data: files,
        meta: { total: files.length },
      });
    } catch (error) {
      strapi.log.error('Error fetching character icons:', error);
      return ctx.internalServerError('Failed to fetch character icons');
    }
  },

  /**
   * Create character - automatically assigns to user's guild
   */
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in to create a character');
    }

    const userGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['id', 'documentId'],
    });

    if (!userGuild) {
      return ctx.badRequest('You must have a guild to create a character');
    }

    const { data } = ctx.request.body;

    const characterData = {
      ...data,
      guild: userGuild.id,
      publishedAt: new Date(),
    };

    const entity = await strapi.documents('api::character.character').create({
      data: characterData,
      populate: {
        icon: { fields: ['id', 'url', 'name'] },
      },
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
