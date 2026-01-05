/**
 * guild service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::guild.guild', ({ strapi }) => ({
  /**
   * Delete a guild and all its associated data (characters, items, friendships, runs, visits, quests)
   */
  async deleteGuildWithRelations(guildDocumentId: string) {
    // Find the guild with all its related data
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { documentId: guildDocumentId },
      populate: {
        characters: true,
        items: true,
        friendships: true,
        runs: true,
        visits: true,
        quests: true,
      },
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Delete all related items
    if (guild.items && guild.items.length > 0) {
      for (const item of guild.items) {
        await strapi.documents('api::item.item').delete({
          documentId: item.documentId,
        });
      }
    }

    // Delete all related friendships
    if (guild.friendships && guild.friendships.length > 0) {
      for (const friendship of guild.friendships) {
        await strapi.documents('api::friendship.friendship').delete({
          documentId: friendship.documentId,
        });
      }
    }

    // Delete all related runs
    if (guild.runs && guild.runs.length > 0) {
      for (const run of guild.runs) {
        await strapi.documents('api::run.run').delete({
          documentId: run.documentId,
        });
      }
    }

    // Delete all related visits
    if (guild.visits && guild.visits.length > 0) {
      for (const visit of guild.visits) {
        await strapi.documents('api::visit.visit').delete({
          documentId: visit.documentId,
        });
      }
    }

    // Delete all related quests
    if (guild.quests && guild.quests.length > 0) {
      for (const quest of guild.quests) {
        await strapi.documents('api::quest.quest').delete({
          documentId: quest.documentId,
        });
      }
    }

    // Delete all related characters
    if (guild.characters && guild.characters.length > 0) {
      for (const character of guild.characters) {
        await strapi.documents('api::character.character').delete({
          documentId: character.documentId,
        });
      }
    }

    // Finally, delete the guild itself
    await strapi.documents('api::guild.guild').delete({
      documentId: guildDocumentId,
    });

    return { success: true };
  },
}));
