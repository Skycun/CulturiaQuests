<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'

const user = useStrapiUser()
const guildStore = useGuildStore()
const { logout } = useStrapiAuth()
const router = useRouter()

const isAuthenticated = computed(() => !!user.value)
const guild = computed(() => guildStore.guild)
const loading = computed(() => guildStore.loading)

// Fetch guild if not already present (e.g., page refresh)
onMounted(async () => {
  if (isAuthenticated.value && !guildStore.guild && user.value?.id) {
    await guildStore.fetchGuild()
  }
})

const handleLogout = async () => {
  await logout()
  router.push('/tests/login')
}

// Layout de test
definePageMeta({
  layout: 'test',
})
</script>

<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Guild Info</h1>

    <div v-if="isAuthenticated" class="space-y-6">
      <!-- Guild Details -->
      <div v-if="guild" class="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 class="text-xl font-bold border-b pb-2">Overview</h2>
        
        <div class="grid grid-cols-3 gap-4 border-b pb-4">
          <span class="font-semibold text-gray-600">Name:</span>
          <span class="col-span-2">{{ guild.name }}</span>
        </div>

        <div class="grid grid-cols-3 gap-4 border-b pb-4">
          <span class="font-semibold text-gray-600">Gold:</span>
          <span class="col-span-2 text-yellow-600 font-bold">{{ guild.gold }}</span>
        </div>

        <div class="grid grid-cols-3 gap-4 border-b pb-4">
          <span class="font-semibold text-gray-600">Experience:</span>
          <span class="col-span-2">{{ guild.exp }}</span>
        </div>

        <div class="grid grid-cols-3 gap-4 border-b pb-4">
          <span class="font-semibold text-gray-600">Scrap:</span>
          <span class="col-span-2 text-gray-500">{{ guild.scrap }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-else-if="loading" class="bg-blue-50 border-l-4 border-blue-400 p-4">
        <p class="text-sm text-blue-700">
          Loading guild data...
        </p>
      </div>

      <!-- No Guild State -->
      <div v-else class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p class="text-sm text-yellow-700">
          No guild associated with this user.
        </p>
      </div>

      <!-- Actions -->
      <div class="bg-white shadow rounded-lg p-6">
        <button 
          @click="handleLogout"
          class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </div>

      <!-- Debug -->
      <div class="mt-8 p-4 bg-gray-100 rounded">
        <h3 class="font-bold mb-2">Debug Raw Guild State:</h3>
        <pre class="text-xs overflow-auto">{{ guild }}</pre>
      </div>
    </div>

    <!-- Not Authenticated -->
    <div v-else class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div class="flex">
        <div class="ml-3">
          <p class="text-sm text-yellow-700">
            User is not authenticated.
          </p>
          <p class="mt-2">
            <NuxtLink to="/tests/login" class="text-yellow-700 underline font-bold">
              Go to Login
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
