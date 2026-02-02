<script setup lang="ts">
// Composables
const user = useStrapiUser()
const client = useStrapiClient()

// State
const loading = ref(false)
const error = ref<string | null>(null)
const friendRequestsEnabled = ref(true)

// Search state
const searchUsername = ref('')
const searchResult = ref<{
  username: string
  guildName: string
  guildDocumentId: string
  guildLevel: number
} | null>(null)
const searchMessage = ref<string | null>(null)
const searchLoading = ref(false)

// Friendships state
const myGuildDocumentId = ref<string | null>(null)
const friendships = ref<any[]>([])

// Computed
const isAuthenticated = computed(() => !!user.value)

const pendingReceived = computed(() =>
  friendships.value.filter(
    (f) => f.status === 'pending' && f.receiver?.documentId === myGuildDocumentId.value
  )
)

const pendingSent = computed(() =>
  friendships.value.filter(
    (f) => f.status === 'pending' && f.requester?.documentId === myGuildDocumentId.value
  )
)

const acceptedFriends = computed(() =>
  friendships.value.filter((f) => f.status === 'accepted')
)

// Helper to get friend info (the other party)
function getFriendInfo(friendship: any) {
  const isRequester = friendship.requester?.documentId === myGuildDocumentId.value
  const friend = isRequester ? friendship.receiver : friendship.requester
  return {
    username: friend?.user?.username || 'Unknown',
    guildName: friend?.name || 'Unknown',
    guildLevel: Math.floor(Math.sqrt(Number(friend?.exp || 0) / 75)) + 1,
  }
}

// Actions
async function fetchFriendships() {
  loading.value = true
  error.value = null
  try {
    const response = await client<any>('/player-friendships', { method: 'GET' })
    friendships.value = response.data || []
    myGuildDocumentId.value = response.myGuildDocumentId
  } catch (e: any) {
    error.value = e?.message || 'Failed to fetch friendships'
  } finally {
    loading.value = false
  }
}

async function fetchUserSettings() {
  try {
    const response = await client<any>('/users/me', { method: 'GET' })
    friendRequestsEnabled.value = response.friend_requests_enabled !== false
  } catch (e: any) {
    console.error('Failed to fetch user settings:', e)
  }
}

async function toggleFriendRequests() {
  loading.value = true
  error.value = null
  try {
    const response = await client<any>('/player-friendships/toggle-requests', { method: 'POST' })
    friendRequestsEnabled.value = response.data?.friend_requests_enabled ?? true
  } catch (e: any) {
    error.value = e?.message || 'Failed to toggle friend requests'
  } finally {
    loading.value = false
  }
}

async function searchUser() {
  if (!searchUsername.value.trim()) return

  searchLoading.value = true
  searchResult.value = null
  searchMessage.value = null

  try {
    const response = await client<any>('/player-friendships/search', {
      method: 'GET',
      params: { username: searchUsername.value.trim() },
    })

    if (response.data) {
      searchResult.value = response.data
    } else {
      searchMessage.value = response.message || 'User not found'
    }
  } catch (e: any) {
    searchMessage.value = e?.message || 'Search failed'
  } finally {
    searchLoading.value = false
  }
}

async function sendRequest() {
  if (!searchResult.value) return

  loading.value = true
  error.value = null

  try {
    await client<any>('/player-friendships/send', {
      method: 'POST',
      body: { receiverGuildDocumentId: searchResult.value.guildDocumentId },
    })
    searchResult.value = null
    searchUsername.value = ''
    await fetchFriendships()
  } catch (e: any) {
    error.value = e?.error?.message || e?.message || 'Failed to send request'
  } finally {
    loading.value = false
  }
}

async function acceptRequest(documentId: string) {
  loading.value = true
  error.value = null

  try {
    await client<any>(`/player-friendships/${documentId}/accept`, { method: 'PUT' })
    await fetchFriendships()
  } catch (e: any) {
    error.value = e?.error?.message || e?.message || 'Failed to accept request'
  } finally {
    loading.value = false
  }
}

async function rejectRequest(documentId: string) {
  loading.value = true
  error.value = null

  try {
    await client<any>(`/player-friendships/${documentId}/reject`, { method: 'PUT' })
    await fetchFriendships()
  } catch (e: any) {
    error.value = e?.error?.message || e?.message || 'Failed to reject request'
  } finally {
    loading.value = false
  }
}

async function removeFriend(documentId: string) {
  if (!confirm('Remove this friend?')) return

  loading.value = true
  error.value = null

  try {
    await client<any>(`/player-friendships/${documentId}`, { method: 'DELETE' })
    await fetchFriendships()
  } catch (e: any) {
    error.value = e?.error?.message || e?.message || 'Failed to remove friend'
  } finally {
    loading.value = false
  }
}

async function cancelRequest(documentId: string) {
  loading.value = true
  error.value = null

  try {
    await client<any>(`/player-friendships/${documentId}`, { method: 'DELETE' })
    await fetchFriendships()
  } catch (e: any) {
    error.value = e?.error?.message || e?.message || 'Failed to cancel request'
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  if (isAuthenticated.value) {
    await Promise.all([fetchFriendships(), fetchUserSettings()])
  }
})

// Page meta
definePageMeta({
  layout: 'test',
})
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 font-pixel">Friends System Test</h1>

    <!-- Not Authenticated -->
    <div v-if="!isAuthenticated" class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <p class="text-yellow-700">You must be logged in to test the friends system.</p>
      <NuxtLink to="/tests/login" class="text-yellow-700 underline font-bold">
        Go to Login
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">
      <!-- Error Display -->
      <div v-if="error" class="bg-red-50 border-l-4 border-red-400 p-4">
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Settings Section -->
      <div class="bg-white border rounded-lg p-6 shadow-sm">
        <h2 class="text-xl font-semibold mb-4">Settings</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Accept Friend Requests</p>
            <p class="text-sm text-gray-500">When disabled, other players cannot send you friend requests</p>
          </div>
          <button
            class="px-4 py-2 rounded font-medium transition-colors"
            :class="friendRequestsEnabled
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            :disabled="loading"
            @click="toggleFriendRequests"
          >
            {{ friendRequestsEnabled ? 'Enabled' : 'Disabled' }}
          </button>
        </div>
      </div>

      <!-- Search Section -->
      <div class="bg-white border rounded-lg p-6 shadow-sm">
        <h2 class="text-xl font-semibold mb-4">Search for a Friend</h2>
        <form class="flex gap-3" @submit.prevent="searchUser">
          <input
            v-model="searchUsername"
            type="text"
            placeholder="Enter exact username"
            class="flex-1 border rounded px-3 py-2"
            :disabled="searchLoading"
          >
          <button
            type="submit"
            class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            :disabled="searchLoading || !searchUsername.trim()"
          >
            {{ searchLoading ? 'Searching...' : 'Search' }}
          </button>
        </form>

        <!-- Search Result -->
        <div v-if="searchResult" class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-lg">{{ searchResult.username }}</p>
              <p class="text-sm text-gray-600">Guild: {{ searchResult.guildName }} (Level {{ searchResult.guildLevel }})</p>
            </div>
            <button
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              :disabled="loading"
              @click="sendRequest"
            >
              Send Request
            </button>
          </div>
        </div>

        <!-- Search Message -->
        <div v-if="searchMessage" class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p class="text-gray-600">{{ searchMessage }}</p>
        </div>
      </div>

      <!-- Grid for Lists -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Pending Received -->
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4">
            Received Requests
            <span class="text-sm font-normal text-gray-500">({{ pendingReceived.length }})</span>
          </h2>

          <div v-if="loading" class="text-gray-500">Loading...</div>

          <div v-else-if="pendingReceived.length === 0" class="text-gray-500 text-center py-4">
            No pending requests
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="friendship in pendingReceived"
              :key="friendship.documentId"
              class="p-3 border rounded-lg flex items-center justify-between"
            >
              <div>
                <p class="font-medium">{{ getFriendInfo(friendship).username }}</p>
                <p class="text-sm text-gray-500">
                  {{ getFriendInfo(friendship).guildName }} (Lvl {{ getFriendInfo(friendship).guildLevel }})
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  :disabled="loading"
                  @click="acceptRequest(friendship.documentId)"
                >
                  Accept
                </button>
                <button
                  class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  :disabled="loading"
                  @click="rejectRequest(friendship.documentId)"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pending Sent -->
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4">
            Sent Requests
            <span class="text-sm font-normal text-gray-500">({{ pendingSent.length }}/20)</span>
          </h2>

          <div v-if="loading" class="text-gray-500">Loading...</div>

          <div v-else-if="pendingSent.length === 0" class="text-gray-500 text-center py-4">
            No pending requests sent
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="friendship in pendingSent"
              :key="friendship.documentId"
              class="p-3 border rounded-lg flex items-center justify-between"
            >
              <div>
                <p class="font-medium">{{ getFriendInfo(friendship).username }}</p>
                <p class="text-sm text-gray-500">
                  {{ getFriendInfo(friendship).guildName }} (Lvl {{ getFriendInfo(friendship).guildLevel }})
                </p>
              </div>
              <button
                class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                :disabled="loading"
                @click="cancelRequest(friendship.documentId)"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Friends List -->
      <div class="bg-white border rounded-lg p-6 shadow-sm">
        <h2 class="text-xl font-semibold mb-4">
          My Friends
          <span class="text-sm font-normal text-gray-500">({{ acceptedFriends.length }})</span>
        </h2>

        <div v-if="loading" class="text-gray-500">Loading...</div>

        <div v-else-if="acceptedFriends.length === 0" class="text-gray-500 text-center py-8">
          No friends yet. Search for someone to add!
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="friendship in acceptedFriends"
            :key="friendship.documentId"
            class="p-4 border rounded-lg"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold">{{ getFriendInfo(friendship).username }}</p>
                <p class="text-sm text-gray-500">
                  {{ getFriendInfo(friendship).guildName }}
                </p>
                <p class="text-xs text-gray-400">
                  Level {{ getFriendInfo(friendship).guildLevel }}
                </p>
              </div>
              <button
                class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                :disabled="loading"
                @click="removeFriend(friendship.documentId)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Account Info -->
      <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h2 class="text-lg font-semibold text-indigo-800 mb-3">Current Account</h2>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-indigo-600 font-medium">Username</p>
            <p class="text-indigo-900">{{ user?.username || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-indigo-600 font-medium">Email</p>
            <p class="text-indigo-900">{{ user?.email || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-indigo-600 font-medium">User ID</p>
            <p class="text-indigo-900 font-mono text-xs">{{ user?.id || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-indigo-600 font-medium">My Guild DocumentId</p>
            <p class="text-indigo-900 font-mono text-xs">{{ myGuildDocumentId || 'N/A' }}</p>
          </div>
        </div>
      </div>

      <!-- Debug Section -->
      <details class="bg-gray-50 border rounded-lg p-4">
        <summary class="cursor-pointer font-medium text-gray-700">Debug Info</summary>
        <div class="mt-4 space-y-2 text-xs font-mono">
          <p><strong>My Guild ID:</strong> {{ myGuildDocumentId }}</p>
          <p><strong>Friend Requests Enabled:</strong> {{ friendRequestsEnabled }}</p>
          <p><strong>Total Friendships:</strong> {{ friendships.length }}</p>
          <div class="mt-4">
            <p class="font-semibold mb-2">User Object:</p>
            <pre class="bg-white p-2 rounded overflow-auto max-h-32">{{ JSON.stringify(user, null, 2) }}</pre>
          </div>
          <div class="mt-4">
            <p class="font-semibold mb-2">Friendships:</p>
            <pre class="bg-white p-2 rounded overflow-auto max-h-64">{{ JSON.stringify(friendships, null, 2) }}</pre>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>
