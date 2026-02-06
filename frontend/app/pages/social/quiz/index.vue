<template>
  <div class="min-h-screen flex flex-col bg-[#f3f3f3] pb-24">
    <!-- Header -->
    <div class="flex items-center px-6 pt-10 pb-4">
      <div class="bg-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer" @click="$router.back()">
        <Icon name="mdi:arrow-left" class="w-6 h-6 text-black" />
      </div>
      <h1 class="flex-1 text-center text-2xl font-power text-indigo-950 pr-10">Quiz Culture</h1>
    </div>

    <!-- Loading -->
    <div v-if="quizStore.loading" class="flex-1 flex items-center justify-center">
      <p class="text-indigo-950 font-onest font-medium">Chargement...</p>
    </div>

    <!-- Error -->
    <div v-else-if="quizStore.error" class="flex-1 flex flex-col items-center justify-center px-8">
      <p class="text-center text-base font-onest font-semibold text-indigo-950">{{ quizStore.error }}</p>
      <FormPixelButton variant="filled" color="indigo" class="!mt-4" @click="quizStore.fetchTodayQuiz()">
        Réessayer
      </FormPixelButton>
    </div>

    <template v-else>
      <!-- Quiz Info Card -->
      <div class="mx-6 bg-white rounded-[28px] py-6 px-4 text-center">
        <h2 class="text-2xl font-power text-indigo-950">
          {{ quizStore.alreadyCompleted ? 'Quiz complété' : 'Quiz Culture' }}
        </h2>
        <p class="text-sm font-onest font-medium text-indigo-950 mt-1">{{ formattedDate }}</p>
        <p v-if="quizStore.alreadyCompleted && myEntry" class="text-sm font-onest font-medium text-indigo-950 mt-1">
          🔥 Streak de {{ myEntry.streak }} jour{{ myEntry.streak > 1 ? 's' : '' }}
        </p>
      </div>

      <!-- Description -->
      <p class="text-center text-base font-onest font-semibold text-indigo-950 px-8 mt-5">
        Affrontez vos amis au nom de la culture et gagnez des récompenses
      </p>

      <!-- Leaderboard -->
      <div v-if="quizStore.leaderboard.length > 0" class="flex-1 overflow-y-auto mt-5 px-6 space-y-2.5">
        <div
          v-for="(player, index) in quizStore.leaderboard"
          :key="index"
          class="flex items-center gap-2"
        >
          <!-- Trophy for top 3 -->
          <div class="w-[50px] shrink-0 flex justify-center">
            <span v-if="index === 0" class="text-3xl">🥇</span>
            <span v-else-if="index === 1" class="text-3xl">🥈</span>
            <span v-else-if="index === 2" class="text-3xl">🥉</span>
          </div>

          <!-- Player Row -->
          <div
            class="flex-1 flex items-center rounded-full h-[60px] pr-5"
            :class="player.isMe ? 'bg-indigo-100' : 'bg-white'"
          >
            <!-- Avatar -->
            <img
              :src="getPlayerAvatar(player)"
              :alt="player.username"
              class="w-[50px] h-[50px] rounded-full object-cover ml-[5px]"
            >

            <!-- Info -->
            <div class="ml-3 flex-1 min-w-0">
              <p class="text-base font-power text-indigo-950 truncate leading-tight">
                {{ player.username }}
                <span v-if="player.isMe" class="text-xs font-onest font-medium text-indigo-600">(vous)</span>
              </p>
              <p class="text-xs font-onest font-medium text-indigo-950">{{ player.score }} Points</p>
            </div>

            <!-- Score -->
            <span class="text-xs font-onest font-medium text-indigo-950 shrink-0">{{ player.correctCount }}/10</span>
          </div>
        </div>
      </div>

      <!-- Empty leaderboard -->
      <div v-else class="flex-1 flex items-center justify-center px-8">
        <p class="text-center text-sm font-onest text-gray-500">
          {{ quizStore.alreadyCompleted ? 'Aucun ami n\'a encore fait le quiz.' : 'Soyez le premier à faire le quiz !' }}
        </p>
      </div>
    </template>

    <!-- Gradient overlay + CTA Button -->
    <div class="fixed bottom-0 left-0 right-0 h-[280px] z-40 pointer-events-none" style="background: linear-gradient(to top, #f3f3f3 40%, transparent 100%);" />
    <div class="fixed bottom-6 left-0 right-0 px-6 z-50">
      <FormPixelButton
        v-if="quizStore.alreadyCompleted"
        variant="filled"
        color="darker-red"
        class="w-full !mt-0"
      >
        Vous avez déjà fait le quiz
      </FormPixelButton>
      <FormPixelButton
        v-else
        variant="filled"
        color="indigo"
        class="w-full !mt-0"
        @click="router.push('/social/quiz/question')"
      >
        Faire le quiz
      </FormPixelButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuizStore } from '~/stores/quiz'

const router = useRouter()
const quizStore = useQuizStore()
const config = useRuntimeConfig()

const user = useStrapiUser()
const isAuthenticated = computed(() => !!user.value)

onMounted(async () => {
  if (isAuthenticated.value) {
    await quizStore.fetchTodayQuiz()
  }
})

// Date formatée (ex: "Dimanche 1 Février")
const formattedDate = computed(() => {
  const date = quizStore.sessionDate ? new Date(quizStore.sessionDate + 'T00:00:00') : new Date()
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).replace(/^\w/, (c) => c.toUpperCase())
})

// Trouver l'entrée du joueur actuel dans le leaderboard
const myEntry = computed(() =>
  quizStore.leaderboard.find((e) => e.isMe) || null
)

// Construire l'URL avatar d'un joueur
function getPlayerAvatar(player: { avatarUrl: string | null }): string {
  if (!player.avatarUrl) {
    return '/assets/avatar-placeholder.svg'
  }
  // Si c'est un chemin relatif Strapi, ajouter le baseUrl
  if (player.avatarUrl.startsWith('/')) {
    const baseUrl = config.public.strapi.url || 'http://localhost:1337'
    return `${baseUrl}${player.avatarUrl}`
  }
  return player.avatarUrl
}

definePageMeta({
  layout: 'footerless',
})
</script>
