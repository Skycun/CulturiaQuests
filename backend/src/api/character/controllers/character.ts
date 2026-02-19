/**
 * character controller
 */

import { factories } from '@strapi/strapi';
import { getMaxCharacters, calculateGuildLevel } from '../../../utils/guild-level';

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
   * Create character - assigns to user's guild with level-based limit and icon uniqueness
   */
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in to create a character');
    }

    // Fetch guild with exp and existing characters (with their icon ids)
    const userGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['id', 'documentId', 'exp'],
      populate: {
        characters: {
          select: ['id', 'documentId'],
          populate: {
            icon: { select: ['id'] },
          },
        },
      },
    });

    if (!userGuild) {
      return ctx.badRequest('You must have a guild to create a character');
    }

    // Validate max character count based on guild level
    const guildLevel = calculateGuildLevel(Number(userGuild.exp || 0));
    const maxChars = getMaxCharacters(guildLevel);
    const currentCount = userGuild.characters?.length || 0;

    if (currentCount >= maxChars) {
      return ctx.badRequest(
        `Votre niveau de guilde (${guildLevel}) autorise un maximum de ${maxChars} personnage(s). Vous en avez déjà ${currentCount}.`
      );
    }

    const { data } = ctx.request.body;

    // Validate required fields
    if (!data?.firstname || !data?.lastname) {
      return ctx.badRequest('Le prénom et le nom sont obligatoires.');
    }

    // Validate icon is provided
    const requestedIconId = data.icon;
    if (!requestedIconId) {
      return ctx.badRequest('Une icône est obligatoire pour la création du personnage.');
    }

    // Validate icon uniqueness within the guild
    const existingIconIds = (userGuild.characters || [])
      .map((c: any) => c.icon?.id)
      .filter(Boolean);

    if (existingIconIds.includes(requestedIconId)) {
      return ctx.badRequest('Cette icône est déjà utilisée par un autre personnage de votre guilde.');
    }

    const characterData = {
      ...data,
      guild: userGuild.id,
      publishedAt: new Date(),
    };

    // Create the character
    const entity = await strapi.documents('api::character.character').create({
      data: characterData,
    });

    // Create starter items (3 basic items: weapon, helmet, charm)
    await strapi.service('api::character.character').createStarterItems(
      entity.documentId,
      userGuild.documentId
    );

    // Fetch character with populated items and icon
    const populatedCharacter = await strapi.documents('api::character.character').findOne({
      documentId: entity.documentId,
      populate: {
        icon: { fields: ['id', 'url', 'name'] },
        items: {
          populate: ['icon', 'rarity'],
        },
      },
    });

    const sanitizedEntity = await this.sanitizeOutput(populatedCharacter, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
