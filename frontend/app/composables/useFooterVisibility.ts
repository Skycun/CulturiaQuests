/**
 * Composable pour gérer la visibilité du footer de navigation
 * Utilisé notamment pour masquer le footer quand un overlay est ouvert
 */
import { ref } from 'vue'

// État global partagé entre tous les composants
const isFooterVisible = ref(true)

export function useFooterVisibility() {
  const showFooter = () => {
    isFooterVisible.value = true
  }

  const hideFooter = () => {
    isFooterVisible.value = false
  }

  const toggleFooter = () => {
    isFooterVisible.value = !isFooterVisible.value
  }

  return {
    isFooterVisible: readonly(isFooterVisible),
    showFooter,
    hideFooter,
    toggleFooter,
  }
}
