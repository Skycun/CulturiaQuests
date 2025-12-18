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

    const { guildName, characterName, iconId } = ctx.request.body;

    if (!guildName || !characterName || !iconId) {
      return ctx.badRequest('Missing required fields: guildName, characterName, iconId');
    }

    // Check if user already has a guild
    const existingGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
    });

    if (existingGuild) {
      return ctx.badRequest('User already has a guild');
    }

    // 1. Get "Common" Rarity
    const commonRarity = await strapi.db.query('api::rarity.rarity').findOne({
      where: { name: 'Common' },
    });

    if (!commonRarity) {
        // Fallback or error? Let's error for now, as data should exist.
        // Or create it if missing? Better to assume seed data exists.
        strapi.log.warn('Rarity "Common" not found. Items will be created without rarity.');
    }

    // 2. Create Guild
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

    // 3. Create Character
    const newCharacter = await strapi.documents('api::character.character').create({
      data: {
        firstname: characterName,
        lastname: '', // Optional or empty for now
        guild: newGuild.documentId,
        icon: iconId, // specific media ID
        publishedAt: new Date(),
      },
    });

    // 4. Create Starter Items (Sword, Helmet, Charm)
    // We try to find basic icons: "weapon1", "helmet1", "charm1" (based on standard assets)
    // or just the first available icon in the respective folder if specific names aren't found.
    
    // Helper to find an icon ID
    const findIcon = async (folderName, fileNamePart) => {
      const folder = await strapi.db.query('plugin::upload.folder').findOne({
        where: { name: folderName },
        select: ['id'],
      });
      if (!folder) return null;

      // Try exact match or contains
      const file = await strapi.db.query('plugin::upload.file').findOne({
        where: {
          folder: { id: folder.id },
          mime: { $startsWith: 'image/' },
          name: { $contains: fileNamePart }
        },
        select: ['id'],
      });
      return file ? file.id : null;
    };

    const swordIconId = await findIcon('weapons', 'weapon1');
    const helmetIconId = await findIcon('helmets', 'helmet1');
    const charmIconId = await findIcon('charms', 'charm1');

    const starterItems = [
      {
        name: 'Basic Sword',
        slot: 'weapon' as const,
        index_damage: 10,
        level: 1,
        icon: swordIconId
      },
      {
        name: 'Basic Helmet',
        slot: 'helmet' as const,
        index_damage: 10,
        level: 1,
        icon: helmetIconId
      },
      {
        name: 'Basic Charm',
        slot: 'charm' as const,
        index_damage: 10,
        level: 1,
        icon: charmIconId
      },
    ];

    for (const item of starterItems) {
      await strapi.documents('api::item.item').create({
        data: {
          ...item,
          isScrapped: false,
          guild: newGuild.documentId,
          character: newCharacter.documentId,
          rarity: commonRarity ? commonRarity.documentId : null,
          publishedAt: new Date(),
        },
      });
    }

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
}));