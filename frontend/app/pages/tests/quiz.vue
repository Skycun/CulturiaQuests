<script setup lang="ts">
const user = useStrapiUser()
const client = useStrapiClient()

// --- Données ---
const loading = ref(false)
const error = ref<string | null>(null)
const sessionId = ref<string | null>(null)
const sessionDate = ref<string | null>(null)
const questions = ref<any[]>([])

// --- État du quiz ---
const currentIndex = ref(0)
const answers = ref<Record<string, string>>({}) // questionId -> réponse
const quizFinished = ref(false)
const startTime = ref<number>(0)
const finishedAt = ref<number>(0)

// --- Résultats ---
const submitting = ref(false)
const submitResult = ref<any | null>(null)
const alreadyCompleted = ref(false)
const existingAttempt = ref<any | null>(null)

// --- Leaderboard ---
const leaderboard = ref<any[]>([])
const leaderboardLoading = ref(false)

const isAuthenticated = computed(() => !!user.value)
const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
const selectedAnswer = computed(() => (currentQuestion.value ? answers.value[currentQuestion.value.documentId] : null) || null)
const answeredCount = computed(() => Object.keys(answers.value).length)

// Score calculé côté client (pour affichage en temps réel)
const liveScore = computed(() => {
  let total = 0
  for (const q of questions.value) {
    const ans = answers.value[q.documentId]
    if (ans === undefined) continue
    if (q.question_type === 'qcm') {
      // On ne connaît pas la réponse, on compte juste les réponses données
      total += 0 // Score réel calculé côté serveur
    }
  }
  return total
})

// --- Fetch quiz du jour ---
async function fetchTodayQuiz() {
  loading.value = true
  error.value = null
  alreadyCompleted.value = false
  existingAttempt.value = null

  try {
    const res = await client<any>('/quiz-attempts/today', { method: 'GET' })

    if (res.data.alreadyCompleted) {
      alreadyCompleted.value = true
      existingAttempt.value = res.data.attempt
      await fetchLeaderboard()
    } else {
      sessionId.value = res.data.sessionId
      sessionDate.value = res.data.date
      questions.value = res.data.questions || []
      currentIndex.value = 0
      answers.value = {}
      quizFinished.value = false
      submitResult.value = null
      startTime.value = Date.now()
    }
  } catch (e: any) {
    if (e?.error?.status === 404) {
      error.value = 'Aucun quiz disponible pour aujourd\'hui. Revenez plus tard !'
    } else {
      error.value = e?.error?.message || e?.message || 'Erreur'
    }
  } finally {
    loading.value = false
  }
}

// --- Fetch leaderboard ---
async function fetchLeaderboard() {
  leaderboardLoading.value = true
  try {
    const res = await client<any>('/quiz-attempts/leaderboard', { method: 'GET' })
    leaderboard.value = res.data || []
  } catch (e: any) {
    console.error('Leaderboard error:', e)
  } finally {
    leaderboardLoading.value = false
  }
}

// --- Actions quiz ---
function selectAnswer(answer: string) {
  if (quizFinished.value || !currentQuestion.value) return
  answers.value[currentQuestion.value.documentId] = answer
}

function onSliderInput(e: Event) {
  selectAnswer((e.target as HTMLInputElement).value)
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
  } else {
    quizFinished.value = true
    finishedAt.value = Date.now()
  }
}

function prevQuestion() {
  if (currentIndex.value > 0) currentIndex.value--
}

// --- Soumission ---
async function submitQuiz() {
  if (!sessionId.value) {
    error.value = 'Session non trouvée'
    return
  }

  submitting.value = true
  error.value = null

  try {
    // Formater les réponses pour l'API
    const formattedAnswers = questions.value.map((q) => ({
      questionId: q.documentId,
      answer: answers.value[q.documentId] || '',
    }))

    const timeSpent = Math.round((finishedAt.value - startTime.value) / 1000)

    const res = await client<any>('/quiz-attempts/submit', {
      method: 'POST',
      body: {
        sessionId: sessionId.value,
        answers: formattedAnswers,
        timeSpentSeconds: timeSpent,
      },
    })

    submitResult.value = res.data
    await fetchLeaderboard()
  } catch (e: any) {
    error.value = e?.error?.message || e?.message || 'Erreur lors de la soumission'
  } finally {
    submitting.value = false
  }
}

// --- Lifecycle ---
onMounted(async () => {
  if (isAuthenticated.value) {
    await fetchTodayQuiz()
  }
})

definePageMeta({
  layout: 'test',
})

// Helpers
function getTierColor(tier: string) {
  const colors: Record<string, string> = {
    platinum: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white',
    gold: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white',
    silver: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800',
    bronze: 'bg-gradient-to-r from-orange-600 to-orange-800 text-white',
  }
  return colors[tier] || 'bg-gray-200'
}

function getTierLabel(tier: string) {
  const labels: Record<string, string> = {
    platinum: '🏆 Platine',
    gold: '🥇 Or',
    silver: '🥈 Argent',
    bronze: '🥉 Bronze',
  }
  return labels[tier] || tier
}

function getRankEmoji(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}
</script>

<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">Quiz Quotidien</h1>
    <p class="text-gray-500 mb-6">Testez vos connaissances culturelles !</p>

    <!-- Auth -->
    <div v-if="!isAuthenticated" class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <p class="text-yellow-700">
        Vous devez être authentifié.
        <NuxtLink to="/tests/login" class="underline font-bold">Se connecter</NuxtLink>
      </p>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <p class="text-red-700">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 underline" @click="fetchTodayQuiz">Réessayer</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-gray-500 py-8">Chargement du quiz...</div>

    <div v-else-if="isAuthenticated" class="space-y-6">
      <!-- === DÉJÀ COMPLÉTÉ === -->
      <template v-if="alreadyCompleted && existingAttempt">
        <div class="bg-white border rounded-lg p-6 shadow-sm text-center">
          <div class="text-6xl mb-4">🏆</div>
          <h2 class="text-2xl font-bold mb-2">Quiz déjà complété !</h2>
          <p class="text-gray-500 mb-4">Vous avez déjà participé au quiz d'aujourd'hui.</p>
          <p class="mb-2">
            <span class="text-5xl font-bold text-blue-600">{{ existingAttempt.score }}</span>
            <span class="text-lg text-gray-400"> / 2000</span>
          </p>
          <p v-if="existingAttempt.time_spent_seconds" class="text-sm text-gray-500">
            Temps : {{ existingAttempt.time_spent_seconds }}s
          </p>
        </div>

        <!-- Leaderboard -->
        <div v-if="leaderboard.length > 0" class="bg-white border rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-3">🏅 Classement du jour</h3>
          <div class="space-y-2">
            <div
              v-for="entry in leaderboard"
              :key="entry.username"
              class="flex items-center justify-between p-2 rounded"
              :class="entry.isMe ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold w-8">{{ getRankEmoji(entry.rank) }}{{ entry.rank }}</span>
                <span :class="entry.isMe ? 'font-semibold' : ''">{{ entry.username }}</span>
                <span v-if="entry.isMe" class="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">Vous</span>
              </div>
              <div class="text-right">
                <span class="font-semibold">{{ entry.score }} pts</span>
                <span class="text-xs text-gray-500 ml-2">🔥{{ entry.streak }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- === RÉSULTATS APRÈS SOUMISSION === -->
      <template v-else-if="submitResult">
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <!-- Score + Tier -->
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold mb-2">Résultats</h2>
            <p class="mb-2">
              <span class="text-5xl font-bold text-blue-600">{{ submitResult.score }}</span>
              <span class="text-lg text-gray-400"> / 2000</span>
            </p>
            <span
              class="inline-block px-4 py-1 rounded-full text-sm font-semibold"
              :class="getTierColor(submitResult.rewards.tier)"
            >
              {{ getTierLabel(submitResult.rewards.tier) }}
            </span>
            <p class="text-sm text-gray-500 mt-2">🔥 Streak: {{ submitResult.newStreak }} jour(s)</p>
          </div>

          <!-- Récompenses -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 class="font-semibold mb-3">🎁 Récompenses</h3>
            <div class="flex gap-4 justify-center mb-3">
              <div class="text-center">
                <span class="text-2xl">🪙</span>
                <p class="font-bold text-yellow-600">+{{ submitResult.rewards.gold }}</p>
                <p class="text-xs text-gray-500">Gold</p>
              </div>
              <div class="text-center">
                <span class="text-2xl">⭐</span>
                <p class="font-bold text-purple-600">+{{ submitResult.rewards.exp }}</p>
                <p class="text-xs text-gray-500">XP</p>
              </div>
            </div>
            <div v-if="submitResult.rewards.items.length > 0" class="border-t pt-3">
              <p class="text-sm text-gray-600 mb-2">Items obtenus :</p>
              <div class="space-y-1">
                <div
                  v-for="item in submitResult.rewards.items"
                  :key="item.documentId"
                  class="text-sm bg-white px-2 py-1 rounded border"
                >
                  {{ item.name }} <span class="text-gray-400">({{ item.rarity }})</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Détail des réponses -->
          <div class="space-y-2">
            <h3 class="font-semibold mb-2">📝 Détail des réponses</h3>
            <div
              v-for="(ans, i) in submitResult.detailedAnswers"
              :key="ans.questionId"
              class="p-3 rounded-lg text-sm"
              :class="ans.isCorrect ? 'bg-green-50' : 'bg-red-50'"
            >
              <div class="flex justify-between items-start">
                <p class="flex-1">
                  <span class="font-medium">{{ i + 1 }}.</span>
                  {{ ans.questionText }}
                </p>
                <span class="font-semibold ml-2" :class="ans.isCorrect ? 'text-green-600' : 'text-red-600'">
                  +{{ ans.score }}
                </span>
              </div>
              <p class="text-xs mt-1">
                <span v-if="!ans.isCorrect" class="text-red-600">Votre réponse: {{ ans.userAnswer }}</span>
                <span :class="ans.isCorrect ? 'text-green-600' : 'text-gray-600'">
                  {{ ans.isCorrect ? '✓' : '→' }} {{ ans.correctAnswer }}
                </span>
              </p>
              <p v-if="ans.explanation" class="text-xs text-gray-500 mt-1 italic">💡 {{ ans.explanation }}</p>
            </div>
          </div>
        </div>

        <!-- Leaderboard -->
        <div v-if="leaderboard.length > 0" class="bg-white border rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-3">🏅 Classement du jour</h3>
          <div class="space-y-2">
            <div
              v-for="entry in leaderboard"
              :key="entry.username"
              class="flex items-center justify-between p-2 rounded"
              :class="entry.isMe ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold w-8">{{ getRankEmoji(entry.rank) }}{{ entry.rank }}</span>
                <span :class="entry.isMe ? 'font-semibold' : ''">{{ entry.username }}</span>
                <span v-if="entry.isMe" class="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">Vous</span>
              </div>
              <div class="text-right">
                <span class="font-semibold">{{ entry.score }} pts</span>
                <span class="text-xs text-gray-500 ml-2">🔥{{ entry.streak }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- === QUIZ EN COURS === -->
      <template v-else-if="questions.length > 0 && !quizFinished">
        <!-- Barre de progression + compteur -->
        <div class="space-y-1">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-semibold text-blue-600">{{ answeredCount }}/{{ questions.length }} répondu</span>
            <span class="text-sm text-gray-500">{{ currentIndex + 1 }} / {{ questions.length }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all"
              :style="{ width: ((currentIndex + 1) / questions.length) * 100 + '%' }"
            />
          </div>
        </div>

        <!-- Carte question -->
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <span
              class="text-xs font-bold text-white px-2 py-0.5 rounded"
              :class="currentQuestion.question_type === 'qcm' ? 'bg-blue-500' : 'bg-purple-500'"
            >
              {{ currentQuestion.question_type === 'qcm' ? 'QCM' : 'Timeline' }}
            </span>
            <span v-if="currentQuestion.tag" class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {{ currentQuestion.tag.name }}
            </span>
          </div>

          <p class="text-lg font-semibold mb-4">{{ currentQuestion.question_text }}</p>

          <!-- QCM -->
          <div v-if="currentQuestion.question_type === 'qcm' && currentQuestion.options" class="space-y-2">
            <button
              v-for="(opt, i) in currentQuestion.options"
              :key="i"
              class="w-full text-left px-4 py-3 rounded-lg border transition-colors"
              :class="{
                'border-blue-500 bg-blue-50 text-blue-700': selectedAnswer === opt,
                'border-gray-200 hover:border-gray-300 hover:bg-gray-50': selectedAnswer !== opt,
              }"
              @click="selectAnswer(opt)"
            >
              <span class="font-medium text-gray-500 mr-2">{{ String.fromCharCode(65 + i) }}.</span>
              {{ opt }}
            </button>
          </div>

          <!-- Timeline -->
          <div v-else-if="currentQuestion.question_type === 'timeline'" class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-500 w-14 text-right">{{ currentQuestion.timeline_range?.min }}</span>
              <input
                type="range"
                class="flex-1 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg appearance-none cursor-pointer"
                :min="currentQuestion.timeline_range?.min || 1900"
                :max="currentQuestion.timeline_range?.max || 2025"
                :value="
                  selectedAnswer ||
                  Math.round(
                    ((currentQuestion.timeline_range?.min || 1900) + (currentQuestion.timeline_range?.max || 2025)) / 2
                  )
                "
                @input="onSliderInput"
              />
              <span class="text-sm text-gray-500 w-14">{{ currentQuestion.timeline_range?.max }}</span>
            </div>
            <p class="text-center">
              Année choisie :
              <span class="text-2xl font-bold text-blue-600">{{ selectedAnswer || '?' }}</span>
            </p>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex justify-between">
          <button
            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-40"
            :disabled="currentIndex === 0"
            @click="prevQuestion"
          >
            Précédent
          </button>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            :disabled="!selectedAnswer"
            @click="nextQuestion"
          >
            {{ currentIndex === questions.length - 1 ? 'Terminer' : 'Suivant' }}
          </button>
        </div>
      </template>

      <!-- === ÉCRAN DE CONFIRMATION AVANT SOUMISSION === -->
      <template v-else-if="quizFinished && !submitResult">
        <div class="bg-white border rounded-lg p-6 shadow-sm text-center">
          <h2 class="text-2xl font-bold mb-4">Prêt à soumettre ?</h2>
          <p class="text-gray-500 mb-4">
            Vous avez répondu à {{ answeredCount }} questions sur {{ questions.length }}.
          </p>
          <p class="text-sm text-gray-400 mb-6">
            Temps écoulé : {{ Math.round((finishedAt - startTime) / 1000) }}s
          </p>

          <button
            class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
            :disabled="submitting"
            @click="submitQuiz"
          >
            {{ submitting ? 'Soumission en cours...' : '🚀 Soumettre mes réponses' }}
          </button>

          <button class="block mx-auto mt-4 text-sm text-gray-500 hover:underline" @click="quizFinished = false">
            ← Revoir mes réponses
          </button>
        </div>
      </template>

      <!-- Aucune session -->
      <div v-else-if="!loading && questions.length === 0 && !alreadyCompleted" class="bg-gray-50 border rounded p-6 text-center text-gray-500">
        Aucun quiz disponible pour aujourd'hui.
      </div>
    </div>
  </div>
</template>
