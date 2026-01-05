<template>
  <div class="p-6 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 font-pixel text-indigo-600">Test Images Strapi</h1>

    <!-- Configuration Info -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h2 class="text-xl font-semibold mb-3 text-blue-900">Configuration Strapi</h2>
      <div class="space-y-2 text-sm font-mono">
        <div><strong>Public URL:</strong> {{ config.public.strapi.url }}</div>
        <div><strong>SSR URL:</strong> {{ config.strapi?.url || 'N/A' }}</div>
      </div>
    </div>

    <!-- Test Character Icons -->
    <div class="bg-white border rounded-lg p-6 mb-6 shadow-sm">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Character Icons Test</h2>
        <button
          @click="loadIcons"
          class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          :disabled="iconsLoading"
        >
          {{ iconsLoading ? 'Chargement...' : 'Recharger les icônes' }}
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="iconsLoading" class="text-center py-8 text-gray-500">
        Chargement des icônes...
      </div>

      <!-- Error State -->
      <div v-else-if="iconsError" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
        <strong>Erreur:</strong> {{ iconsError }}
      </div>

      <!-- Empty State -->
      <div v-else-if="icons.length === 0" class="text-center py-8 text-gray-500">
        Aucune icône trouvée. Assurez-vous que l'endpoint /character-icons existe dans Strapi.
      </div>

      <!-- Icons Display -->
      <div v-else>
        <div class="mb-4 text-sm text-gray-600">
          <strong>Total icônes chargées:</strong> {{ icons.length }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(icon, index) in icons"
            :key="icon.id || index"
            class="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <!-- Icon Preview -->
            <div class="mb-3">
              <div class="aspect-square rounded bg-gray-100 overflow-hidden border-2 border-gray-300">
                <img
                  :src="formatUrl(icon.url)"
                  :alt="icon.name || `Icon ${index + 1}`"
                  class="w-full h-full object-cover"
                  @error="handleImageError($event, icon)"
                  @load="handleImageLoad(icon)"
                />
              </div>
            </div>

            <!-- Icon Details -->
            <div class="space-y-2 text-xs font-mono bg-gray-50 p-2 rounded">
              <div><strong>ID:</strong> {{ icon.id }}</div>
              <div v-if="icon.documentId"><strong>documentId:</strong> {{ icon.documentId }}</div>
              <div v-if="icon.name"><strong>Name:</strong> {{ icon.name }}</div>

              <div class="pt-2 border-t">
                <strong>URL brute:</strong>
                <div class="break-all text-blue-600">{{ icon.url }}</div>
              </div>

              <div class="pt-2 border-t">
                <strong>URL formatée:</strong>
                <div class="break-all text-green-600">{{ formatUrl(icon.url) }}</div>
              </div>

              <div class="pt-2 border-t" :class="icon._loadStatus === 'loaded' ? 'text-green-600' : 'text-red-600'">
                <strong>Statut:</strong> {{ icon._loadStatus || 'loading...' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Raw API Response -->
    <div class="bg-white border rounded-lg p-6 shadow-sm">
      <h2 class="text-xl font-semibold mb-4">Réponse API brute</h2>
      <div v-if="rawResponse" class="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-auto max-h-96">
        <pre>{{ JSON.stringify(rawResponse, null, 2) }}</pre>
      </div>
      <div v-else class="text-gray-500 text-center py-8">
        Cliquez sur "Recharger les icônes" pour voir la réponse API
      </div>
    </div>

    <!-- Test avec une URL directe -->
    <div class="bg-white border rounded-lg p-6 mt-6 shadow-sm">
      <h2 class="text-xl font-semibold mb-4">Test URL manuelle</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Entrez une URL d'image Strapi:</label>
          <input
            v-model="testUrl"
            type="text"
            placeholder="/uploads/image_123.png"
            class="w-full border rounded px-3 py-2 font-mono text-sm"
          />
        </div>
        <div v-if="testUrl" class="space-y-2">
          <div class="text-sm"><strong>URL formatée:</strong></div>
          <div class="bg-gray-100 p-2 rounded font-mono text-xs break-all">{{ formatUrl(testUrl) }}</div>
          <div class="mt-4">
            <div class="text-sm mb-2"><strong>Aperçu:</strong></div>
            <div class="aspect-square max-w-xs border-2 rounded overflow-hidden">
              <img
                :src="formatUrl(testUrl)"
                alt="Test image"
                class="w-full h-full object-cover"
                @error="testImageError = true"
                @load="testImageError = false"
              />
            </div>
            <div v-if="testImageError" class="text-red-600 text-sm mt-2">
              Erreur de chargement de l'image
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const client = useStrapiClient()

// State
const icons = ref<any[]>([])
const iconsLoading = ref(false)
const iconsError = ref<string | null>(null)
const rawResponse = ref<any>(null)
const testUrl = ref('')
const testImageError = ref(false)

// Format URL helper
function formatUrl(url: string | undefined | null): string {
  if (!url) return ''

  console.log('[Images Test] Formatting URL:', url)

  // Si l'URL commence par /, ajouter le base URL de Strapi
  if (url.startsWith('/')) {
    const formattedUrl = `${config.public.strapi.url}${url}`
    console.log('[Images Test] URL relative détectée, formatée en:', formattedUrl)
    return formattedUrl
  }

  // Si c'est déjà une URL complète, la retourner telle quelle
  console.log('[Images Test] URL complète détectée:', url)
  return url
}

// Load icons
async function loadIcons() {
  iconsLoading.value = true
  iconsError.value = null
  rawResponse.value = null

  try {
    console.log('[Images Test] Fetching icons from /character-icons')

    const response = await client<any>('/character-icons', {
      method: 'GET',
    })

    console.log('[Images Test] Raw API Response:', response)
    rawResponse.value = response

    // Extraire les données selon la structure Strapi
    let data = response.data || response
    if (!Array.isArray(data)) {
      data = [data]
    }

    console.log('[Images Test] Extracted data:', data)
    icons.value = data.map((icon: any) => ({
      ...icon,
      _loadStatus: 'pending'
    }))

    console.log('[Images Test] Total icons loaded:', icons.value.length)

  } catch (e: any) {
    console.error('[Images Test] Error loading icons:', e)
    iconsError.value = e?.message || e?.error?.message || 'Erreur lors du chargement des icônes'
  } finally {
    iconsLoading.value = false
  }
}

// Handle image load success
function handleImageLoad(icon: any) {
  console.log('[Images Test] Image loaded successfully:', icon.url)
  icon._loadStatus = 'loaded'
}

// Handle image load error
function handleImageError(event: Event, icon: any) {
  console.error('[Images Test] Image failed to load:', icon.url, event)
  icon._loadStatus = 'error'
}

// Auto-load on mount
onMounted(() => {
  console.log('[Images Test] Component mounted')
  console.log('[Images Test] Config:', config)
  loadIcons()
})

// Page meta
definePageMeta({
  layout: 'test',
})
</script>
