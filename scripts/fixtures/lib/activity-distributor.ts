/**
 * Distribution temporelle des activités
 */

import { PEAK_HOURS, SIMULATION_DAYS } from '../config/generation-config.js';
import { UserPersona, getPersonaParams } from './user-persona.js';

/**
 * Génère une distribution réaliste d'activités sur N jours
 * Retourne un tableau de timestamps (en millisecondes)
 */
export function distributeActivities(persona: UserPersona, days: number = SIMULATION_DAYS): Date[] {
  const params = getPersonaParams(persona);
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const activitiesCount = randomInt(params.activitiesPerMonth.min, params.activitiesPerMonth.max);
  const activeDaysCount = randomInt(params.activeDays.min, params.activeDays.max);

  // Sélectionner des jours actifs avec clustering (streaks)
  const activeDays = generateActiveStreaks(days, activeDaysCount, params.streakLength, params.pauseDays);

  // Distribuer les activités sur les jours actifs
  const timestamps: Date[] = [];
  const activitiesPerDay = distributeCountOverDays(activitiesCount, activeDays);

  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    const dayActivityCount = activitiesPerDay[dayIndex] || 0;

    for (let i = 0; i < dayActivityCount; i++) {
      const hour = selectPeakHour();
      const minute = randomInt(0, 59);
      const second = randomInt(0, 59);

      const timestamp = new Date(startDate);
      timestamp.setDate(timestamp.getDate() + dayIndex);
      timestamp.setHours(hour, minute, second, 0);

      timestamps.push(timestamp);
    }
  }

  // Trier chronologiquement
  return timestamps.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Génère des jours actifs avec pattern de streaks
 */
function generateActiveStreaks(
  totalDays: number,
  targetActiveDays: number,
  streakLength: { min: number; max: number },
  pauseDays: { min: number; max: number }
): number[] {
  const activeDays: number[] = [];
  let currentDay = 0;

  while (activeDays.length < targetActiveDays && currentDay < totalDays) {
    const streakLen = Math.min(
      randomInt(streakLength.min, streakLength.max),
      targetActiveDays - activeDays.length
    );

    // Ajouter streak
    for (let i = 0; i < streakLen && currentDay < totalDays; i++) {
      activeDays.push(currentDay);
      currentDay++;
    }

    // Pause entre streaks
    if (activeDays.length < targetActiveDays) {
      currentDay += randomInt(pauseDays.min, pauseDays.max);
    }
  }

  return activeDays;
}

/**
 * Distribue un nombre d'activités sur des jours spécifiques
 */
function distributeCountOverDays(totalCount: number, activeDays: number[]): number[] {
  const distribution = new Array(activeDays[activeDays.length - 1] + 1).fill(0);

  for (let i = 0; i < totalCount; i++) {
    const randomDay = activeDays[Math.floor(Math.random() * activeDays.length)];
    distribution[randomDay]++;
  }

  return distribution;
}

/**
 * Sélectionne une heure selon les poids définis (peak hours)
 */
function selectPeakHour(): number {
  const roll = Math.random();
  let cumulative = 0;

  for (const [_period, config] of Object.entries(PEAK_HOURS)) {
    cumulative += config.weight;
    if (roll <= cumulative) {
      return config.hours[Math.floor(Math.random() * config.hours.length)];
    }
  }

  // Fallback
  return randomInt(0, 23);
}

/**
 * Génère un score de quiz selon une distribution gaussienne
 */
export function generateQuizScore(persona: UserPersona): number {
  const params = getPersonaParams(persona);
  const mean = params.quizScoreMean;
  const stdDev = params.quizScoreStdDev;

  // Box-Muller transform pour distribution normale
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  const score = Math.round(mean + z * stdDev);

  // Clamp entre 0 et 2500
  return Math.max(0, Math.min(2500, score));
}

/**
 * Utilitaire : entier aléatoire entre min et max (inclus)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Génère des logs de connexion pour les dernières N semaines
 */
export function generateConnectionLogs(userActivities: Date[], weeks: number): Date[] {
  // Pour simplifier : on crée une connexion au début de chaque jour actif
  const uniqueDays = new Set<string>();
  const connectionLogs: Date[] = [];

  for (const activity of userActivities) {
    const dayKey = activity.toISOString().split('T')[0];
    if (!uniqueDays.has(dayKey)) {
      uniqueDays.add(dayKey);
      // Connexion à l'heure de la première activité du jour (approximation)
      connectionLogs.push(new Date(activity));
    }
  }

  return connectionLogs;
}
