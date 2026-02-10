<template>
  <div class="p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-power text-white tracking-wide">Carte & Geolocalisation</h1>
      <p class="text-gray-400 mt-1 font-onest text-sm">Points d'interet et musees enregistres</p>
    </div>

    <!-- Loading State -->
    <div v-if="adminStore.loading && !adminStore.mapData" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div v-for="i in 2" :key="i" class="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
          <div class="h-5 bg-gray-800 rounded w-40 mb-4" />
          <div class="space-y-3">
            <div v-for="j in 5" :key="j" class="h-10 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="adminStore.error" class="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
      <Icon name="bx-error-circle" class="w-8 h-8 text-red-400 mx-auto mb-2" />
      <p class="text-red-300 font-onest">{{ adminStore.error }}</p>
      <button class="mt-3 text-sm text-red-400 hover:text-red-300 underline" @click="adminStore.fetchMapData()">
        Reessayer
      </button>
    </div>

    <!-- Data -->
    <div v-else-if="adminStore.mapData" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- POI Table -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div class="p-6 border-b border-gray-800">
            <h2 class="text-lg font-power text-white">Points d'interet</h2>
            <p class="text-xs text-gray-500 font-onest mt-1">{{ sortedPois.length }} POIs enregistres</p>
          </div>
          <div class="overflow-x-auto">
            <table v-if="sortedPois.length > 0" class="w-full text-sm font-onest">
              <thead>
                <tr class="text-gray-500 border-b border-gray-800 text-left">
                  <th class="py-3 px-4">Nom</th>
                  <th class="py-3 px-4 text-right">Lat / Lng</th>
                  <th class="py-3 px-4 text-right">Visites</th>
                  <th class="py-3 px-4 text-right">Visiteurs</th>
                  <th class="py-3 px-4 text-right">Or genere</th>
                  <th class="py-3 px-4 text-right">Quetes</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="poi in sortedPois"
                  :key="poi.id"
                  class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td class="py-3 px-4 text-white font-medium max-w-[200px] truncate">{{ poi.name }}</td>
                  <td class="py-3 px-4 text-right text-gray-400 text-xs whitespace-nowrap">
                    {{ formatCoord(poi.lat) }}, {{ formatCoord(poi.lng) }}
                  </td>
                  <td class="py-3 px-4 text-right text-amber-400 font-medium">{{ poi.totalVisits ?? 0 }}</td>
                  <td class="py-3 px-4 text-right text-gray-300">{{ poi.uniqueVisitors ?? 0 }}</td>
                  <td class="py-3 px-4 text-right text-amber-300">{{ poi.goldGenerated ?? 0 }}</td>
                  <td class="py-3 px-4 text-right text-gray-300">{{ poi.questCount ?? 0 }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="py-12 text-center">
              <Icon name="bx-map" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p class="text-gray-500 font-onest">Aucun point d'interet enregistre</p>
            </div>
          </div>
        </div>

        <!-- Museum Table -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div class="p-6 border-b border-gray-800">
            <h2 class="text-lg font-power text-white">Musees</h2>
            <p class="text-xs text-gray-500 font-onest mt-1">{{ sortedMuseums.length }} musees enregistres</p>
          </div>
          <div class="overflow-x-auto">
            <table v-if="sortedMuseums.length > 0" class="w-full text-sm font-onest">
              <thead>
                <tr class="text-gray-500 border-b border-gray-800 text-left">
                  <th class="py-3 px-4">Nom</th>
                  <th class="py-3 px-4 text-right">Lat / Lng</th>
                  <th class="py-3 px-4 text-center">Tags</th>
                  <th class="py-3 px-4 text-right">Expeditions</th>
                  <th class="py-3 px-4 text-right">Or genere</th>
                  <th class="py-3 px-4 text-right">Etage max</th>
                  <th class="py-3 px-4 text-right">Duree moy.</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="museum in sortedMuseums"
                  :key="museum.id"
                  class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td class="py-3 px-4 text-white font-medium max-w-[180px] truncate">{{ museum.name }}</td>
                  <td class="py-3 px-4 text-right text-gray-400 text-xs whitespace-nowrap">
                    {{ formatCoord(museum.lat) }}, {{ formatCoord(museum.lng) }}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="flex flex-wrap gap-1 justify-center">
                      <span
                        v-for="tag in (museum.tags || [])"
                        :key="tag"
                        class="inline-block px-2 py-0.5 rounded text-xs font-medium"
                        :class="tagColor(tag)"
                      >
                        {{ tag }}
                      </span>
                      <span v-if="!museum.tags || museum.tags.length === 0" class="text-gray-600 text-xs">-</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-right text-amber-400 font-medium">{{ museum.totalRuns ?? 0 }}</td>
                  <td class="py-3 px-4 text-right text-amber-300">{{ museum.goldGenerated ?? 0 }}</td>
                  <td class="py-3 px-4 text-right text-gray-300">{{ museum.maxFloor ?? 0 }}</td>
                  <td class="py-3 px-4 text-right text-gray-300">{{ formatDuration(museum.avgDuration) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="py-12 text-center">
              <Icon name="bxs-bank" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p class="text-gray-500 font-onest">Aucun musee enregistre</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['admin'],
})

const adminStore = useAdminStore()

onMounted(() => {
  adminStore.fetchMapData()
})

// Sorted data
const sortedPois = computed(() => {
  const pois = adminStore.mapData?.pois || []
  return [...pois].sort((a: any, b: any) => (b.totalVisits ?? 0) - (a.totalVisits ?? 0))
})

const sortedMuseums = computed(() => {
  const museums = adminStore.mapData?.museums || []
  return [...museums].sort((a: any, b: any) => (b.totalRuns ?? 0) - (a.totalRuns ?? 0))
})

// Helpers
function formatCoord(val: number | null | undefined): string {
  if (val == null) return '-'
  return val.toFixed(4)
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms === 0) return '-'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function tagColor(tag: string): string {
  const map: Record<string, string> = {
    'Histoire': 'bg-amber-400/10 text-amber-400',
    'Art': 'bg-purple-400/10 text-purple-400',
    'Sciences': 'bg-blue-400/10 text-blue-400',
    'Nature': 'bg-emerald-400/10 text-emerald-400',
    'Societe': 'bg-red-400/10 text-red-400',
    'Savoir Faire': 'bg-cyan-400/10 text-cyan-400',
  }
  return map[tag] || 'bg-gray-700 text-gray-400'
}
</script>
