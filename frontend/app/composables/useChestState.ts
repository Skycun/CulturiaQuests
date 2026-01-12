import type { Poi } from '~/types/poi'
import { useVisitStore } from '~/stores/visit'

/**
 * Composable for managing chest state (available/cooldown) for a given POI
 *
 * @param poi - Reactive POI reference
 * @returns Chest state computed properties
 */
export function useChestState(poi: Ref<Poi>) {
  const visitStore = useVisitStore()

  const poiId = computed(() => poi.value.id || poi.value.documentId)

  const isAvailable = computed(() =>
    visitStore.isChestAvailable(poiId.value)
  )

  const timeRemaining = computed(() =>
    visitStore.getTimeUntilAvailable(poiId.value)
  )

  const formattedTimeRemaining = computed(() =>
    visitStore.formatTimeRemaining(timeRemaining.value)
  )

  const chestIcon = computed(() =>
    isAvailable.value
      ? '/assets/map/chest.png'
      : '/assets/map/chest-opened.png'
  )

  const statusText = computed(() =>
    isAvailable.value
      ? 'Coffre disponible'
      : `Réouverture dans ${formattedTimeRemaining.value}`
  )

  return {
    isAvailable,
    timeRemaining,
    formattedTimeRemaining,
    chestIcon,
    statusText
  }
}
