/**
 * Configuration centrale pour la génération de fixtures
 */

// ==========================================
// IDs de Référence (correspondent à la base de données)
// ==========================================

export const RARITY_IDS = {
  basic: 1,
  common: 3,
  rare: 5,
  epic: 7,
  legendary: 9,
} as const;

export const TAG_IDS = {
  History: 1,
  Art: 3,
  Science: 5,
  Nature: 34,
  Society: 9,
  Make: 13,
} as const;

// ==========================================
// Distribution des Personas
// ==========================================

export const PERSONA_DISTRIBUTION = {
  HARDCORE: 0.10,  // 10% des utilisateurs
  REGULAR: 0.30,   // 30%
  CASUAL: 0.45,    // 45%
  DORMANT: 0.15,   // 15%
} as const;

// ==========================================
// Paramètres d'Activité par Persona
// ==========================================

export const PERSONA_ACTIVITY_PARAMS = {
  HARDCORE: {
    activitiesPerMonth: { min: 30, max: 50 },
    activeDays: { min: 25, max: 28 },
    streakLength: { min: 3, max: 5 },
    pauseDays: { min: 1, max: 2 },
    quizScoreMean: 1800,
    quizScoreStdDev: 300,
    friendshipsCount: { min: 5, max: 8 },
    npcFriendshipsCount: { min: 3, max: 5 },
  },
  REGULAR: {
    activitiesPerMonth: { min: 15, max: 30 },
    activeDays: { min: 15, max: 20 },
    streakLength: { min: 2, max: 3 },
    pauseDays: { min: 2, max: 4 },
    quizScoreMean: 1400,
    quizScoreStdDev: 350,
    friendshipsCount: { min: 3, max: 6 },
    npcFriendshipsCount: { min: 2, max: 4 },
  },
  CASUAL: {
    activitiesPerMonth: { min: 5, max: 15 },
    activeDays: { min: 8, max: 12 },
    streakLength: { min: 1, max: 2 },
    pauseDays: { min: 3, max: 7 },
    quizScoreMean: 1000,
    quizScoreStdDev: 400,
    friendshipsCount: { min: 2, max: 4 },
    npcFriendshipsCount: { min: 1, max: 3 },
  },
  DORMANT: {
    activitiesPerMonth: { min: 1, max: 5 },
    activeDays: { min: 2, max: 5 },
    streakLength: { min: 1, max: 1 },
    pauseDays: { min: 7, max: 14 },
    quizScoreMean: 600,
    quizScoreStdDev: 300,
    friendshipsCount: { min: 0, max: 2 },
    npcFriendshipsCount: { min: 0, max: 1 },
  },
} as const;

// ==========================================
// Distribution Temporelle (Heures de Pointe)
// ==========================================

export const PEAK_HOURS = {
  MORNING: { hours: [8, 9], weight: 0.20 },        // 8h-9h : 20%
  LUNCH: { hours: [12, 13, 14], weight: 0.30 },    // 12h-14h : 30%
  EVENING: { hours: [18, 19, 20, 21, 22], weight: 0.40 }, // 18h-22h : 40%
  OTHER: { hours: [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 15, 16, 17, 23], weight: 0.10 }, // Autres : 10%
} as const;

// ==========================================
// Poids des Types d'Activités par Persona
// ==========================================

export const ACTIVITY_WEIGHTS = {
  HARDCORE: {
    visit: 0.30,
    run: 0.35,
    quiz: 0.25,
    quest: 0.10,
  },
  REGULAR: {
    visit: 0.35,
    run: 0.30,
    quiz: 0.20,
    quest: 0.15,
  },
  CASUAL: {
    visit: 0.45,
    run: 0.25,
    quiz: 0.20,
    quest: 0.10,
  },
  DORMANT: {
    visit: 0.60,
    run: 0.20,
    quiz: 0.15,
    quest: 0.05,
  },
} as const;

// ==========================================
// Récompenses de Base par Activité
// ==========================================

export const BASE_REWARDS = {
  visit: { gold: { min: 10, max: 50 }, xp: { min: 50, max: 150 } },      // XP x6
  run: { gold: { min: 50, max: 200 }, xp: { min: 200, max: 500 } },      // XP x5
  quest: { gold: { min: 100, max: 300 }, xp: { min: 300, max: 800 } },   // XP x5
  quiz: {
    // Formule : gold = score / 25, xp = score / 10 (au lieu de 50)
    goldDivisor: 25,
    xpDivisor: 10,  // XP x5
  },
} as const;

// ==========================================
// Distribution de Rareté des Items
// ==========================================

export const RARITY_WEIGHTS = {
  common: 0.50,    // 50%
  rare: 0.30,      // 30%
  epic: 0.15,      // 15%
  legendary: 0.05, // 5%
} as const;

// ==========================================
// Items Générés par Persona
// ==========================================

export const ITEMS_PER_PERSONA = {
  HARDCORE: { min: 30, max: 50 },
  REGULAR: { min: 15, max: 30 },
  CASUAL: { min: 5, max: 15 },
  DORMANT: { min: 1, max: 5 },
} as const;

// ==========================================
// Distribution des Slots d'Items
// ==========================================

export const ITEM_SLOTS = ['weapon', 'helmet', 'charm'] as const;

// ==========================================
// Performance & Rate Limiting
// ==========================================

export const RATE_LIMITS = {
  USER_CREATION_DELAY: 100,  // ms entre chaque création d'user (10 users/sec max)
  ACTIVITY_BATCH_SIZE: 2,     // Nombre d'users traités en parallèle (réduit pour éviter 403)
  API_REQUEST_DELAY: 150,      // ms entre requêtes API dans un batch (augmenté pour éviter rate limit)
} as const;

// ==========================================
// Noms de Données de Référence
// ==========================================

export const USERNAME_PREFIX = 'fixture_';
export const DEFAULT_PASSWORD = 'TestPass123!';

// ==========================================
// Période de Simulation
// ==========================================

export const SIMULATION_DAYS = 30; // Dernier mois

// ==========================================
// Status de Friendship
// ==========================================

export const FRIENDSHIP_STATUS_WEIGHTS = {
  accepted: 0.60,  // 60%
  pending: 0.25,   // 25%
  rejected: 0.15,  // 15%
} as const;

// ==========================================
// Run (Expedition) Params
// ==========================================

export const RUN_PARAMS = {
  durationMinutes: { min: 5, max: 30 },
  maxFloor: { min: 1, max: 10 },
} as const;

// ==========================================
// Connection Logs
// ==========================================

export const CONNECTION_LOGS_WEEKS = 12; // 12 semaines de logs
