import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::visit.visit', ({ strapi }) => ({
  /**
   * Generate random loot for a chest opening
   * @param guildDocumentId - The guild's documentId
   * @param visitDocumentId - The visit's documentId
   * @returns Object containing items, gold, and exp
   */
  async generateChestLoot(guildDocumentId: string, visitDocumentId: string) {
    // 1. Récupérer rarities (common, rare, epic, legendary)
    const rarities = await strapi.db.query('api::rarity.rarity').findMany({
      select: ['id', 'documentId', 'name']
    });

    const rarityMap = {
      common: rarities.find(r => r.name === 'common'),
      rare: rarities.find(r => r.name === 'rare'),
      epic: rarities.find(r => r.name === 'epic'),
      legendary: rarities.find(r => r.name === 'legendary')
    };

    // 2. Générer nombre d'items (1-3)
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    const slots = ['weapon', 'helmet', 'charm'];

    for (let i = 0; i < itemCount; i++) {
      // Tirer rarity (60% common, 30% rare, 9% epic, 1% legendary)
      const rarityRoll = Math.random() * 100;
      let rarity, rarityName;

      if (rarityRoll < 60) {
        rarity = rarityMap.common;
        rarityName = 'Commun';
      } else if (rarityRoll < 90) {
        rarity = rarityMap.rare;
        rarityName = 'Rare';
      } else if (rarityRoll < 99) {
        rarity = rarityMap.epic;
        rarityName = 'Épique';
      } else {
        rarity = rarityMap.legendary;
        rarityName = 'Légendaire';
      }

      // Tirer slot aléatoire
      const slot = slots[Math.floor(Math.random() * slots.length)] as 'weapon' | 'helmet' | 'charm';

      // Trouver icône aléatoire
      const iconId = await this.findRandomIcon(slot);

      // Calculer stats
      const baseLevel = this.getRarityLevel(rarity.name);
      const indexDamage = this.calculateIndexDamage(baseLevel);

      // Créer item
      const item = await strapi.documents('api::item.item').create({
        data: {
          name: `${this.getSlotName(slot)} ${rarityName}`,
          slot: slot,
          level: baseLevel,
          index_damage: indexDamage,
          isScrapped: false,
          guild: guildDocumentId,
          rarity: rarity.documentId,
          icon: iconId,
          visits: [visitDocumentId],
          publishedAt: new Date()
        }
      });

      items.push(item);
    }

    // 3. Générer gold et XP
    const gold = Math.floor(Math.random() * 101) + 50;  // 50-150
    const exp = Math.floor(Math.random() * 201) + 100;  // 100-300

    return { items, gold, exp };
  },

  /**
   * Get base level for a rarity
   */
  getRarityLevel(rarityName: string): number {
    const levels = { common: 1, rare: 3, epic: 5, legendary: 8 };
    return levels[rarityName] || 1;
  },

  /**
   * Calculate index_damage based on level
   */
  calculateIndexDamage(level: number): number {
    return level * 10 + Math.floor(Math.random() * 20);
  },

  /**
   * Get display name for a slot
   */
  getSlotName(slot: string): string {
    const names = {
      weapon: 'Arme',
      helmet: 'Casque',
      charm: 'Amulette'
    };
    return names[slot] || 'Item';
  },

  /**
   * Find a random icon from media library for a given slot
   */
  async findRandomIcon(slot: string) {
    const folderMap = {
      weapon: 'weapons',
      helmet: 'helmets',
      charm: 'charms'
    };
    const folderName = folderMap[slot];

    const folder = await strapi.db.query('plugin::upload.folder').findOne({
      where: { name: folderName },
      select: ['id']
    });

    if (!folder) return null;

    const files = await strapi.db.query('plugin::upload.file').findMany({
      where: {
        folder: { id: folder.id },
        mime: { $startsWith: 'image/' }
      },
      select: ['id']
    });

    if (files.length === 0) return null;
    return files[Math.floor(Math.random() * files.length)].id;
  }
}));
