<template>
  <div
    v-if="showRequest"
    class="absolute inset-0 z-[1000] bg-black bg-opacity-50 flex items-center justify-center"
  >
    <div class="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
      <h2 class="text-xl font-bold mb-4 text-gray-800">Autoriser la géolocalisation</h2>
      <p class="text-gray-600 mb-6">
        Cette application a besoin de votre position pour afficher les musées et points d'intérêt à proximité (dans un rayon de 10 km).
      </p>
      <div class="flex gap-3">
        <button
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          @click="handleAllow"
        >
          Autoriser
        </button>
        <button
          class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          @click="handleDeny"
        >
          Utiliser Saint-Lô
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  /** Si true, force l'affichage du composant même si la géolocalisation est autorisée */
  forceShow?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceShow: false,
})

// Events
const emit = defineEmits<{
  allow: []
  deny: []
}>()

// State
const showRequest = ref<boolean>(false)
const permissionState = ref<PermissionState | null>(null)
const GEOLOC_CHOICE_KEY = 'culturia_geoloc_choice'

// Vérifier l'état de la permission de géolocalisation
async function checkGeolocationPermission(): Promise<void> {
  // 1. Vérifier si un choix a déjà été fait localement
  const savedChoice = localStorage.getItem(GEOLOC_CHOICE_KEY)
  if (savedChoice === 'allow') {
    emit('allow')
    return
  } else if (savedChoice === 'deny') {
    emit('deny')
    return
  }

  // 2. Si pas de choix enregistré, essayer l'API Permissions
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported')
    showRequest.value = true
    return
  }

  try {
    // Vérifier si l'API Permissions est disponible (souvent absente sur certains navigateurs mobiles)
    if (!navigator.permissions || !navigator.permissions.query) {
      showRequest.value = true
      return
    }

    const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    permissionState.value = permission.state

    // Afficher la demande uniquement si la permission n'est pas déjà accordée
    if (permission.state === 'granted') {
      showRequest.value = false
      // Si déjà autorisé au niveau système, on enregistre et on émet
      localStorage.setItem(GEOLOC_CHOICE_KEY, 'allow')
      emit('allow')
    } else if (permission.state === 'denied') {
      // Si déjà refusé au niveau système, on n'affiche pas notre modal inutilement
      showRequest.value = false
      emit('deny')
    } else {
      // 'prompt'
      showRequest.value = true
    }

    // Écouter les changements de permission
    permission.addEventListener('change', () => {
      permissionState.value = permission.state
      if (permission.state === 'granted') {
        showRequest.value = false
        localStorage.setItem(GEOLOC_CHOICE_KEY, 'allow')
        emit('allow')
      }
    })
  } catch (error) {
    console.warn('Permission API error:', error)
    // En cas d'erreur API, on affiche notre modal pour laisser le choix à l'utilisateur
    showRequest.value = true
  }
}

// Handlers
function handleAllow(): void {
  localStorage.setItem(GEOLOC_CHOICE_KEY, 'allow')
  showRequest.value = false
  emit('allow')
}

function handleDeny(): void {
  localStorage.setItem(GEOLOC_CHOICE_KEY, 'deny')
  showRequest.value = false
  emit('deny')
}

// Lifecycle
onMounted(() => {
  if (props.forceShow) {
    showRequest.value = true
  } else {
    checkGeolocationPermission()
  }
})

// Watcher pour forceShow
watch(() => props.forceShow, (newValue) => {
  if (newValue) {
    showRequest.value = true
  }
})
</script>
