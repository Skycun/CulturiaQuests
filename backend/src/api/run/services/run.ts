/**
 * run service
 */

import { factories } from '@strapi/strapi';

const RARITY_MULTIPLIERS: Record<string, number> = {
  basic: 1,
  common: 1.5,
  rare: 2,
  epic: 3,
  legendary: 5
};

export default factories.createCoreService('api::run.run', ({ strapi }) => ({
  async calculateGuildDPS(guildDocumentId: string): Promise<number> {
    const guild = await strapi.documents('api::guild.guild').findOne({
      documentId: guildDocumentId,
      populate: {
        characters: {
          populate: {
            items: {
              populate: ['rarity']
            }
          }
        }
      }
    });

    if (!guild || !guild.characters) return 0;

    let totalDPS = 0;
    for (const char of guild.characters) {
      if (char.items) {
        for (const item of char.items) {
           const base = Number(item.index_damage) || 0;
           const level = Number(item.level) || 1;
           // Handle populated rarity (can be null or object)
           const rarityName = item.rarity?.name?.toLowerCase() || 'common';
           const multiplier = RARITY_MULTIPLIERS[rarityName] || 1;
           
           totalDPS += Math.floor(base * level * multiplier);
        }
      }
    }
    return totalDPS;
  },

  calculateTierFromDamage(totalDamage: number): number {
    if (totalDamage <= 0) return 1;
    // Formula: floor(log(totalDamage/100) / log(1.5)) + 2
    // If totalDamage < 100, we clamp to min tier 1
    if (totalDamage < 100) return 1;
    
    const val = totalDamage / 100;
    const tier = Math.floor(Math.log(val) / Math.log(1.5)) + 2;
    return Math.max(1, tier);
  },

  calculateRewards(tier: number, totalDamage: number) {
    const gold = Math.floor(tier * 250 + totalDamage / 100);
    const xp = Math.floor(tier * 180 + totalDamage / 150);
    const itemCount = Math.min(4 + Math.floor(tier / 2), 12);
    
    return { gold, xp, itemCount };
  },

  rollQuestChance() {
    // 1/5 chance => 20%
    const rolled = Math.random() < 0.2;
    // target_threshold 5-15
    const targetThreshold = rolled ? Math.floor(Math.random() * 11) + 5 : null;
    return { rolled, targetThreshold };
  }
}));
