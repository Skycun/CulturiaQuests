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

  calculateRewards(tier: number, totalDamage: number, elapsedSeconds: number) {
    // Gold calculation (based on tier and damage)
    const gold = Math.floor(tier * 250 + totalDamage / 100);

    // XP calculation with Gaussian curve on time
    // Optimal time: 5 minutes (300s), rewards decrease after that
    const OPTIMAL_TIME = 300; // 5 minutes in seconds
    const VARIANCE = 180; // Controls the width of the curve (3 minutes variance)
    const BASE_XP_PER_TIER = 200; // Base XP multiplied by tier

    // Gaussian function: exp(-((t - optimal)^2) / (2 * variance^2))
    const timeDiff = elapsedSeconds - OPTIMAL_TIME;
    const gaussianMultiplier = Math.exp(-(timeDiff * timeDiff) / (2 * VARIANCE * VARIANCE));

    // XP = base_xp * tier * gaussian_multiplier
    // Add a minimum multiplier to ensure some XP is always earned
    const finalMultiplier = Math.max(0.1, gaussianMultiplier); // Minimum 10% of XP
    const xp = Math.floor(BASE_XP_PER_TIER * tier * finalMultiplier);

    // Item count (based on tier)
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
