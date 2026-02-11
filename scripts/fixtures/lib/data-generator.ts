/**
 * Générateur de données avec Faker.js
 */

import { faker } from '@faker-js/faker/locale/fr';
import {
  BASE_REWARDS,
  RARITY_WEIGHTS,
  RARITY_IDS,
  TAG_IDS,
  ITEM_SLOTS,
  ACTIVITY_WEIGHTS,
  FRIENDSHIP_STATUS_WEIGHTS,
  RUN_PARAMS,
  USERNAME_PREFIX,
  DEFAULT_PASSWORD,
} from '../config/generation-config.js';
import { UserPersona, getRewardMultiplier } from './user-persona.js';
import { generateQuizScore } from './activity-distributor.js';

// ==========================================
// Types
// ==========================================

export interface UserData {
  username: string;
  email: string;
  password: string;
  guildName: string;
  characterFirstname: string;
  characterLastname: string;
}

export interface Rewards {
  gold: number;
  xp: number;
}

export interface ItemData {
  name: string;
  slot: (typeof ITEM_SLOTS)[number];
  level: number;
  rarityId: number;
  damage: number;
  iconId: number;
  tags: number[];
}

// ==========================================
// Génération Utilisateurs
// ==========================================

/**
 * Génère des données pour créer un utilisateur
 */
export function generateUserData(index: number, timestamp?: number): UserData {
  const ts = timestamp || Date.now();
  const username = `${USERNAME_PREFIX}${ts}_${String(index).padStart(4, '0')}`;
  const email = `${username}@example.com`;

  return {
    username,
    email,
    password: DEFAULT_PASSWORD,
    guildName: faker.company.name(),
    characterFirstname: faker.person.firstName(),
    characterLastname: faker.person.lastName(),
  };
}

// ==========================================
// Génération Récompenses
// ==========================================

/**
 * Calcule les récompenses pour une activité
 */
export function calculateRewards(
  activityType: 'visit' | 'run' | 'quest',
  persona: UserPersona
): Rewards {
  const base = BASE_REWARDS[activityType];
  const multiplier = getRewardMultiplier(persona);

  const gold = Math.floor(randomInt(base.gold.min, base.gold.max) * multiplier);
  const xp = Math.floor(randomInt(base.xp.min, base.xp.max) * multiplier);

  return { gold, xp };
}

/**
 * Calcule les récompenses d'un quiz basé sur le score
 */
export function calculateQuizRewards(score: number): Rewards {
  const { goldDivisor, xpDivisor } = BASE_REWARDS.quiz;

  return {
    gold: Math.floor(score / goldDivisor),
    xp: Math.floor(score / xpDivisor),
  };
}

// ==========================================
// Génération Items
// ==========================================

/**
 * Génère des données pour un item
 */
export function generateItemData(
  slot: (typeof ITEM_SLOTS)[number],
  iconIds: number[],
  allTags: number[]
): ItemData {
  const { rarityKey, rarityId, damage } = selectRarityAndDamage();
  const level = randomInt(1, 50);
  const iconId = iconIds[Math.floor(Math.random() * iconIds.length)];

  // Legendary = 2 tags, autres = 1 tag
  const tagCount = rarityKey === 'legendary' ? 2 : 1;
  const tags = selectRandomTags(allTags, tagCount);

  return {
    name: generateItemName(slot, rarityKey),
    slot,
    level,
    rarityId,
    damage,
    iconId,
    tags,
  };
}

/**
 * Sélectionne une rareté selon les poids définis
 */
function selectRarityAndDamage(): {
  rarityKey: keyof typeof RARITY_WEIGHTS;
  rarityId: number;
  damage: number;
} {
  const roll = Math.random();
  let cumulative = 0;

  for (const [key, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (roll <= cumulative) {
      const rarityKey = key as keyof typeof RARITY_WEIGHTS;
      const rarityId = RARITY_IDS[rarityKey];
      const damage = getDamageForRarity(rarityKey);
      return { rarityKey, rarityId, damage };
    }
  }

  // Fallback
  return { rarityKey: 'common', rarityId: RARITY_IDS.common, damage: 5 };
}

/**
 * Retourne un dégât aléatoire selon la rareté
 */
function getDamageForRarity(rarity: keyof typeof RARITY_WEIGHTS): number {
  const ranges: Record<keyof typeof RARITY_WEIGHTS, { min: number; max: number }> = {
    common: { min: 1, max: 10 },
    rare: { min: 5, max: 15 },
    epic: { min: 10, max: 20 },
    legendary: { min: 15, max: 25 },
  };

  const range = ranges[rarity];
  return randomInt(range.min, range.max);
}

/**
 * Génère un nom d'item selon le slot et la rareté
 */
function generateItemName(slot: string, rarity: string): string {
  const nouns: Record<string, string[]> = {
    weapon: ['Glaive', 'Hache', 'Dague', 'Bâton', 'Arc', 'Marteau', 'Sceptre', 'Lame', 'Espadon', 'Fléau'],
    helmet: ['Casque', 'Heaume', 'Capuche', 'Couronne', 'Visière', 'Bonnet', 'Tiare', 'Masque', 'Bandeau'],
    charm: ['Anneau', 'Amulette', 'Collier', 'Joyau', 'Talisman', 'Médaillon', 'Pierre', 'Sceau', 'Broche'],
  };

  const adjectives = ['Ancien', 'Rouillé', 'Brillant', 'Maudit', 'Divin', 'Sanglant', 'Éthéré', 'Sombre', 'Royal', 'Perdu', 'Céleste', 'Infernal', 'Runique'];
  const suffixes = ['du Loup', 'de la Nuit', 'du Roi', 'des Ombres', 'de Feu', 'de Glace', 'du Titan', 'Oublié', 'de la Tempête', 'du Dragon', 'des Anciens'];

  const noun = nouns[slot][Math.floor(Math.random() * nouns[slot].length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${noun} ${adjective} ${suffix}`;
}

/**
 * Sélectionne N tags aléatoires
 */
function selectRandomTags(allTags: number[], count: number): number[] {
  const shuffled = [...allTags].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ==========================================
// Sélection Types d'Activités
// ==========================================

/**
 * Sélectionne un type d'activité selon les poids du persona
 */
export function selectActivityType(persona: UserPersona): 'visit' | 'run' | 'quest' | 'quiz' {
  const weights = ACTIVITY_WEIGHTS[persona];
  const roll = Math.random();
  let cumulative = 0;

  for (const [type, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll <= cumulative) {
      return type as 'visit' | 'run' | 'quest' | 'quiz';
    }
  }

  return 'visit'; // Fallback
}

// ==========================================
// Génération Activités
// ==========================================

/**
 * Génère des données pour une visite de POI
 */
export function generateVisitData(guildDocId: string, poiDocId: string, timestamp: Date, persona: UserPersona) {
  const rewards = calculateRewards('visit', persona);
  const chestsOpened = Math.random() < 0.5 ? randomInt(1, 3) : 0;

  return {
    data: {
      guild: guildDocId,
      poi: poiDocId,
      last_opened_at: timestamp.toISOString(),
      total_gold_earned: rewards.gold,
      total_exp_earned: rewards.xp,
      open_count: chestsOpened,
    },
    rewards, // Return rewards separately for tracking
  };
}

/**
 * Génère des données pour une expédition (run)
 */
export function generateRunData(
  guildDocId: string,
  museumDocId: string,
  npcDocId: string,
  timestamp: Date,
  persona: UserPersona
) {
  const rewards = calculateRewards('run', persona);
  const duration = randomInt(RUN_PARAMS.durationMinutes.min, RUN_PARAMS.durationMinutes.max);
  const thresholdReached = randomInt(RUN_PARAMS.maxFloor.min, RUN_PARAMS.maxFloor.max);
  const dps = randomInt(10, 100); // Random DPS value

  const endTime = new Date(timestamp);
  endTime.setMinutes(endTime.getMinutes() + duration);

  return {
    data: {
      guild: guildDocId,
      museum: museumDocId,
      npc: npcDocId,
      date_start: timestamp.toISOString(),
      date_end: endTime.toISOString(),
      gold_earned: rewards.gold,
      xp_earned: rewards.xp,
      dps,
      threshold_reached: thresholdReached,
      target_threshold: thresholdReached + randomInt(1, 3), // Slightly higher target
      entry_unlocked: Math.random() < 0.7, // 70% unlock rate
    },
    rewards, // Return rewards separately for tracking
  };
}

/**
 * Génère des données pour une quête
 */
export function generateQuestData(
  guildDocId: string,
  npcDocId: string,
  poiADocId: string,
  poiBDocId: string,
  timestamp: Date,
  persona: UserPersona
) {
  const rewards = calculateRewards('quest', persona);
  const completionRate = Math.random();
  const isPoiACompleted = completionRate > 0.2; // 80% complete POI A
  const isPoiBCompleted = completionRate > 0.4; // 60% complete POI B

  const duration = randomInt(30, 120); // 30-120 minutes
  const endTime = new Date(timestamp);
  endTime.setMinutes(endTime.getMinutes() + duration);

  return {
    data: {
      guild: guildDocId,
      npc: npcDocId,
      poi_a: poiADocId,
      poi_b: poiBDocId,
      date_start: timestamp.toISOString(),
      date_end: endTime.toISOString(),
      gold_earned: rewards.gold,
      xp_earned: rewards.xp,
      is_poi_a_completed: isPoiACompleted,
      is_poi_b_completed: isPoiBCompleted,
    },
    rewards, // Return rewards separately for tracking
  };
}

/**
 * Génère des données pour une tentative de quiz
 */
export function generateQuizAttemptData(
  guildDocId: string,
  sessionDocId: string,
  timestamp: Date,
  persona: UserPersona
) {
  const score = generateQuizScore(persona);
  const rewards = calculateQuizRewards(score);

  return {
    guild: guildDocId,
    session: sessionDocId,
    date: timestamp.toISOString(),
    score,
    goldEarned: rewards.gold,
    expEarned: rewards.xp,
  };
}

// ==========================================
// Génération Friendships
// ==========================================

/**
 * Sélectionne un status de friendship selon les poids
 */
export function selectFriendshipStatus(): 'accepted' | 'pending' | 'rejected' {
  const roll = Math.random();
  let cumulative = 0;

  for (const [status, weight] of Object.entries(FRIENDSHIP_STATUS_WEIGHTS)) {
    cumulative += weight;
    if (roll <= cumulative) {
      return status as 'accepted' | 'pending' | 'rejected';
    }
  }

  return 'accepted'; // Fallback
}

// ==========================================
// Utilitaires
// ==========================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Mélange un tableau
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
