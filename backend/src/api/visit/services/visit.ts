import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::visit.visit', ({ strapi }) => ({
  /**
   * Generate random loot for a chest opening
   * Utilise le service item.generateRandomItem pour la generation
   * @param guildDocumentId - The guild's documentId
   * @param visitDocumentId - The visit's documentId
   * @param maxFloor - Le palier maximum du joueur (pour le level des items)
   * @returns Object containing items, gold, and exp
   */
  async generateChestLoot(guildDocumentId: string, visitDocumentId: string, maxFloor: number = 1) {
    // 1. Generer nombre d'items (1-3)
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];

    // 2. Generer les items via le service centralise
    for (let i = 0; i < itemCount; i++) {
      const item = await strapi
        .service('api::item.item')
        .generateRandomItem(guildDocumentId, maxFloor, visitDocumentId);
      items.push(item);
    }

    // 3. Generer gold et XP
    const gold = Math.floor(Math.random() * 101) + 50;  // 50-150
    const exp = Math.floor(Math.random() * 201) + 100;  // 100-300

    return { items, gold, exp };
  }
}));
