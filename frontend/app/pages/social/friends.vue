<template>
  <div class="min-h-screen flex flex-col bg-[#f3f3f3] pb-24">
    <!-- Header -->
    <div class="flex items-center px-6 pt-[env(safe-area-inset-top)] pb-4">
      <div class="bg-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer" @click="router.push('/social')">
        <Icon name="mdi:arrow-left" class="w-6 h-6 text-black" />
      </div>
      <h1 class="flex-1 text-center text-2xl font-power text-indigo-950 pr-10">Amis</h1>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.friendships.length === 0" class="flex-1 flex items-center justify-center">
      <div class="w-10 h-10 border-4 border-[#4D4DFF] border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="flex-1 overflow-y-auto px-6 space-y-4">
      <!-- Search Section -->
      <div class="bg-white rounded-[28px] p-6">
        <h2 class="text-xl font-power text-indigo-950 mb-4">Rechercher un joueur</h2>

        <div class="flex gap-3">
          <div class="flex-1">
            <FormPixelInput
              v-model="searchUsername"
              placeholder="Nom d'utilisateur"
              @keyup.enter="handleSearch"
            />
          </div>
          <button
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-power px-4 py-2 rounded-xl transition-colors shrink-0 disabled:opacity-50"
            :disabled="store.searchLoading || !searchUsername.trim()"
            @click="handleSearch"
          >
            <span v-if="store.searchLoading" class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else>Rechercher</span>
          </button>
        </div>

        <!-- Search Result -->
        <div v-if="store.searchResult" class="mt-4 bg-indigo-50 rounded-2xl p-4 flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="font-power text-indigo-950 truncate">{{ store.searchResult.username }}</p>
            <p class="text-sm font-onest text-indigo-950 opacity-60 truncate">
              {{ store.searchResult.guildName }} · Niv. {{ store.searchResult.guildLevel }}
            </p>
          </div>
          <div v-if="existingRelation">
            <span class="text-xs font-onest font-semibold px-3 py-1.5 rounded-full"
              :class="{
                'bg-green-100 text-green-700': existingRelation.status === 'accepted',
                'bg-yellow-100 text-yellow-700': existingRelation.status === 'pending',
              }"
            >
              {{ existingRelation.status === 'accepted' ? 'Déjà amis' : 'Demande envoyée' }}
            </span>
          </div>
          <button
            v-else
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-power text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            :disabled="store.actionLoading[store.searchResult.guildDocumentId]"
            @click="store.sendRequest(store.searchResult.guildDocumentId)"
          >
            <span v-if="store.actionLoading[store.searchResult.guildDocumentId]" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else>Ajouter</span>
          </button>
        </div>

        <!-- Search Message -->
        <p v-if="store.searchMessage && !store.searchResult" class="mt-3 text-sm font-onest text-indigo-950 opacity-60 text-center">
          {{ store.searchMessage }}
        </p>
      </div>

      <!-- Pending Received -->
      <div v-if="store.pendingReceived.length > 0" class="bg-white rounded-[28px] p-6">
        <h2 class="text-xl font-power text-indigo-950 mb-4">
          Demandes reçues
          <span class="text-sm font-onest font-semibold text-indigo-600 ml-1">({{ store.pendingReceived.length }})</span>
        </h2>

        <div class="space-y-3">
          <div
            v-for="friendship in store.pendingReceived"
            :key="friendship.documentId"
            class="flex items-center gap-3 bg-orange-50 rounded-2xl p-4"
          >
            <div class="flex-1 min-w-0">
              <p class="font-power text-indigo-950 truncate">{{ store.getOtherGuild(friendship).user?.username || 'Inconnu' }}</p>
              <p class="text-sm font-onest text-indigo-950 opacity-60 truncate">
                {{ store.getOtherGuild(friendship).name }} · Niv. {{ store.calculateLevel(store.getOtherGuild(friendship).exp) }}
              </p>
            </div>

            <div class="flex gap-2 shrink-0">
              <button
                class="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                :disabled="store.actionLoading[friendship.documentId]"
                @click="store.acceptRequest(friendship.documentId)"
              >
                <span v-if="store.actionLoading[friendship.documentId]" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <Icon v-else name="mdi:check" class="w-5 h-5" />
              </button>
              <button
                class="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                :disabled="store.actionLoading[friendship.documentId]"
                @click="store.rejectRequest(friendship.documentId)"
              >
                <Icon name="mdi:close" class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Sent -->
      <div v-if="store.pendingSent.length > 0" class="bg-white rounded-[28px] p-6">
        <h2 class="text-xl font-power text-indigo-950 mb-4">Demandes envoyées</h2>

        <div class="space-y-3">
          <div
            v-for="friendship in store.pendingSent"
            :key="friendship.documentId"
            class="flex items-center gap-3 bg-gray-50 rounded-2xl p-4"
          >
            <div class="flex-1 min-w-0">
              <p class="font-power text-indigo-950 truncate">{{ store.getOtherGuild(friendship).user?.username || 'Inconnu' }}</p>
              <p class="text-sm font-onest text-indigo-950 opacity-60 truncate">
                {{ store.getOtherGuild(friendship).name }}
              </p>
            </div>

            <button
              class="text-sm font-power text-red-500 hover:text-red-600 px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
              :disabled="store.actionLoading[friendship.documentId]"
              @click="store.removeFriend(friendship.documentId)"
            >
              <span v-if="store.actionLoading[friendship.documentId]" class="inline-block w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
              <span v-else>Annuler</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Friends List -->
      <div class="bg-white rounded-[28px] p-6">
        <h2 class="text-xl font-power text-indigo-950 mb-4">
          Mes amis
          <span v-if="store.friends.length > 0" class="text-sm font-onest font-semibold text-indigo-600 ml-1">({{ store.friends.length }})</span>
        </h2>

        <div v-if="store.friends.length > 0" class="space-y-3">
          <div
            v-for="friendship in store.friends"
            :key="friendship.documentId"
            class="flex items-center gap-3 bg-indigo-50 rounded-2xl p-4"
          >
            <div class="flex-1 min-w-0">
              <p class="font-power text-indigo-950 truncate">{{ store.getOtherGuild(friendship).user?.username || 'Inconnu' }}</p>
              <p class="text-sm font-onest text-indigo-950 opacity-60 truncate">
                {{ store.getOtherGuild(friendship).name }} · Niv. {{ store.calculateLevel(store.getOtherGuild(friendship).exp) }}
              </p>
            </div>

            <!-- Tap-to-confirm delete -->
            <button
              v-if="confirmDeleteId !== friendship.documentId"
              class="text-sm font-power text-red-400 hover:text-red-500 px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
              @click="confirmDeleteId = friendship.documentId"
            >
              Supprimer
            </button>
            <button
              v-else
              class="text-sm font-power text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
              :disabled="store.actionLoading[friendship.documentId]"
              @click="handleRemoveFriend(friendship.documentId)"
            >
              <span v-if="store.actionLoading[friendship.documentId]" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span v-else>Confirmer</span>
            </button>
          </div>
        </div>

        <div v-else class="text-center py-6">
          <Icon name="mdi:account-group-outline" class="w-12 h-12 text-indigo-200 mx-auto mb-2" />
          <p class="text-sm font-onest text-indigo-950 opacity-40">Aucun ami pour le moment</p>
          <p class="text-xs font-onest text-indigo-950 opacity-30 mt-1">Recherchez un joueur pour l'ajouter</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerFriendshipStore } from '~/stores/playerFriendship'

const router = useRouter()
const store = usePlayerFriendshipStore()

const searchUsername = ref('')
const confirmDeleteId = ref<string | null>(null)

// Computed helper to check if search result already has an existing relation
const existingRelation = computed(() => {
  if (!store.searchResult) return null
  return store.friendships.find(f =>
    f.requester.documentId === store.searchResult!.guildDocumentId ||
    f.receiver.documentId === store.searchResult!.guildDocumentId
  ) || null
})

// Reset confirm state when clicking elsewhere
const handleSearch = () => {
  if (!searchUsername.value.trim()) return
  confirmDeleteId.value = null
  store.searchUser(searchUsername.value.trim())
}

const handleRemoveFriend = async (documentId: string) => {
  await store.removeFriend(documentId)
  confirmDeleteId.value = null
}

onMounted(() => {
  store.fetchFriendships()
})

definePageMeta({
  layout: 'default',
})
</script>
