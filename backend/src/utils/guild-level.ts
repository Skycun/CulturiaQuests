/**
 * Utilitaires de calcul liés au niveau de guilde.
 * IMPORTANT : La logique de getMaxCharacters doit rester synchronisée
 * avec frontend/app/utils/guildLevel.ts
 */

export function getMaxCharacters(guildLevel: number): number {
  if (guildLevel >= 50) return 4;
  if (guildLevel >= 30) return 3;
  if (guildLevel >= 10) return 2;
  return 1;
}

export function calculateGuildLevel(exp: number): number {
  return Math.floor(Math.sqrt(exp / 75)) + 1;
}
