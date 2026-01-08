<template>
  <div class="h-[100vh] w-full relative">
    <!-- Geolocation request component -->
    <GeolocationRequest
      @allow="handleGeolocationAllow"
      @deny="handleGeolocationDeny"
    />

    <!-- Loading state -->
    <div v-if="geolocLoading" class="absolute top-4 left-4 z-[1000] bg-white p-3 rounded shadow">
      Getting your location...
    </div>

    <ClientOnly>
      <LMap
        ref="map"
        :zoom="13"
        :center="[userLat, userLng]"
        :use-global-leaflet="false"
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"
          layer-type="base"
          name="OpenStreetMap"
        />

        <!-- Marqueur position utilisateur -->
        <LMarker :lat-lng="[userLat, userLng]">
          <LIcon
            icon-url="/assets/map/userpoint.svg"
            :icon-size="[20, 20]"
            :icon-anchor="[10, 10]"
          />
        </LMarker>

        <!-- Marqueurs Musées -->
        <LMarker
          v-for="museum in validMuseums"
          :key="`museum-${museum.id}`"
          :lat-lng="[getLat(museum)!, getLng(museum)!]"
          @click="selectItem(museum)"
        >
          <LIcon
            :icon-url="`/assets/map/museum/${getMuseumTags(museum)[0] || 'Art'}.png`"
            :icon-size="[32, 24]"
            :icon-anchor="[16, 12]"
          />
        </LMarker>

        <!-- Marqueurs POIs -->
        <LMarker
          v-for="poi in validPOIs"
          :key="`poi-${poi.id}`"
          :lat-lng="[getLat(poi)!, getLng(poi)!]"
          @click="selectItem(poi)"
        >
          <LIcon
            icon-url="/assets/map/chest.png"
            :icon-size="[32, 24]"
            :icon-anchor="[16, 12]"
          />
        </LMarker>
      </LMap>
    </ClientOnly>

    <!-- Drawer Information -->
    <BottomDrawer v-model="isDrawerOpen">
      <div v-if="selectedItem" class="flex flex-col gap-4">

        <div v-if="isMuseum(selectedItem)" class="bg-white p-4 rounded-2xl grid grid-cols-2 gap-2">
          <img
            :src="`/assets/map/museum/${getMuseumTags(selectedItem)[0] || 'Art'}.png`"
            :alt="getName(selectedItem)"
            class="w-full h-36 object-contain"
          />
          <div class="flex flex-col justify-between">
            <h2 class="text-xl font-power mb-2 text-right gap-4">{{ getName(selectedItem) }}</h2>
            <div class="flex flex-row-reverse gap-2 flex-wrap">
              <TagCategory
                v-for="tag in getMuseumTags(selectedItem as Museum)"
                :key="tag"
                variant="outline"
                :category="tag"
              />
            </div>
          </div>
        </div>
        <div v-else class="bg-white p-4 rounded-2xl grid grid-cols-2 gap-2">
          <img
            src="/assets/map/chest-opened.png"
            :alt="getName(selectedItem)"
            class="w-full h-36 object-contain"
          />
          <div class="flex flex-col justify-between">
            <h2 class="text-xl font-power mb-2 text-right gap-4">{{ getName(selectedItem) }}</h2>
            <p class="font-onest text-right text-xs">Réinitialisation dans 15:45:56</p>
          </div>
        </div>

        <div v-if="isMuseum(selectedItem)" class="flex flex-row justify-evenly">
          <div v-for="char in guildCharacters" :key="char.id" class="bg-white rounded-2xl h-20 w-20">
            <img 
              :src="getCharacterIconUrl(char)" 
              class="object-contain"
              alt="Icon h-20 w-20"
            />
          </div>
        </div>

        <div v-if="isMuseum(selectedItem)" class="bg-white p-4 rounded-2xl">
          <p class="text-center font-pixel text-3xl">DPS: 1578</p>
          <p class="font-onest text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </div>

        <div v-else class="bg-white p-4 rounded-2xl">
          <p class="text-center font-pixel text-2xl">Objet collecté</p>
        </div>

          
        <!-- <div class="bg-white rounded-2xl text-xs font-mono">
          <p>
            Type: 
            <span :class="isMuseum(selectedItem) ? 'text-blue-600' : 'text-orange-600'" class="font-bold">
              {{ isMuseum(selectedItem) ? 'Museum' : 'Point of Interest' }}
            </span>]
          </p>
            <p>ID: {{ selectedItem.id }}</p>
            <p>Lat: {{ getLat(selectedItem)?.toFixed(6) }}</p>
            <p>Lng: {{ getLng(selectedItem)?.toFixed(6) }}</p>
        </div> -->
        <FormPixelButton v-if="isMuseum(selectedItem)" color="indigo" variant="filled" class="w-full mt-4">
          Démarrer l'expédition
        </FormPixelButton>
        <FormPixelButton v-else color="red" variant="outline" class="w-full mt-4">
          Ce coffre à déjà été ouvert
        </FormPixelButton>
      </div>
    </BottomDrawer>
  </div>
</template>

<script setup lang="ts">
import { useMuseumStore } from '~/stores/museum'
import { usePOIStore } from '~/stores/poi'
import { useGuildStore } from '~/stores/guild'
import type { Museum } from '~/types/museum'
import type { Poi } from '~/types/poi'
import type { Character } from '~/types/character'
import type { Tag } from '~/types/tag'
import Items from '~/components/items.vue'

// Type pour les éléments avec coordonnées (Museum ou POI)
type LocationItem = Museum | Poi

// Stores
const museumStore = useMuseumStore()
const poiStore = usePOIStore()
const guildStore = useGuildStore()
const config = useRuntimeConfig()

// Guild Logic
const guildCharacters = computed(() => {
  if (!guildStore.guild?.characters) return []
  // Handle both array direct and { data: [] } structure
  const chars = guildStore.guild.characters.data || guildStore.guild.characters
  return Array.isArray(chars) ? chars : []
})

function getCharacterIconUrl(character: Character): string {
  const icon = character.icon?.data || character.icon
  if (!icon?.url) return '/assets/helmet1.png' // Fallback
  
  if (icon.url.startsWith('http')) return icon.url
  return `${config.public.strapi.url}${icon.url}`
}

// Geolocation
const userLat = ref<number>(49.1167)  // Saint-Lô par défaut
const userLng = ref<number>(-1.0833)
const geolocLoading = ref<boolean>(false)
const geolocError = ref<string | null>(null)
const watchId = ref<number | null>(null)  // Pour le tracking continu
const isFirstPosition = ref<boolean>(true) // Pour différencier le premier chargement
const lastFetchLat = ref<number | null>(null)  // Dernière position où on a fetch les POIs
const lastFetchLng = ref<number | null>(null)

// Nearby results
const nearbyMuseums = ref<Museum[]>([])
const nearbyPOIs = ref<Poi[]>([])

// Drawer Logic
const selectedItem = ref<LocationItem | null>(null)
const isDrawerOpen = ref(false)

function selectItem(item: LocationItem) {
  selectedItem.value = item
  isDrawerOpen.value = true

  // Animation de la carte
  if (map.value?.leafletObject) {
    const lMap = map.value.leafletObject
    const lat = getLat(item)
    const lng = getLng(item)

    if (lat !== undefined && lng !== undefined) {
      const targetZoom = 16
      const targetLatLng = [lat, lng] as [number, number]
      
      // Calcul du décalage pour centrer "haut" (pour laisser la place au drawer)
      // On veut que le point soit à ~25% du haut de l'écran
      const mapHeight = lMap.getSize().y
      const offsetY = mapHeight * 0.25 // Le point sera décalé de 25% vers le haut par rapport au centre
      
      // On projette le latlng en pixels au niveau de zoom cible
      const point = lMap.project(targetLatLng, targetZoom)
      
      // On ajoute le décalage (on descend le centre de la carte pour que le point remonte)
      const targetPoint = point.add([0, offsetY])
      
      // On reconvertit en latlng
      const newCenter = lMap.unproject(targetPoint, targetZoom)
      
      lMap.flyTo(newCenter, targetZoom, {
        animate: true,
        duration: 0.8
      })
    }
  }
}

// Map reference (null car initialisé par Leaflet après le mount)
const map = ref<any>(null)

// Computed: filtrer pour ne garder que les éléments avec coordonnées valides
const validMuseums = computed<Museum[]>(() =>
  nearbyMuseums.value.filter((m): m is Museum => getLat(m) !== undefined && getLng(m) !== undefined)
)

const validPOIs = computed<Poi[]>(() =>
  nearbyPOIs.value.filter((p): p is Poi => getLat(p) !== undefined && getLng(p) !== undefined)
)

// Helpers pour extraction de données (support Strapi v4/v5)
function getLat(item: LocationItem): number | undefined {
  return item.lat ?? item.attributes?.lat
}

function getLng(item: LocationItem): number | undefined {
  return item.lng ?? item.attributes?.lng
}

function getName(item: LocationItem): string {
  return item.name || item.attributes?.name || 'Unnamed'
}

function isMuseum(item: LocationItem): item is Museum {
  return 'radius' in item || (!!item.attributes && 'radius' in item.attributes)
}

function getMuseumTags(museum: Museum): string[] {
  // Support multiple Strapi structure variations
  console.log('🏷️ Getting tags for museum:', museum)

  let tags: Tag[] = []

  // Check attributes.tags first
  if (museum.attributes?.tags) {
    console.log('✅ Found museum.attributes.tags:', museum.attributes.tags)
    const attrTags = museum.attributes.tags
    if ('data' in attrTags && Array.isArray(attrTags.data)) {
      tags = attrTags.data
      console.log('✅ Using attributes.tags.data:', tags)
    } else if (Array.isArray(attrTags)) {
      tags = attrTags
      console.log('✅ Using attributes.tags (direct array):', tags)
    }
  }
  // Then check direct tags property
  else if (museum.tags) {
    console.log('✅ Found museum.tags:', museum.tags)
    if (Array.isArray(museum.tags)) {
      // Direct array - STRAPI 5 FLATTEN
      tags = museum.tags
      console.log('✅ Using tags (direct array):', tags)
    } else if ('data' in museum.tags && Array.isArray(museum.tags.data)) {
      // Wrapped in data
      tags = museum.tags.data
      console.log('✅ Using tags.data:', tags)
    }
  } else {
    console.log('❌ No tags found in museum object')
  }

  // Extract name from each tag
  const names = tags.map((tag: Tag) => tag.attributes?.name || tag.name || '').filter((name: string) => name !== '')
  console.log('🏷️ Final tag names:', names)

  return names
}

// Calculer la distance entre deux points (formule de Haversine en km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Handlers pour le composant GeolocationRequest
function handleGeolocationAllow(): void {
  // Charger immédiatement avec la position par défaut
  fetchNearbyLocations()

  // Puis activer le tracking en temps réel
  startLocationTracking()
}

function handleGeolocationDeny(): void {
  console.log('User declined geolocation, using Saint-Lô default')
  fetchNearbyLocations()
}

// Tracking de position en temps réel
function startLocationTracking(): void {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported, using Saint-Lô default')
    return
  }

  geolocLoading.value = true
  geolocError.value = null

  // watchPosition surveille en continu la position de l'utilisateur
  watchId.value = navigator.geolocation.watchPosition(
    (position: GeolocationPosition) => {
      const newLat = position.coords.latitude
      const newLng = position.coords.longitude

      // Première position obtenue
      if (isFirstPosition.value) {
        console.log('First real position obtained:', newLat, newLng)
        userLat.value = newLat
        userLng.value = newLng
        geolocLoading.value = false
        isFirstPosition.value = false

        // Recharger les POIs/musées avec la vraie position
        fetchNearbyLocations()

        // Animer la carte vers la vraie position
        if (map.value?.leafletObject) {
          map.value.leafletObject.flyTo([newLat, newLng], 13, {
            animate: true,
            duration: 1.5
          })
        }
      } else {
        // Mises à jour suivantes : juste mettre à jour la position du marqueur
        userLat.value = newLat
        userLng.value = newLng

        // Recharger les POIs si l'utilisateur s'est déplacé de plus de 5 km
        if (lastFetchLat.value !== null && lastFetchLng.value !== null) {
          const distance = calculateDistance(
            lastFetchLat.value,
            lastFetchLng.value,
            newLat,
            newLng
          )

          if (distance > 5) {
            console.log(`User moved ${distance.toFixed(2)}km, reloading POIs...`)
            fetchNearbyLocations()
          }
        }
      }
    },
    (error: GeolocationPositionError) => {
      console.warn('Geolocation tracking failed:', error.message)
      geolocError.value = error.message
      geolocLoading.value = false
    },
    {
      enableHighAccuracy: false,  // Plus rapide, utilise WiFi/réseau au lieu de GPS
      timeout: 5000,              // Timeout de 5 secondes par tentative
      maximumAge: 10000           // Accepte une position de moins de 10 secondes
    }
  )
}

// Arrêter le tracking quand le composant est détruit
function stopLocationTracking(): void {
  if (watchId.value !== null) {
    navigator.geolocation.clearWatch(watchId.value)
    watchId.value = null
    console.log('Location tracking stopped')
  }
}

// Récupération des données
async function fetchNearbyLocations(): Promise<void> {
  const radius: number = 10 // 10 km

  // Fetch museums et POIs en parallèle
  const [museums, pois] = await Promise.all([
    museumStore.fetchNearby(radius, userLat.value, userLng.value),
    poiStore.fetchNearby(radius, userLat.value, userLng.value)
  ])

  nearbyMuseums.value = museums
  nearbyPOIs.value = pois

  // Sauvegarder la position du dernier fetch
  lastFetchLat.value = userLat.value
  lastFetchLng.value = userLng.value

  console.log(`Found ${museums.length} museums and ${pois.length} POIs within ${radius}km`)
}

// Lifecycle
onMounted(() => {
  // Charger automatiquement les characters de la guild
  guildStore.fetchAll()
})

onUnmounted(() => {
  stopLocationTracking()
})

// Layout de test
definePageMeta({
  layout: 'test',
})
</script>
