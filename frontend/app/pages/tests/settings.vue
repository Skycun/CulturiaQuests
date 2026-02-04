<script setup lang="ts">
const user = useStrapiUser()
const { logout } = useLogout()
const {
  settings,
  loading,
  error,
  avatarUrl,
  fetchSettings,
  uploadAvatar,
  removeAvatar,
  updateSettings,
} = useUserAvatar()

const isAuthenticated = computed(() => !!user.value)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Fetch settings on mount
onMounted(async () => {
  if (isAuthenticated.value) {
    await fetchSettings()
  }
})

// Watch for authentication changes
watch(isAuthenticated, async (newValue) => {
  if (newValue) {
    await fetchSettings()
  }
})

const handleLogout = () => {
  logout('/tests/login')
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  uploadError.value = null
  successMessage.value = null

  const success = await uploadAvatar(file)

  if (success) {
    successMessage.value = 'Avatar mis \u00e0 jour avec succ\u00e8s'
    setTimeout(() => {
      successMessage.value = null
    }, 3000)
  } else {
    uploadError.value = error.value
  }

  // Reset file input
  input.value = ''
}

const handleRemoveAvatar = async () => {
  uploadError.value = null
  successMessage.value = null

  const success = await removeAvatar()

  if (success) {
    successMessage.value = 'Avatar supprim\u00e9'
    setTimeout(() => {
      successMessage.value = null
    }, 3000)
  } else {
    uploadError.value = error.value
  }
}

const handleToggleFriendRequests = async () => {
  if (!settings.value) return

  uploadError.value = null
  successMessage.value = null

  const newValue = !settings.value.friend_requests_enabled
  const success = await updateSettings({ friend_requests_enabled: newValue })

  if (success) {
    successMessage.value = newValue
      ? 'Demandes d\'amis activ\u00e9es'
      : 'Demandes d\'amis d\u00e9sactiv\u00e9es'
    setTimeout(() => {
      successMessage.value = null
    }, 3000)
  } else {
    uploadError.value = error.value
  }
}

definePageMeta({
  layout: 'test',
})
</script>

<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Param\u00e8tres</h1>

    <!-- Messages -->
    <div v-if="successMessage" class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
      {{ successMessage }}
    </div>
    <div v-if="uploadError" class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ uploadError }}
    </div>

    <div v-if="isAuthenticated" class="space-y-6">
      <!-- Avatar Section -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Photo de profil</h2>

        <div class="flex items-center space-x-6">
          <!-- Avatar Preview -->
          <div class="relative">
            <img
              :src="avatarUrl"
              alt="Avatar"
              class="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
            >
            <div
              v-if="loading"
              class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center"
            >
              <div class="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>

          <!-- Upload Controls -->
          <div class="flex flex-col space-y-2">
            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="hidden"
              @change="handleFileSelect"
            >
            <button
              class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              :disabled="loading"
              @click="triggerFileInput"
            >
              Changer l'avatar
            </button>
            <button
              v-if="settings?.avatar"
              class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              :disabled="loading"
              @click="handleRemoveAvatar"
            >
              Supprimer l'avatar
            </button>
            <p class="text-sm text-gray-500">
              PNG, JPG ou WebP. Max 4 Mo.
            </p>
          </div>
        </div>
      </div>

      <!-- Friend Requests Section -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Param\u00e8tres de confidentialit\u00e9</h2>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Demandes d'amis</p>
            <p class="text-sm text-gray-500">
              Autoriser les autres joueurs \u00e0 vous envoyer des demandes d'amis
            </p>
          </div>

          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="settings?.friend_requests_enabled"
              :disabled="loading"
              @change="handleToggleFriendRequests"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <!-- User Info Section -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Informations du compte</h2>

        <div class="space-y-3">
          <div class="grid grid-cols-3 gap-4">
            <span class="font-semibold text-gray-600">Nom d'utilisateur:</span>
            <span class="col-span-2">{{ settings?.username || user?.username }}</span>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <span class="font-semibold text-gray-600">Email:</span>
            <span class="col-span-2">{{ settings?.email || user?.email }}</span>
          </div>
        </div>
      </div>

      <!-- Logout Button -->
      <div class="pt-4">
        <button
          class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          @click="handleLogout"
        >
          D\u00e9connexion
        </button>
      </div>
    </div>

    <div v-else class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div class="flex">
        <div class="ml-3">
          <p class="text-sm text-yellow-700">
            Vous devez \u00eatre connect\u00e9 pour acc\u00e9der aux param\u00e8tres.
          </p>
          <p class="mt-2">
            <NuxtLink to="/tests/login" class="text-yellow-700 underline font-bold">
              Se connecter
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>

    <!-- Debug Section -->
    <div class="mt-8 p-4 bg-gray-100 rounded">
      <h3 class="font-bold mb-2">Debug Settings:</h3>
      <pre class="text-xs overflow-auto">{{ settings }}</pre>
    </div>
  </div>
</template>
