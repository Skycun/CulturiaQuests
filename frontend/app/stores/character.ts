import { defineStore } from 'pinia'
import type { Character } from '~/types/character'

export const useCharacterStore = defineStore('character', () => {
  // State
  const characters = ref<Character[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasCharacters = computed(() => characters.value.length > 0)
  const characterCount = computed(() => characters.value.length)

  const charactersByJob = computed(() => {
    return (job: 'hero' | 'mage' | 'archer' | 'soldier') => {
      return characters.value.filter(c =>
        c.job === job || c.attributes?.job === job
      )
    }
  })

  // Actions
  function setCharacters(data: Character[]) {
    characters.value = data
  }

  function clearCharacters() {
    characters.value = []
    error.value = null
  }

  function addCharacter(character: Character) {
    characters.value.push(character)
  }

  function removeCharacter(characterId: number) {
    characters.value = characters.value.filter(c => c.id !== characterId)
  }

  function updateCharacter(characterId: number, updates: Partial<Character>) {
    const index = characters.value.findIndex(c => c.id === characterId)
    if (index !== -1) {
      characters.value[index] = { ...characters.value[index], ...updates }
    }
  }

  async function fetchCharacters() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/characters', {
        method: 'GET',
        params: {
          populate: {
            avatar: true, // L'image du perso
            items: {      // La relation avec les items
              populate: ['image', 'rarity', 'tags'] // Les détails de l'item
            }
          },
        },
      })

      const data = response.data || response
      setCharacters(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error('Failed to fetch characters:', e)
      error.value = e?.message || 'Failed to fetch characters'
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    characters,
    loading,
    error,
    // Getters
    hasCharacters,
    characterCount,
    charactersByJob,
    // Actions
    setCharacters,
    clearCharacters,
    addCharacter,
    removeCharacter,
    updateCharacter,
    fetchCharacters,
  }
}, {
  persist: {
    pick: ['characters'],
  },
})
