/**
 * Retourne le nombre maximum de personnages autorisé selon le niveau de guilde.
 * IMPORTANT : Cette logique doit rester synchronisée avec backend/src/utils/guild-level.ts
 */
export function getMaxCharacters(guildLevel: number): number {
  if (guildLevel >= 50) return 4;
  if (guildLevel >= 30) return 3;
  if (guildLevel >= 10) return 2;
  return 1;
}
