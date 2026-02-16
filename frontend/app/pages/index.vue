<!-- filepath: /home/skycun/cours/CulturiaQuests/frontend/app/pages/index.vue -->
<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <h1 class="text-4xl font-bold font-power text-center mb-6 text-indigo-600">
        Culturia Quests
      </h1>

      <p class="text-center text-gray-700 font-onest mb-8 text-lg leading-relaxed">
        Bienvenue dans une aventure épique ! Connectez-vous ou inscrivez-vous pour commencer votre quête de découverte culturelle.
      </p>

      <div class="space-y-4">
        <NuxtLink to="/account/login">
          <PixelButton variant="filled" color="indigo">
            Se connecter
          </PixelButton>
        </NuxtLink>

        <NuxtLink to="/account/register">
          <PixelButton variant="outline" color="indigo">
            S'inscrire
          </PixelButton>
        </NuxtLink>
      </div>

      <!-- Debug API connection -->
      <div class="mt-8 p-4 bg-gray-100 rounded text-xs font-mono">
        <p class="font-bold mb-2">Debug API :</p>
        <p>URL: {{ apiUrl }}</p>
        <p>Status: <span :class="apiStatus === 'OK' ? 'text-green-600' : 'text-red-600'">{{ apiStatus }}</span></p>
        <p v-if="apiError" class="text-red-500 mt-1">{{ apiError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PixelButton from '~/components/form/PixelButton.vue'

const user = useStrapiUser()
const config = useRuntimeConfig()

const apiUrl = computed(() => config.public.strapi.url)
const apiStatus = ref('En test...')
const apiError = ref('')

onMounted(async () => {
  // Redirect authenticated users to map page
  if (user.value) {
    navigateTo('/map')
    return
  }

  // Test API connection
  try {
    const response = await fetch(`${config.public.strapi.url}/api`)
    if (response.ok) {
      apiStatus.value = 'OK'
    } else {
      apiStatus.value = `Erreur ${response.status}`
    }
  } catch (e: any) {
    apiStatus.value = 'Erreur'
    apiError.value = e.message || 'Impossible de joindre l\'API'
  }
})

definePageMeta({
  layout: 'blank',
})
</script>
