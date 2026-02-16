import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Progression {
  id: number
  documentId: string
  is_completed: boolean
  region?: { documentId: string; id: number }
  department?: { documentId: string; id: number }
  comcom?: { documentId: string; id: number }
}

export const useProgressionStore = defineStore('progression', () => {
  const progressions = ref<Progression[]>([])

  // Maps pour accès rapide (Set de documentId)
  const completedRegionIds = computed(() => {
    const ids = new Set<string>()
    progressions.value.forEach(p => {
      if (p.is_completed && p.region?.documentId) ids.add(p.region.documentId)
    })
    return ids
  })

  const completedDepartmentIds = computed(() => {
    const ids = new Set<string>()
    progressions.value.forEach(p => {
      if (p.is_completed && p.department?.documentId) ids.add(p.department.documentId)
    })
    return ids
  })

  const completedComcomIds = computed(() => {
    const ids = new Set<string>()
    progressions.value.forEach(p => {
      if (p.is_completed && p.comcom?.documentId) ids.add(p.comcom.documentId)
    })
    return ids
  })

  // Actions
  function setProgressions(data: Progression[]) {
    progressions.value = data
  }

  function clearProgressions() {
    progressions.value = []
  }

  function isRegionCompleted(id: string) {
    if (!id) return false
    return completedRegionIds.value.has(id)
  }

  function isDepartmentCompleted(id: string) {
    if (!id) return false
    return completedDepartmentIds.value.has(id)
  }

  function isComcomCompleted(id: string) {
    if (!id) return false
    return completedComcomIds.value.has(id)
  }

  return {
    progressions,
    setProgressions,
    clearProgressions,
    isRegionCompleted,
    isDepartmentCompleted,
    isComcomCompleted
  }
}, {
  persist: {
    pick: ['progressions']
  }
})
