import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::player-friendship.player-friendship', ({ strapi }) => ({
  /**
   * Count pending friend requests sent by a guild
   */
  async countPendingRequests(guildDocumentId: string): Promise<number> {
    const count = await strapi.db.query('api::player-friendship.player-friendship').count({
      where: {
        requester: { documentId: guildDocumentId },
        status: 'pending',
      },
    });
    return count;
  },

  /**
   * Find existing relation between two guilds (in any direction)
   */
  async findExistingRelation(guild1DocumentId: string, guild2DocumentId: string) {
    const relation = await strapi.db.query('api::player-friendship.player-friendship').findOne({
      where: {
        $or: [
          {
            requester: { documentId: guild1DocumentId },
            receiver: { documentId: guild2DocumentId },
          },
          {
            requester: { documentId: guild2DocumentId },
            receiver: { documentId: guild1DocumentId },
          },
        ],
      },
    });
    return relation;
  },
}));
