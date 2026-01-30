<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'

const user = useStrapiUser()
const guildStore = useGuildStore()
const { logout } = useLogout()

const isAuthenticated = computed(() => !!user.value)
const guild = computed(() => guildStore.guild)
const loading = computed(() => guildStore.loading)

const showDeleteConfirm = ref(false)
const deleteError = ref<string | null>(null)

// Fetch guild if not already present (e.g., page refresh)
onMounted(async () => {
  if (isAuthenticated.value && !guildStore.guild && user.value?.id) {
    await guildStore.fetchGuild()
  }
})

const handleLogout = () => {
  logout('/tests/login')
}

const handleDeleteGuild = async () => {
  deleteError.value = null
  try {
    await guildStore.deleteGuild()
    showDeleteConfirm.value = false
    // Redirect to login after successful deletion
    logout('/tests/login')
  } catch (error: any) {
    deleteError.value = error?.message || 'Failed to delete guild'
    console.error('Delete guild error:', error)
  }
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
      <div class="bg-white shadow rounded-lg p-6 space-y-4">
        <div class="flex gap-4">
          <button
            class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            @click="handleLogout"
          >
            Logout
          </button>
          <button
            v-if="guild"
            class="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded"
            @click="showDeleteConfirm = true"
          >
            Delete Guild
          </button>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h2 class="text-xl font-bold mb-4 text-red-600">Confirm Deletion</h2>
          <p class="mb-4 text-gray-700">
            Are you sure you want to delete your guild "<strong>{{ guild?.name }}</strong>"?
          </p>
          <p class="mb-6 text-sm text-red-600">
            This will permanently delete:
          </p>
          <ul class="mb-6 text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>All characters</li>
            <li>All items</li>
            <li>All friendships</li>
            <li>All runs</li>
            <li>All visits</li>
            <li>All quests</li>
            <li>The guild itself</li>
          </ul>
          <p class="mb-6 text-sm font-bold text-red-700">
            This action cannot be undone!
          </p>

          <div v-if="deleteError" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {{ deleteError }}
          </div>

          <div class="flex gap-3 justify-end">
            <button
              :disabled="loading"
              class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-semibold disabled:opacity-50"
              @click="showDeleteConfirm = false"
            >
              Cancel
            </button>
            <button
              :disabled="loading"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold disabled:opacity-50"
              @click="handleDeleteGuild"
            >
              {{ loading ? 'Deleting...' : 'Yes, Delete Everything' }}
            </button>
          </div>
        </div>
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
