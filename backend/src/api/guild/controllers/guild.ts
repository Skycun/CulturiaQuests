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

  /**
   * Setup a new guild, character, and starter items
   */
  async setup(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in to create a guild');
    }

    const { guildName, firstname, lastname, iconId } = ctx.request.body;

    if (!guildName || !firstname || !lastname || !iconId) {
      return ctx.badRequest('Missing required fields: guildName, firstname, lastname, iconId');
    }

    // Check if user already has a guild
    const existingGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
    });

    if (existingGuild) {
      return ctx.badRequest('User already has a guild');
    }

    // Create Guild
    const newGuild = await strapi.documents('api::guild.guild').create({
      data: {
        name: guildName,
        user: user.id,
        publishedAt: new Date(),
        gold: 0,
        scrap: 0,
        exp: 0,
      },
    });

    // Create Character
    const newCharacter = await strapi.documents('api::character.character').create({
      data: {
        firstname: firstname,
        lastname: lastname,
        guild: newGuild.documentId,
        icon: iconId,
        publishedAt: new Date(),
      },
    });

    // Create starter items using character service
    await strapi.service('api::character.character').createStarterItems(
      newCharacter.documentId,
      newGuild.documentId
    );

    // Return the populated guild
    const finalGuild = await strapi.documents('api::guild.guild').findOne({
      documentId: newGuild.documentId,
      populate: {
        characters: {
            populate: ['icon']
        },
        items: {
            populate: ['icon', 'rarity']
        }
      }
    });

    const sanitizedEntity = await this.sanitizeOutput(finalGuild, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Toggle debug mode for the guild
   */
  async toggleDebugMode(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    // Get user's guild
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId', 'debug_mode']
    });

    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    // Toggle debug mode
    const newDebugMode = !guild.debug_mode;
    const updatedGuild = await strapi.documents('api::guild.guild').update({
      documentId: guild.documentId,
      data: {
        debug_mode: newDebugMode
      }
    });

    const sanitizedEntity = await this.sanitizeOutput(updatedGuild, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Delete guild and all associated data
   */
  async delete(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in to delete a guild');
    }

    const { id } = ctx.params;

    // First, verify that the guild belongs to the user
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: {
        documentId: id,
        user: { id: user.id }
      },
    });

    if (!guild) {
      return ctx.notFound('Guild not found or you do not have permission to delete it');
    }

    try {
      // Delete all related data using the guild service
      await strapi.service('api::guild.guild').deleteGuildWithRelations(id);

      return ctx.send({
        message: 'Guild and all associated data deleted successfully',
      });
    } catch (error) {
      strapi.log.error('Failed to delete guild:', error);
      return ctx.internalServerError('Failed to delete guild');
    }
  },
}));