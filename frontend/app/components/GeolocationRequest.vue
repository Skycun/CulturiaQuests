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

// Vérifier l'état de la permission de géolocalisation
async function checkGeolocationPermission(): Promise<void> {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported')
    showRequest.value = true
    return
  }

  try {
    // Vérifier si l'API Permissions est disponible
    if (!navigator.permissions) {
      // Si l'API n'est pas disponible, afficher la demande
      showRequest.value = true
      return
    }

    const permission = await navigator.permissions.query({ name: 'geolocation' })
    permissionState.value = permission.state

    // Afficher la demande uniquement si la permission n'est pas déjà accordée
    if (permission.state === 'granted') {
      showRequest.value = false
      // Si déjà autorisé, émettre automatiquement l'événement allow
      emit('allow')
    } else {
      // 'prompt' ou 'denied'
      showRequest.value = true
    }

    // Écouter les changements de permission
    permission.addEventListener('change', () => {
      permissionState.value = permission.state
      if (permission.state === 'granted') {
        showRequest.value = false
      }
    })
  } catch (error) {
    console.warn('Permission API error:', error)
    // En cas d'erreur, afficher la demande par sécurité
    showRequest.value = true
  }
}

// Handlers
function handleAllow(): void {
  showRequest.value = false
  emit('allow')
}

function handleDeny(): void {
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
