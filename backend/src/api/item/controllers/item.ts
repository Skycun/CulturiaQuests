/**
 * item controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::item.item', ({ strapi }) => ({
  /**
   * Find items - restricts to user's guild
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

    const results = await strapi.documents('api::item.item').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Find one item - restricts to user's guild
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

    const document = await strapi.documents('api::item.item').findOne({
      documentId: id,
      ...sanitizedQuery,
    });

    if (!document) {
      return ctx.notFound('Item not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Get item icons from media library
   * Filters image files from "weapons", "helmets", and "charms" folders
   */
  async getItemIcons(ctx) {
    try {
      // Find the folders
      const folders = await strapi.db.query('plugin::upload.folder').findMany({
        where: { 
          name: { $in: ['weapons', 'helmets', 'charms'] } 
        },
        select: ['id'],
      });

      if (!folders || folders.length === 0) {
        return ctx.send({
          data: [],
          meta: { total: 0 },
        });
      }

      const folderIds = folders.map(f => f.id);

      // Get files in those folders
      const files = await strapi.db.query('plugin::upload.file').findMany({
        where: {
          folder: { id: { $in: folderIds } },
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
      strapi.log.error('Error fetching item icons:', error);
      return ctx.internalServerError('Failed to fetch item icons');
    }
  },
}));
