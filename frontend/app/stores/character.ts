import { defineStore } from 'pinia'
import type { Character, CharacterFormData } from '~/types/character'
import type { StrapiMedia } from '~/types/strapi'

export const useCharacterStore = defineStore('character', () => {
  // State
  const characters = ref<Character[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // State for icons
  const availableIcons = ref<StrapiMedia[]>([])
  const iconsLoading = ref(false)

  // Getters
  const hasCharacters = computed(() => characters.value.length > 0)
  const characterCount = computed(() => characters.value.length)

  const getCharacterById = computed(() => {
    return (id: number) => characters.value.find(c => c.id === id)
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

  async function fetchCharacters(withItems: boolean = false) {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      // Construct populate object conditionally
      const populateConfig: any = {
        icon: { fields: ['id', 'documentId', 'url', 'name'] },
      }

      if (withItems) {
        populateConfig.items = {
          populate: {
            rarity: true,
            tags: true,
            icon: { fields: ['url'] },
          },
        }
      }

      const response = await client<any>('/characters', {
        method: 'GET',
        params: {
          populate: populateConfig,
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

  async function fetchCharacterIcons() {
    const client = useStrapiClient()
    iconsLoading.value = true

    try {
      const response = await client<any>('/character/list-icons', {
        method: 'GET',
      })

      const data = response.data || response
      availableIcons.value = Array.isArray(data) ? data : []
    } catch (e: any) {
      console.error('Failed to fetch character icons:', e)
      availableIcons.value = []
    } finally {
      iconsLoading.value = false
    }
  }

  async function createCharacter(data: CharacterFormData): Promise<Character | null> {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/characters', {
        method: 'POST',
        body: {
          data: {
            firstname: data.firstname,
            lastname: data.lastname,
            icon: data.iconId || null,
          },
        },
      })

      const created = response.data || response
      if (created) {
        await fetchCharacters()
        return created
      }
      return null
    } catch (e: any) {
      console.error('Failed to create character:', e)
      error.value = e?.message || 'Failed to create character'
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveCharacter(documentId: string, data: CharacterFormData): Promise<boolean> {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      await client<any>(`/characters/${documentId}`, {
        method: 'PUT',
        body: {
          data: {
            firstname: data.firstname,
            lastname: data.lastname,
            icon: data.iconId || null,
          },
        },
      })

      await fetchCharacters()
      return true
    } catch (e: any) {
      console.error('Failed to update character:', e)
      error.value = e?.message || 'Failed to update character'
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteCharacter(documentId: string): Promise<boolean> {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      await client<any>(`/characters/${documentId}`, {
        method: 'DELETE',
      })

      characters.value = characters.value.filter(c => c.documentId !== documentId)
      return true
    } catch (e: any) {
      console.error('Failed to delete character:', e)
      error.value = e?.message || 'Failed to delete character'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    characters,
    loading,
    error,
    availableIcons,
    iconsLoading,
    // Getters
    hasCharacters,
    characterCount,
    getCharacterById,
    // Actions
    setCharacters,
    clearCharacters,
    addCharacter,
    removeCharacter,
    updateCharacter,
    fetchCharacters,
    fetchCharacterIcons,
    createCharacter,
    saveCharacter,
    deleteCharacter,
  }
}, {
  persist: {
    pick: ['characters'],
  },
})
