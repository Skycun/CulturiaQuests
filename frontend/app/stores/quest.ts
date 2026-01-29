import { defineStore } from 'pinia'
import type { Quest } from '~/types/quest'

export const useQuestStore = defineStore('quest', () => {
  // State
  const quests = ref<Quest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasQuests = computed(() => quests.value.length > 0)
  const questCount = computed(() => quests.value.length)

  const activeQuests = computed(() => {
    return quests.value.filter(q => {
      const isPoiACompleted = q.is_poi_a_completed ?? q.attributes?.is_poi_a_completed
      const isPoiBCompleted = q.is_poi_b_completed ?? q.attributes?.is_poi_b_completed
      return !isPoiACompleted || !isPoiBCompleted
    })
  })

  const availableQuests = computed(() => {
    const today = new Date().toDateString()

    return quests.value.filter(q => {
      const attrs = q.attributes || q
      if (!attrs.date_start) return false
      
      const questDate = new Date(attrs.date_start).toDateString()
      return questDate === today
    })
  })

  const completedQuests = computed(() => {
    return quests.value.filter(q => {
      const isPoiACompleted = q.is_poi_a_completed ?? q.attributes?.is_poi_a_completed
      const isPoiBCompleted = q.is_poi_b_completed ?? q.attributes?.is_poi_b_completed
      return isPoiACompleted && isPoiBCompleted
    })
  })

  const activeQuestCount = computed(() => activeQuests.value.length)
  const completedQuestCount = computed(() => completedQuests.value.length)

  // Actions
  function setQuests(data: Quest[]) {
    quests.value = data
  }

  function clearQuests() {
    quests.value = []
    error.value = null
  }

  function addQuest(quest: Quest) {
    quests.value.push(quest)
  }

  function removeQuest(questId: number) {
    quests.value = quests.value.filter(q => q.id !== questId)
  }

  function updateQuest(questId: number, updates: Partial<Quest>) {
    const index = quests.value.findIndex(q => q.id === questId)
    if (index !== -1) {
      quests.value[index] = { ...quests.value[index], ...updates }
    }
  }

  function updateQuestProgress(questId: number, poiCompleted: 'a' | 'b') {
    const index = quests.value.findIndex(q => q.id === questId)
    if (index !== -1) {
      if (poiCompleted === 'a') {
        quests.value[index] = { ...quests.value[index], is_poi_a_completed: true }
      } else {
        quests.value[index] = { ...quests.value[index], is_poi_b_completed: true }
      }
    }
  }

  async function fetchQuests() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/quests', {
        method: 'GET',
        params: {
          populate: ['npc', 'poi_a', 'poi_b'],
        },
      })

      const data = response.data || response
      setQuests(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error('Failed to fetch quests:', e)
      error.value = e?.message || 'Failed to fetch quests'
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    quests,
    loading,
    error,
    // Getters
    hasQuests,
    questCount,
    activeQuests,
    availableQuests,
    completedQuests,
    activeQuestCount,
    completedQuestCount,
    // Actions
    setQuests,
    clearQuests,
    addQuest,
    removeQuest,
    updateQuest,
    updateQuestProgress,
    fetchQuests,
  }
})
// Persistance supprimée - les quests sont rechargés via guildStore.fetchAll()
// Les quêtes contiennent des relations imbriquées (npc, poi_a, poi_b)
// et leur état change fréquemment - le serveur est la source de vérité
