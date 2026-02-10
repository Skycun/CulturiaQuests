<script setup lang="ts">
import { MAX_QUIZ_SCORE } from '~/types/quiz'
import { useQuizStore } from '~/stores/quiz'

const user = useStrapiUser()
const quizStore = useQuizStore()
const router = useRouter()

const isAuthenticated = computed(() => !!user.value)

// Computed pour savoir si un quiz est en cours
const isQuizInProgress = computed(() => {
  return quizStore.questions.length > 0 &&
         !quizStore.quizFinished &&
         !quizStore.alreadyCompleted &&
         !quizStore.submitResult
})

onMounted(async () => {
  if (isAuthenticated.value) {
    await quizStore.fetchTodayQuiz()
  }

  // Avertir avant de quitter la page (rafraîchissement ou fermeture)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// Avertir avant de naviguer vers une autre page
onBeforeRouteLeave((to, from, next) => {
  if (isQuizInProgress.value) {
    const confirmed = confirm('Vous avez un quiz en cours. Vos réponses seront sauvegardées mais vous devrez revenir pour terminer. Voulez-vous vraiment quitter ?')
    if (confirmed) {
      next()
    } else {
      next(false)
    }
  } else {
    next()
  }
})

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (isQuizInProgress.value) {
    e.preventDefault()
    // Chrome requires returnValue to be set
    e.returnValue = ''
  }
}

definePageMeta({
  layout: 'test',
})
</script>

<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">Quiz Quotidien</h1>
    <p class="text-gray-500 mb-6">Testez vos connaissances culturelles !</p>

    <!-- Auth -->
    <div v-if="!isAuthenticated" class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <p class="text-yellow-700">
        Vous devez etre authentifie.
        <NuxtLink to="/tests/login" class="underline font-bold">Se connecter</NuxtLink>
      </p>
    </div>

    <!-- Error -->
    <div v-if="quizStore.error" class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <p class="text-red-700">{{ quizStore.error }}</p>
      <button class="mt-2 text-sm text-red-600 underline" @click="quizStore.fetchTodayQuiz()">
        Reessayer
      </button>
    </div>

    <!-- Loading -->
    <div v-if="quizStore.loading" class="text-center text-gray-500 py-8">Chargement du quiz...</div>

    <div v-else-if="isAuthenticated" class="space-y-6">
      <!-- === DEJA COMPLETE === -->
      <template v-if="quizStore.alreadyCompleted && quizStore.existingAttempt">
        <div class="bg-white border rounded-lg p-6 shadow-sm text-center">
          <div class="text-6xl mb-4">Trophy</div>
          <h2 class="text-2xl font-bold mb-2">Quiz deja complete !</h2>
          <p class="text-gray-500 mb-4">Vous avez deja participe au quiz d'aujourd'hui.</p>
          <p class="mb-2">
            <span class="text-5xl font-bold text-blue-600">{{ quizStore.existingAttempt.score }}</span>
            <span class="text-lg text-gray-400"> / {{ MAX_QUIZ_SCORE }}</span>
          </p>
          <p v-if="quizStore.existingAttempt.time_spent_seconds" class="text-sm text-gray-500">
            Temps : {{ quizStore.existingAttempt.time_spent_seconds }}s
          </p>
        </div>

        <QuizLeaderboard :entries="quizStore.leaderboard" />
      </template>

      <!-- === RESULTATS APRES SOUMISSION === -->
      <template v-else-if="quizStore.submitResult">
        <QuizResults :result="quizStore.submitResult" />
        <QuizLeaderboard :entries="quizStore.leaderboard" />
      </template>

      <!-- === QUIZ EN COURS === -->
      <template v-else-if="quizStore.questions.length > 0 && !quizStore.quizFinished">
        <!-- Barre de progression -->
        <div class="space-y-1">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-semibold text-blue-600">
              {{ quizStore.answeredCount }}/{{ quizStore.questions.length }} repondu
            </span>
            <span class="text-sm text-gray-500">
              {{ quizStore.currentIndex + 1 }} / {{ quizStore.questions.length }}
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all"
              :style="{ width: ((quizStore.currentIndex + 1) / quizStore.questions.length) * 100 + '%' }"
            />
          </div>
        </div>

        <!-- Question -->
        <QuizQuestionCard
          v-if="quizStore.currentQuestion"
          :question="quizStore.currentQuestion"
          :selected-answer="quizStore.selectedAnswer"
          @answer="quizStore.selectAnswer($event)"
        />

        <!-- Navigation -->
        <div class="flex justify-between">
          <button
            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-40"
            :disabled="quizStore.currentIndex === 0"
            @click="quizStore.prevQuestion()"
          >
            Precedent
          </button>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            :disabled="!quizStore.selectedAnswer"
            @click="quizStore.nextQuestion()"
          >
            {{ quizStore.currentIndex === quizStore.questions.length - 1 ? 'Terminer' : 'Suivant' }}
          </button>
        </div>
      </template>

      <!-- === ECRAN DE CONFIRMATION === -->
      <template v-else-if="quizStore.quizFinished && !quizStore.submitResult">
        <QuizConfirmSubmit
          :answered-count="quizStore.answeredCount"
          :total-questions="quizStore.questions.length"
          :time-spent-seconds="quizStore.timeSpentSeconds"
          :submitting="quizStore.submitting"
          @submit="quizStore.submitQuiz()"
          @go-back="quizStore.goBackToQuestions()"
        />
      </template>

      <!-- Aucune session -->
      <div
        v-else-if="!quizStore.loading && quizStore.questions.length === 0 && !quizStore.alreadyCompleted"
        class="bg-gray-50 border rounded p-6 text-center text-gray-500"
      >
        Aucun quiz disponible pour aujourd'hui.
      </div>
    </div>
  </div>
</template>
