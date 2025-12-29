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
    </div>
  </div>
</template>

<script setup lang="ts">
import PixelButton from '~/components/form/PixelButton.vue'

const user = useStrapiUser()

onMounted(() => {
  // Redirect authenticated users to map page
  if (user.value) {
    navigateTo('/map')
  }
})

definePageMeta({
  layout: 'blank',
})
</script>
