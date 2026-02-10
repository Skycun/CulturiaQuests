/**
 * Gestion des personas utilisateur
 */

import { PERSONA_DISTRIBUTION, PERSONA_ACTIVITY_PARAMS } from '../config/generation-config.js';

export enum UserPersona {
  HARDCORE = 'HARDCORE',
  REGULAR = 'REGULAR',
  CASUAL = 'CASUAL',
  DORMANT = 'DORMANT',
}

/**
 * Détermine le persona d'un utilisateur en fonction de son index
 * Distribution basée sur PERSONA_DISTRIBUTION
 */
export function assignPersona(userIndex: number, totalUsers: number): UserPersona {
  const ratio = userIndex / totalUsers;

  if (ratio < PERSONA_DISTRIBUTION.HARDCORE) {
    return UserPersona.HARDCORE;
  }
  if (ratio < PERSONA_DISTRIBUTION.HARDCORE + PERSONA_DISTRIBUTION.REGULAR) {
    return UserPersona.REGULAR;
  }
  if (ratio < PERSONA_DISTRIBUTION.HARDCORE + PERSONA_DISTRIBUTION.REGULAR + PERSONA_DISTRIBUTION.CASUAL) {
    return UserPersona.CASUAL;
  }
  return UserPersona.DORMANT;
}

/**
 * Retourne les paramètres d'activité d'un persona
 */
export function getPersonaParams(persona: UserPersona) {
  return PERSONA_ACTIVITY_PARAMS[persona];
}

/**
 * Calcule un multiplicateur de récompenses basé sur le persona
 */
export function getRewardMultiplier(persona: UserPersona): number {
  switch (persona) {
    case UserPersona.HARDCORE:
      return 1.2;
    case UserPersona.REGULAR:
      return 1.0;
    case UserPersona.CASUAL:
      return 0.9;
    case UserPersona.DORMANT:
      return 0.8;
    default:
      return 1.0;
  }
}

/**
 * Génère un nom d'affichage pour le persona
 */
export function getPersonaDisplayName(persona: UserPersona): string {
  const names = {
    [UserPersona.HARDCORE]: '⚔️  Hardcore',
    [UserPersona.REGULAR]: '🎮 Regular',
    [UserPersona.CASUAL]: '🌟 Casual',
    [UserPersona.DORMANT]: '💤 Dormant',
  };
  return names[persona];
}
