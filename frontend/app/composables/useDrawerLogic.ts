import type { Character } from '~/types/character'

/**
 * Composable pour la logique commune des drawers Museum/POI
 *
 * @param distanceToUser - Distance en km entre l'utilisateur et l'élément (ref réactive)
 * @param debugMode - Mode debug activé (bypass les vérifications de distance)
 * @returns Computed properties et fonctions pour la gestion des drawers
 */
export function useDrawerLogic(distanceToUser: Ref<number>, debugMode: Ref<boolean> = ref(false)) {
  const config = useRuntimeConfig()

  /**
   * Détermine si l'utilisateur est trop loin de l'élément sélectionné.
   * Seuil : 50 m (0.05 km)
   * Bypass si le mode debug est activé
   */
  const isTooFar = computed<boolean>(() => {
    // Si debug mode activé, on n'est jamais trop loin
    if (debugMode.value) return false
    return distanceToUser.value > 0.05
  })

  /**
   * Formate la distance pour l'affichage.
   * Affiche en mètres si < 1km, en km sinon.
   *
   * @returns Distance formatée avec unité
   * @example
   * // Si distance = 0.35 km
   * formattedDistance.value // "350 m"
   *
   * // Si distance = 1.52 km
   * formattedDistance.value // "1.52 km"
   */
  const formattedDistance = computed<string>(() => {
    if (distanceToUser.value < 1) {
      return `${Math.round(distanceToUser.value * 1000)} m`
    }
    return `${distanceToUser.value.toFixed(2)} km`
  })

  /**
   * Construit l'URL complète de l'icône d'un personnage.
   * Gère les URLs relatives et absolues Strapi.
   *
   * @param char - Personnage dont on veut l'icône
   * @returns URL complète de l'icône ou fallback
   */
  function getCharacterIcon(char: Character): string {
    const icon = char.icon?.data || char.icon
    if (!icon?.url) return '/assets/helmet1.png' // Fallback
    if (icon.url.startsWith('http')) return icon.url
    return `${config.public.strapi.url}${icon.url}`
  }

  return {
    isTooFar,
    formattedDistance,
    getCharacterIcon
  }
}
