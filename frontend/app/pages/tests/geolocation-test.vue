<script setup lang="ts">
import { usePOIStore } from '~/stores/poi'
import { useMuseumStore } from '~/stores/museum'
import { calculateDistance } from '~/utils/geolocation'
import type { Poi } from '~/types/poi'
import type { Museum } from '~/types/museum'

const poiStore = usePOIStore()
const museumStore = useMuseumStore()

// Test coordinates (Saint-Lô by default)
const testLat = ref(49.1167)
const testLng = ref(-1.0833)
const testRadius = ref(50)

// Nearby results
const nearbyPOIs = ref<Poi[]>([])
const nearbyMuseums = ref<Museum[]>([])

// Geolocation state
const geolocLoading = ref(false)
const geolocError = ref<string | null>(null)

// Expanded sections state
const expandedSections = ref({
  pois: true,
  nearbyPOIs: false,
  museums: true,
  nearbyMuseums: false,
})

// JSON view toggles
const showJsonView = ref({
  pois: false,
  nearbyPOIs: false,
  museums: false,
  nearbyMuseums: false,
})

// Actions
async function handleFetchAllPOIs() {
  await poiStore.fetchAll()
}

async function handleFetchAllMuseums() {
  await museumStore.fetchAll()
}

function handleClearAll() {
  poiStore.clearPOIs()
  museumStore.clearMuseums()
  nearbyPOIs.value = []
  nearbyMuseums.value = []
}

async function handleFindNearbyPOIs() {
  nearbyPOIs.value = await poiStore.fetchNearby(
    testRadius.value,
    testLat.value,
    testLng.value
  )
  // Sort by distance (closest first)
  nearbyPOIs.value.sort((a, b) => {
    const distA = calculateDistance(
      testLat.value,
      testLng.value,
      a.lat ?? a.attributes?.lat ?? 0,
      a.lng ?? a.attributes?.lng ?? 0
    )
    const distB = calculateDistance(
      testLat.value,
      testLng.value,
      b.lat ?? b.attributes?.lat ?? 0,
      b.lng ?? b.attributes?.lng ?? 0
    )
    return distA - distB
  })
}

async function handleFindNearbyMuseums() {
  nearbyMuseums.value = await museumStore.fetchNearby(
    testRadius.value,
    testLat.value,
    testLng.value
  )
  // Sort by distance (closest first)
  nearbyMuseums.value.sort((a, b) => {
    const distA = calculateDistance(
      testLat.value,
      testLng.value,
      a.lat ?? a.attributes?.lat ?? 0,
      a.lng ?? a.attributes?.lng ?? 0
    )
    const distB = calculateDistance(
      testLat.value,
      testLng.value,
      b.lat ?? b.attributes?.lat ?? 0,
      b.lng ?? b.attributes?.lng ?? 0
    )
    return distA - distB
  })
}

function useMyLocation() {
  if (!navigator.geolocation) {
    geolocError.value = 'Geolocation is not supported by your browser'
    return
  }

  geolocLoading.value = true
  geolocError.value = null

  navigator.geolocation.getCurrentPosition(
    (position) => {
      testLat.value = position.coords.latitude
      testLng.value = position.coords.longitude
      geolocLoading.value = false
    },
    (error) => {
      geolocError.value = error.message || 'Failed to get location'
      geolocLoading.value = false
    }
  )
}

function toggleSection(section: keyof typeof expandedSections.value) {
  expandedSections.value[section] = !expandedSections.value[section]
}

function toggleJsonView(section: keyof typeof showJsonView.value) {
  showJsonView.value[section] = !showJsonView.value[section]
}

function computeDistance(itemLat?: number, itemLng?: number): string {
  if (!itemLat || !itemLng) return 'N/A'
  const dist = calculateDistance(testLat.value, testLng.value, itemLat, itemLng)
  return `${dist} km`
}

// Extract attributes for display (handle Strapi v4/v5 formats)
function getName(item: any): string {
  return item.name || item.attributes?.name || 'Unnamed'
}

function getLat(item: any): number | undefined {
  return item.lat ?? item.attributes?.lat
}

function getLng(item: any): number | undefined {
  return item.lng ?? item.attributes?.lng
}

function getRadius(item: any): number | undefined {
  return item.radius ?? item.attributes?.radius
}

// Layout de test
definePageMeta({
  layout: 'test',
})
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Geolocation Test Dashboard</h1>

    <!-- Global Actions -->
    <div class="flex gap-4 mb-6 flex-wrap">
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="poiStore.loading"
        @click="handleFetchAllPOIs"
      >
        {{ poiStore.loading ? 'Loading...' : 'Fetch All POIs' }}
      </button>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="museumStore.loading"
        @click="handleFetchAllMuseums"
      >
        {{ museumStore.loading ? 'Loading...' : 'Fetch All Museums' }}
      </button>
      <button
        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        @click="handleClearAll"
      >
        Clear All
      </button>
    </div>

    <!-- Test Controls -->
    <div class="mb-6 p-4 bg-gray-100 rounded-lg">
      <h2 class="text-xl font-semibold mb-4">Test Controls</h2>

      <!-- Coordinates -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
          <input
            v-model.number="testLat"
            type="number"
            step="0.0001"
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
          <input
            v-model.number="testLng"
            type="number"
            step="0.0001"
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
          <select
            v-model.number="testRadius"
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option :value="50">50 km</option>
            <option :value="100">100 km</option>
            <option :value="200">200 km</option>
            <option :value="500">500 km</option>
          </select>
        </div>
      </div>

      <!-- Geolocation Button -->
      <div class="mb-4">
        <button
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          :disabled="geolocLoading"
          @click="useMyLocation"
        >
          {{ geolocLoading ? 'Getting location...' : 'Use My Location' }}
        </button>
        <span v-if="geolocError" class="ml-3 text-red-500 text-sm">{{ geolocError }}</span>
      </div>

      <!-- Search Buttons -->
      <div class="flex gap-4 flex-wrap">
        <button
          class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          @click="handleFindNearbyPOIs"
        >
          Find Nearby POIs
        </button>
        <button
          class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          @click="handleFindNearbyMuseums"
        >
          Find Nearby Museums
        </button>
      </div>
    </div>

    <!-- POIs Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-100 cursor-pointer"
        @click="toggleSection('pois')"
      >
        <h2 class="text-xl font-semibold">
          POIs
          <span class="text-gray-400 text-sm ml-2">({{ poiStore.poiCount }} total)</span>
        </h2>
        <div class="flex items-center gap-2">
          <button
            class="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            @click.stop="handleFetchAllPOIs"
          >
            Refetch
          </button>
          <span v-if="poiStore.loading" class="text-yellow-400 text-sm">Loading...</span>
          <span v-if="poiStore.error" class="text-red-400 text-sm">{{ poiStore.error }}</span>
          <span class="text-gray-400">{{ expandedSections.pois ? '▼' : '▶' }}</span>
        </div>
      </div>
      <div v-if="expandedSections.pois" class="p-4 bg-gray-900">
        <div v-if="poiStore.hasPOIs" class="space-y-2">
          <div
            v-for="poi in poiStore.pois"
            :key="poi.id"
            class="p-2 bg-gray-100 rounded text-sm"
          >
            <div class="font-semibold">{{ getName(poi) }}</div>
            <div class="text-gray-400 text-xs mt-1">
              Lat: {{ getLat(poi)?.toFixed(4) || 'N/A' }} |
              Lng: {{ getLng(poi)?.toFixed(4) || 'N/A' }} |
              ID: {{ poi.documentId }}
            </div>
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('pois')"
          >
            {{ showJsonView.pois ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.pois" class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(poiStore.pois, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No POIs loaded</div>
      </div>
    </div>

    <!-- Nearby POIs Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-100 cursor-pointer"
        @click="toggleSection('nearbyPOIs')"
      >
        <h2 class="text-xl font-semibold">
          Nearby POIs
          <span class="text-green-400 text-sm ml-2">({{ nearbyPOIs.length }} within {{ testRadius }} km)</span>
        </h2>
        <span class="text-gray-400">{{ expandedSections.nearbyPOIs ? '▼' : '▶' }}</span>
      </div>
      <div v-if="expandedSections.nearbyPOIs" class="p-4 bg-gray-900">
        <div v-if="nearbyPOIs.length > 0" class="space-y-2">
          <div
            v-for="poi in nearbyPOIs"
            :key="poi.id"
            class="p-2 bg-gray-100 rounded text-sm"
          >
            <div class="flex justify-between items-start">
              <div>
                <div class="font-semibold">{{ getName(poi) }}</div>
                <div class="text-gray-400 text-xs mt-1">
                  Lat: {{ getLat(poi)?.toFixed(4) || 'N/A' }} |
                  Lng: {{ getLng(poi)?.toFixed(4) || 'N/A' }}
                </div>
              </div>
              <div class="text-green-500 font-bold text-sm">
                {{ computeDistance(getLat(poi), getLng(poi)) }}
              </div>
            </div>
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('nearbyPOIs')"
          >
            {{ showJsonView.nearbyPOIs ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.nearbyPOIs" class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(nearbyPOIs, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No nearby POIs found. Click "Find Nearby POIs" to search.</div>
      </div>
    </div>

    <!-- Museums Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-100 cursor-pointer"
        @click="toggleSection('museums')"
      >
        <h2 class="text-xl font-semibold">
          Museums
          <span class="text-gray-400 text-sm ml-2">({{ museumStore.museumCount }} total)</span>
        </h2>
        <div class="flex items-center gap-2">
          <button
            class="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            @click.stop="handleFetchAllMuseums"
          >
            Refetch
          </button>
          <span v-if="museumStore.loading" class="text-yellow-400 text-sm">Loading...</span>
          <span v-if="museumStore.error" class="text-red-400 text-sm">{{ museumStore.error }}</span>
          <span class="text-gray-400">{{ expandedSections.museums ? '▼' : '▶' }}</span>
        </div>
      </div>
      <div v-if="expandedSections.museums" class="p-4 bg-gray-900">
        <div v-if="museumStore.hasMuseums" class="space-y-2">
          <div
            v-for="museum in museumStore.museums"
            :key="museum.id"
            class="p-2 bg-gray-100 rounded text-sm"
          >
            <div class="font-semibold">{{ getName(museum) }}</div>
            <div class="text-gray-400 text-xs mt-1">
              Lat: {{ getLat(museum)?.toFixed(4) || 'N/A' }} |
              Lng: {{ getLng(museum)?.toFixed(4) || 'N/A' }} |
              <span v-if="getRadius(museum)">Radius: {{ getRadius(museum) }}m |</span>
              ID: {{ museum.documentId }}
            </div>
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('museums')"
          >
            {{ showJsonView.museums ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.museums" class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(museumStore.museums, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No museums loaded</div>
      </div>
    </div>

    <!-- Nearby Museums Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-100 cursor-pointer"
        @click="toggleSection('nearbyMuseums')"
      >
        <h2 class="text-xl font-semibold">
          Nearby Museums
          <span class="text-green-400 text-sm ml-2">({{ nearbyMuseums.length }} within {{ testRadius }} km)</span>
        </h2>
        <span class="text-gray-400">{{ expandedSections.nearbyMuseums ? '▼' : '▶' }}</span>
      </div>
      <div v-if="expandedSections.nearbyMuseums" class="p-4 bg-gray-900">
        <div v-if="nearbyMuseums.length > 0" class="space-y-2">
          <div
            v-for="museum in nearbyMuseums"
            :key="museum.id"
            class="p-2 bg-gray-100 rounded text-sm"
          >
            <div class="flex justify-between items-start">
              <div>
                <div class="font-semibold">{{ getName(museum) }}</div>
                <div class="text-gray-400 text-xs mt-1">
                  Lat: {{ getLat(museum)?.toFixed(4) || 'N/A' }} |
                  Lng: {{ getLng(museum)?.toFixed(4) || 'N/A' }}
                  <span v-if="getRadius(museum)">| Radius: {{ getRadius(museum) }}m</span>
                </div>
              </div>
              <div class="text-green-500 font-bold text-sm">
                {{ computeDistance(getLat(museum), getLng(museum)) }}
              </div>
            </div>
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('nearbyMuseums')"
          >
            {{ showJsonView.nearbyMuseums ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.nearbyMuseums" class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(nearbyMuseums, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No nearby museums found. Click "Find Nearby Museums" to search.</div>
      </div>
    </div>
  </div>
</template>
