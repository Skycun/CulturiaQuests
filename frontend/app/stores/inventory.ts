import { defineStore } from 'pinia'
import type { Item } from '~/types/item'

export const useInventoryStore = defineStore('inventory', () => {
  // State
  const items = ref<Item[]>([])
  const availableIcons = ref<any[]>([])
  const loading = ref(false)
  const iconsLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasItems = computed(() => items.value.length > 0)
  const itemCount = computed(() => items.value.length)

  const itemsBySlot = computed(() => {
    return (slot: 'weapon' | 'helmet' | 'charm') => {
      return items.value.filter(i =>
        i.slot === slot || i.attributes?.slot === slot
      )
    }
  })

  const itemsByRarity = computed(() => {
    return (rarityName: string) => {
      return items.value.filter(i => {
        const rarity = i.rarity || i.attributes?.rarity
        return rarity?.name === rarityName || rarity?.data?.attributes?.name === rarityName
      })
    }
  })

  const scrappedItems = computed(() => {
    return items.value.filter(i =>
      i.isScrapped || i.attributes?.isScrapped
    )
  })

  const equippableItems = computed(() => {
    return items.value.filter(i =>
      !(i.isScrapped || i.attributes?.isScrapped)
    )
  })

  // Actions
  function setItems(data: Item[]) {
    items.value = data
  }

  function clearItems() {
    items.value = []
    error.value = null
  }

  function addItem(item: Item) {
    items.value.push(item)
  }

  function removeItem(itemId: number) {
    items.value = items.value.filter(i => i.id !== itemId)
  }

  function updateItem(itemId: number, updates: Partial<Item>) {
    const index = items.value.findIndex(i => i.id === itemId)
    if (index !== -1) {
      items.value[index] = { ...items.value[index], ...updates }
    }
  }

  async function fetchItems() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/items', {
        method: 'GET',
        params: {
          populate: {
            rarity: true,
            tags: true,
            character: true,
            icon: { fields: ['url'] },
          },
        },
      })

      const data = response.data || response
      setItems(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error('Failed to fetch items:', e)
      error.value = e?.message || 'Failed to fetch items'
    } finally {
      loading.value = false
    }
  }

  async function fetchItemIcons() {
    const client = useStrapiClient()
    iconsLoading.value = true
    try {
      const response = await client<any>('/item-icons')
      availableIcons.value = response.data || []
    } catch (e: any) {
      console.error('Failed to fetch item icons:', e)
    } finally {
      iconsLoading.value = false
    }
  }

  return {
    // State
    items,
    availableIcons,
    loading,
    iconsLoading,
    error,
    // Getters
    hasItems,
    itemCount,
    itemsBySlot,
    itemsByRarity,
    scrappedItems,
    equippableItems,
    // Actions
    setItems,
    clearItems,
    addItem,
    removeItem,
    updateItem,
    fetchItems,
    fetchItemIcons,
  }
}, {
  persist: {
    pick: ['items'],
  },
})
