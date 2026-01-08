import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Interface defining the shape of our statistics
export interface GuildStatistics {
  totalExpeditions: number
  totalTime: number // in milliseconds
  maxFloor: number
  totalDamage: number
  totalPoiVisits: number
  totalDistinctPois: number
  totalItemsCollected: number
  totalItemsScrapped: number
  totalScrapAccumulated: number
  totalExp: number
  accountDays: number
}

export const useStatisticsStore = defineStore('statistics', () => {
  // --- State ---
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Initialize individual refs for each stat to allow fine-grained reactivity
  const totalExpeditions = ref(0)
  const totalTime = ref(0)
  const maxFloor = ref(0)
  const totalDamage = ref(0)
  const totalPoiVisits = ref(0)
  const totalDistinctPois = ref(0)
  const totalItemsCollected = ref(0)
  const totalItemsScrapped = ref(0)
  const totalScrapAccumulated = ref(0)
  const totalExp = ref(0)
  const totalGold = ref(0)
  const accountDays = ref(0)

  // --- Getters (Computed) ---
  // Formatted getters for display purposes
  const formattedTotalTime = computed(() => {
    const ms = totalTime.value
    const seconds = Math.floor(ms / 1000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  })

  const formattedTotalDamage = computed(() => {
    const val = totalDamage.value
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k'
    return Math.floor(val).toString()
  })

  const formattedTotalExp = computed(() => {
    const val = totalExp.value
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k'
    return Math.floor(val).toString()
  })

  // --- Actions ---

  /**
   * Helper to fetch all pages from a specific Strapi endpoint
   */
  async function fetchAllPages(endpoint: string, populateParams: any): Promise<any[]> {
    const client = useStrapiClient()
    let allData: any[] = []
    let page = 1
    let pageCount = 1

    try {
      do {
        const response = await client<any>(endpoint, {
          method: 'GET',
          params: {
            populate: populateParams,
            'pagination[page]': page,
            'pagination[pageSize]': 100
          }
        })
        
        const data = response.data || []
        const meta = response.meta || {}
        
        if (Array.isArray(data)) {
          allData = [...allData, ...data]
        }
        
        pageCount = meta.pagination?.pageCount || 1
        page++
      } while (page <= pageCount)
    } catch (e) {
      console.error(`Failed to fetch ${endpoint}:`, e)
      // Don't throw, just return partial data to avoid breaking everything
    }

    return allData
  }

  /**
   * Calculates scrap value based on item rarity, level and damage index.
   * Replicates the formula from EquipmentOverlay.vue
   */
  function calculateScrapValue(item: any): number {
    const attr = item.attributes || item
    const level = attr.level || 1
    const damage = attr.index_damage || 0
    
    const rarityObj = attr.rarity
    // Handle both populated object and flattened response
    const rarityName = (rarityObj?.data?.attributes?.name || rarityObj?.name || 'basic').toLowerCase()
    
    const multipliers: Record<string, number> = {
      basic: 1, common: 2, rare: 5, epic: 10, legendary: 20
    }
    
    const rarityMult = multipliers[rarityName] || 1
    return Math.floor((level * rarityMult) + (damage / 2))
  }
  
  /**
   * Main entry point to calculate all statistics.
   * Fetches all pages of Runs, Visits, and Items to aggregate data.
   */
  async function fetchStatistics() {
    isLoading.value = true
    error.value = null
    const client = useStrapiClient()

    try {
      // 1. Fetch User for account age
      const userRes = await client<any>('/users/me')
      if (userRes && userRes.createdAt) {
        const created = new Date(userRes.createdAt)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - created.getTime())
        accountDays.value = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
      }

      // 2. Fetch all collections in parallel
      const [runs, visits, items, quests, guildRes] = await Promise.all([
        fetchAllPages('/runs', '*'),
        fetchAllPages('/visits', '*'),
        fetchAllPages('/items', { rarity: true }),
        fetchAllPages('/quests', '*'),
        client<any>('/guilds')
      ])

      // 3. Process Runs
      totalExpeditions.value = runs.length
      
      let tTime = 0
      let tDamage = 0
      let tMaxFloor = 0
      let tTotalGold = 0

      for (const run of runs) {
        const attr = run.attributes || run
        
        // Time & Damage
        if (attr.date_start && attr.date_end) {
          const start = new Date(attr.date_start).getTime()
          const end = new Date(attr.date_end).getTime()
          const duration = end - start
          if (duration > 0) {
            tTime += duration
            // Damage = DPS * Duration(s)
            if (attr.dps) {
              tDamage += attr.dps * (duration / 1000)
            }
          }
        }

        // Floor
        if (attr.threshold_reached && attr.threshold_reached > tMaxFloor) {
          tMaxFloor = attr.threshold_reached
        }

        // Gold
        if (attr.gold_earned) {
            tTotalGold += attr.gold_earned
        }
      }
      totalTime.value = tTime
      totalDamage.value = tDamage
      maxFloor.value = tMaxFloor

      // 4. Process Visits
      let tPoiVisits = 0
      totalDistinctPois.value = visits.length 

      for (const visit of visits) {
        const attr = visit.attributes || visit
        if (attr.open_count) tPoiVisits += attr.open_count
        if (attr.total_gold_earned) tTotalGold += attr.total_gold_earned
      }
      totalPoiVisits.value = tPoiVisits
      
      // 5. Process Items
      totalItemsCollected.value = items.length
      
      let tScrapped = 0
      let tScrapValue = 0
      
      for (const item of items) {
        const attr = item.attributes || item
        if (attr.isScrapped) {
          tScrapped++
          tScrapValue += calculateScrapValue(item)
        }
      }
      totalItemsScrapped.value = tScrapped
      totalScrapAccumulated.value = tScrapValue

      // 6. Process Quests
      for (const quest of quests) {
        const attr = quest.attributes || quest
        if (attr.gold_earned) {
            tTotalGold += attr.gold_earned
        }
      }
      totalGold.value = tTotalGold

      // 7. Total Exp (from Guild)
      const guildData = Array.isArray(guildRes.data) ? guildRes.data[0] : (guildRes.data || guildRes)
      totalExp.value = guildData?.attributes?.exp ?? guildData?.exp ?? 0

    } catch (e: any) {
      console.error('Error calculating statistics:', e)
      error.value = e.message || 'Error calculating statistics'
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    isLoading,
    error,
    totalExpeditions,
    totalTime,
    maxFloor,
    totalDamage,
    totalPoiVisits,
    totalDistinctPois,
    totalItemsCollected,
    totalItemsScrapped,
    totalScrapAccumulated,
    totalExp,
    totalGold,
    accountDays,

    // Getters
    formattedTotalTime,
    formattedTotalDamage,
    formattedTotalExp,

    // Actions
    fetchStatistics
  }
})
