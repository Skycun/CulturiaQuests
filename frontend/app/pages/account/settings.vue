<template>
  <div class="min-h-screen flex flex-col bg-[#f3f3f3] pb-24">
    <!-- Header -->
    <div class="flex items-center px-6 pt-10 pb-4">
      <div class="bg-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer" @click="$router.back()">
        <Icon name="mdi:arrow-left" class="w-6 h-6 text-black" />
      </div>
      <h1 class="flex-1 text-center text-2xl font-power text-indigo-950 pr-10">Paramètres</h1>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-6 space-y-4">
      <!-- Success Message -->
      <div v-if="successMessage" class="bg-emerald-100 border-2 border-emerald-400 rounded-2xl p-4">
        <p class="text-sm font-onest font-semibold text-emerald-700 text-center">{{ successMessage }}</p>
      </div>

      <!-- Error Message -->
      <div v-if="uploadError" class="bg-red-100 border-2 border-red-400 rounded-2xl p-4">
        <p class="text-sm font-onest font-semibold text-red-700 text-center">{{ uploadError }}</p>
      </div>

      <!-- Avatar Section -->
      <div class="bg-white rounded-[28px] p-6">
        <h2 class="text-xl font-power text-indigo-950 mb-5">Photo de profil</h2>

        <div class="flex items-center space-x-6">
          <!-- Avatar Preview -->
          <div class="relative">
            <img
              :src="avatarUrl"
              alt="Avatar"
              class="w-24 h-24 rounded-full object-cover border-4 border-indigo-100"
            >
            <div
              v-if="loading"
              class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center"
            >
              <div class="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>

          <!-- Upload Controls -->
          <div class="flex flex-col space-y-2 flex-1">
            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="hidden"
              @change="handleFileSelect"
            >
            <FormPixelButton
              variant="filled"
              color="indigo"
              :disabled="loading"
              @click="triggerFileInput"
            >
              Changer l'avatar
            </FormPixelButton>
            <FormPixelButton
              v-if="settings?.avatar"
              variant="outline"
              color="red"
              :disabled="loading"
              @click="handleRemoveAvatar"
            >
              Supprimer
            </FormPixelButton>
            <p class="text-xs font-onest text-indigo-950 opacity-60 text-center pt-1">
              PNG, JPG ou WebP · Max 4 Mo
            </p>
          </div>
        </div>
      </div>

      <!-- Friend Requests Section -->
      <div class="bg-white rounded-[28px] p-6">
        <h2 class="text-xl font-power text-indigo-950 mb-5">Confidentialité</h2>

        <div class="flex items-center justify-between gap-4">
          <div class="flex-1">
            <p class="text-base font-power text-indigo-950">Demandes d'amis</p>
            <p class="text-sm font-onest text-indigo-950 opacity-60 mt-1">
              Autoriser les autres joueurs à vous envoyer des demandes d'amis
            </p>
          </div>

          <FormPixelSwitch
            :model-value="friendRequestsEnabled"
            :loading="loading"
            @update:model-value="handleToggleFriendRequests"
          />
        </div>
      </div>
    </div>
  </div>
</template>

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

// Local reactive state for friend requests toggle
const friendRequestsEnabled = computed(() => settings.value?.friend_requests_enabled ?? false)

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
  logout('/')
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
    successMessage.value = 'Avatar mis à jour avec succès'
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
    successMessage.value = 'Avatar supprimé'
    setTimeout(() => {
      successMessage.value = null
    }, 3000)
  } else {
    uploadError.value = error.value
  }
}

const handleToggleFriendRequests = async (newValue: boolean) => {
  if (!settings.value) return

  uploadError.value = null
  successMessage.value = null

  // Avoid redundant calls if the value hasn't changed
  if (newValue === settings.value.friend_requests_enabled) return

  // Update immediately for instant visual feedback
  settings.value.friend_requests_enabled = newValue

  const success = await updateSettings({ friend_requests_enabled: newValue })

  if (success) {
    successMessage.value = newValue
      ? 'Demandes d\'amis activées'
      : 'Demandes d\'amis désactivées'
    setTimeout(() => {
      successMessage.value = null
    }, 3000)
  } else {
    // Revert on failure
    settings.value.friend_requests_enabled = !newValue
    uploadError.value = error.value
  }
}

// Redirect to login if not authenticated
watchEffect(() => {
  if (!isAuthenticated.value) {
    navigateTo('/account/login')
  }
})
</script>
