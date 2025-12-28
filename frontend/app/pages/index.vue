<!-- filepath: /home/skycun/cours/CulturiaQuests/frontend/app/pages/index.vue -->
<template>
  <div class="min-h-screen bg-white p-8">
    <div v-if="user" class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold font-pixel text-indigo-600 mb-6">
        Bienvenue, {{ user.username }} !
      </h1>

      <div class="bg-gray-50 p-6 rounded-lg mb-6">
        <p class="text-lg mb-2">
          <span class="font-medium">Email :</span> {{ user.email }}
        </p>
      </div>

      <PixelButton
        @click="handleLogout"
        variant="filled"
        color="red"
      >
        Se déconnecter
      </PixelButton>
    </div>

    <div v-else class="max-w-md mx-auto text-center">
      <h1 class="text-3xl font-bold font-pixel text-indigo-600 mb-6">
        Vous n'êtes pas connecté
      </h1>

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
import { useGuildStore } from '~/stores/guild'
import PixelButton from '~/components/form/PixelButton.vue'

const user = useStrapiUser()
const { logout } = useStrapiAuth()
const router = useRouter()
const guildStore = useGuildStore()

const handleLogout = async () => {
  // Clear all stores
  guildStore.clearAll()

  // Logout from Strapi
  await logout()

  // Redirect to login page
  await router.push('/account/login')
}
</script>