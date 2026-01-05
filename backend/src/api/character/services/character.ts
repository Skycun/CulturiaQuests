/**
 * character service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::character.character', ({ strapi }) => ({
  /**
   * Helper: Find icon in media library by folder and filename pattern
   * @param folderName - The name of the folder in the media library (e.g., 'weapons', 'helmets', 'charms')
   * @param fileNamePart - Part of the filename to search for (e.g., 'basic_sword')
   * @returns The file ID if found, null otherwise
   */
  async findIcon(folderName: string, fileNamePart: string) {
    const folder = await strapi.db.query('plugin::upload.folder').findOne({
      where: { name: folderName },
      select: ['id'],
    });

    if (!folder) return null;

    const file = await strapi.db.query('plugin::upload.file').findOne({
      where: {
        folder: { id: folder.id },
        mime: { $startsWith: 'image/' },
        name: { $contains: fileNamePart }
      },
      select: ['id'],
    });

    return file ? file.id : null;
  },

  /**
   * Create starter items for a character
   * Creates 3 basic items: weapon, helmet, and charm
   * @param characterDocumentId - The character's documentId
   * @param guildDocumentId - The guild's documentId
   * @returns Array of created items
   */
  async createStarterItems(characterDocumentId: string, guildDocumentId: string) {
    // 1. Fetch Common Rarity
    const commonRarity = await strapi.db.query('api::rarity.rarity').findOne({
      where: { name: 'Common' },
    });

    if (!commonRarity) {
      strapi.log.warn('Rarity "Common" not found. Items will be created without rarity.');
    }

    // 2. Find icons for each item type
    const swordIconId = await this.findIcon('weapons', 'basic_sword');
    const helmetIconId = await this.findIcon('helmets', 'basic_helmet');
    const charmIconId = await this.findIcon('charms', 'basic_charm');

    // 3. Define starter items
    const starterItems = [
      {
        name: 'Épée classique',
        slot: 'weapon' as const,
        index_damage: 10,
        level: 1,
        icon: swordIconId
      },
      {
        name: 'Casque classique',
        slot: 'helmet' as const,
        index_damage: 10,
        level: 1,
        icon: helmetIconId
      },
      {
        name: 'Bague classique',
        slot: 'charm' as const,
        index_damage: 10,
        level: 1,
        icon: charmIconId
      },
    ];

    // 4. Create items
    const createdItems = [];
    for (const item of starterItems) {
      const newItem = await strapi.documents('api::item.item').create({
        data: {
          ...item,
          isScrapped: false,
          guild: guildDocumentId,
          character: characterDocumentId,
          rarity: commonRarity ? commonRarity.documentId : null,
          publishedAt: new Date(),
        },
      });
      createdItems.push(newItem);
    }

    strapi.log.info(`Created ${createdItems.length} starter items for character ${characterDocumentId}`);
    return createdItems;
  }
}));
