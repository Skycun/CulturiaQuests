<script setup lang="ts">
const user = useStrapiUser()
const client = useStrapiClient()

// --- Données ---
const loading = ref(false)
const error = ref<string | null>(null)
const sessions = ref<any[]>([])
const selectedSessionId = ref<string | null>(null)
const questions = ref<any[]>([])
const guildDocumentId = ref<string | null>(null)

// --- État du quiz ---
const currentIndex = ref(0)
const answers = ref<Record<number, string>>({}) // order -> réponse choisie
const quizFinished = ref(false)
const startTime = ref<number>(0)
const finishedAt = ref<number>(0)

// --- Soumission ---
const submitting = ref(false)
const submitResult = ref<{ success: boolean; message: string } | null>(null)

const isAuthenticated = computed(() => !!user.value)
const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
const selectedAnswer = computed(() => (currentQuestion.value ? answers.value[currentQuestion.value.order] : null) || null)

// Score selon les règles du plan : QCM = 200 binaire, Timeline = 0-250 proportionnel
const score = computed(() => {
  let total = 0
  for (const q of questions.value) {
    const ans = answers.value[q.order]
    if (ans === undefined) continue
    if (q.question_type === 'qcm') {
      total += ans === q.correct_answer ? 200 : 0
    } else {
      const correct = parseInt(q.correct_answer, 10)
      const guessed = parseInt(ans, 10)
      const range = q.timeline_range ? q.timeline_range.max - q.timeline_range.min : 100
      const distance = Math.abs(correct - guessed)
      total += Math.max(0, Math.round(250 * (1 - distance / range)))
    }
  }
  return total
})

// Score par question pour l'écran de résultats
function questionScore(q: any): number {
  const ans = answers.value[q.order]
  if (ans === undefined) return 0
  if (q.question_type === 'qcm') return ans === q.correct_answer ? 200 : 0
  const correct = parseInt(q.correct_answer, 10)
  const guessed = parseInt(ans, 10)
  const range = q.timeline_range ? q.timeline_range.max - q.timeline_range.min : 100
  return Math.max(0, Math.round(250 * (1 - Math.abs(correct - guessed) / range)))
}

// --- Fetches ---
async function fetchSessions() {
  loading.value = true
  error.value = null
  try {
    const res = await client<any>('/quiz-sessions?sort=-date&filters[generation_status][$eq]=completed', { method: 'GET' })
    sessions.value = res.data || []
    if (sessions.value.length > 0 && !selectedSessionId.value) {
      selectedSessionId.value = sessions.value[0].documentId
    }
  } catch (e: any) {
    error.value = e?.message || 'Erreur'
  } finally {
    loading.value = false
  }
}

async function fetchGuild() {
  try {
    const res = await client<any>('/guilds?limit=1', { method: 'GET' })
    if (res.data && res.data.length > 0) {
      guildDocumentId.value = res.data[0].documentId
    }
  } catch (e: any) {
    console.error('Guild fetch error:', e)
  }
}

async function loadQuestions(sessionDocId: string) {
  loading.value = true
  try {
    const res = await client<any>(
      `/quiz-questions?filters[session][documentId][$eq]=${sessionDocId}&sort=order&populate=tag`,
      { method: 'GET' }
    )
    questions.value = res.data || []
    currentIndex.value = 0
    answers.value = {}
    quizFinished.value = false
    submitResult.value = null
    startTime.value = Date.now()
  } catch (e: any) {
    error.value = e?.message || 'Erreur'
  } finally {
    loading.value = false
  }
}

// --- Actions quiz ---
function selectAnswer(answer: string) {
  if (quizFinished.value || !currentQuestion.value) return
  answers.value[currentQuestion.value.order] = answer
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

function restartQuiz() {
  if (selectedSessionId.value) loadQuestions(selectedSessionId.value)
}

// --- Soumission de tentative ---
async function submitAttempt() {
  if (!guildDocumentId.value || !selectedSessionId.value) {
    error.value = 'Guild ou session non trouvé'
    return
  }
  submitting.value = true
  error.value = null
  try {
    await client<any>('/quiz-attempts', {
      method: 'POST',
      body: {
        data: {
          guild: guildDocumentId.value,
          session: selectedSessionId.value,
          score: score.value,
          answers: answers.value,
          completed_at: new Date().toISOString(),
          time_spent_seconds: Math.round((finishedAt.value - startTime.value) / 1000),
        },
      },
    })
    submitResult.value = { success: true, message: 'Tentative soumise avec succès !' }
  } catch (e: any) {
    submitResult.value = { success: false, message: e?.message || 'Erreur lors de la soumission' }
  } finally {
    submitting.value = false
  }
}

// --- Lifecycle + watchers ---
onMounted(async () => {
  if (isAuthenticated.value) {
    await Promise.all([fetchSessions(), fetchGuild()])
  }
})

watch(selectedSessionId, (newVal) => {
  if (newVal) loadQuestions(newVal)
})

definePageMeta({
  layout: 'test',
})
</script>

<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">Quiz — Prototype</h1>
    <p class="text-gray-500 mb-6">Prototype interactif pour tester le backend quiz.</p>

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
    </div>

    <div v-if="isAuthenticated" class="space-y-6">
      <!-- Sélecteur de session -->
      <div v-if="sessions.length > 0" class="bg-white border rounded-lg p-4 shadow-sm">
        <label class="block text-sm font-medium text-gray-600 mb-1">Session du quiz</label>
        <select v-model="selectedSessionId" class="w-full border rounded px-3 py-2">
          <option v-for="s in sessions" :key="s.documentId" :value="s.documentId">{{ s.date }}</option>
        </select>
      </div>

      <div v-else-if="!loading" class="bg-gray-50 border rounded p-6 text-center text-gray-500">
        Aucune session disponible. Exécutez
        <code class="bg-gray-200 px-1 rounded">generate-quiz-questions.ts --save</code>.
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center text-gray-500 py-8">Chargement...</div>

      <!-- === QUIZ EN COURS === -->
      <template v-else-if="questions.length > 0 && !quizFinished">
        <!-- Barre de progression -->
        <div class="space-y-1">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all"
              :style="{ width: ((currentIndex + 1) / questions.length * 100) + '%' }"
            />
          </div>
          <p class="text-sm text-gray-500 text-right">{{ currentIndex + 1 }} / {{ questions.length }}</p>
        </div>

        <!-- Carte question -->
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <!-- Type + tag -->
          <div class="flex items-center gap-2 mb-3">
            <span
              class="text-xs font-bold text-white px-2 py-0.5 rounded"
              :class="currentQuestion.question_type === 'qcm' ? 'bg-blue-500' : 'bg-purple-500'"
            >{{ currentQuestion.question_type === 'qcm' ? 'QCM' : 'Timeline' }}</span>
            <span v-if="currentQuestion.tag" class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {{ currentQuestion.tag.name }}
            </span>
          </div>

          <!-- Texte de la question -->
          <p class="text-lg font-semibold mb-4">{{ currentQuestion.question_text }}</p>

          <!-- QCM : boutons d'options -->
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

          <!-- Timeline : slider année -->
          <div v-else-if="currentQuestion.question_type === 'timeline'" class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-500 w-14 text-right">{{ currentQuestion.timeline_range?.min }}</span>
              <input
                type="range"
                class="flex-1"
                :min="currentQuestion.timeline_range?.min || 1900"
                :max="currentQuestion.timeline_range?.max || 2025"
                :value="selectedAnswer || Math.round(((currentQuestion.timeline_range?.min || 1900) + (currentQuestion.timeline_range?.max || 2025)) / 2)"
                @input="onSliderInput"
              >
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

      <!-- === RÉSULTATS === -->
      <template v-else-if="quizFinished">
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-2xl font-bold text-center mb-1">Résultats</h2>
          <p class="text-center">
            <span class="text-5xl font-bold text-blue-600">{{ score }}</span>
            <span class="text-lg text-gray-400"> / 2500</span>
          </p>
          <p class="text-center text-sm text-gray-500 mb-6">
            Temps : {{ Math.round((finishedAt - startTime) / 1000) }}s
          </p>

          <!-- Détail par question -->
          <div class="space-y-2">
            <div
              v-for="q in questions"
              :key="q.documentId"
              class="flex items-center justify-between p-3 rounded-lg"
              :class="questionScore(q) > 0 ? 'bg-green-50' : 'bg-red-50'"
            >
              <p class="text-sm truncate mr-4">{{ q.order }}. {{ q.question_text }}</p>
              <div class="text-right shrink-0">
                <span class="text-sm font-semibold">+{{ questionScore(q) }}</span>
                <span v-if="q.question_type === 'timeline'" class="block text-xs text-gray-500">
                  {{ answers[q.order] }} → {{ q.correct_answer }}
                </span>
                <span v-else class="block text-xs" :class="questionScore(q) > 0 ? 'text-green-600' : 'text-red-500'">
                  {{ questionScore(q) > 0 ? 'Correct' : 'Incorrect' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Soumettre tentative -->
          <div class="mt-6 text-center space-y-3">
            <button
              v-if="!submitResult"
              class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
              :disabled="submitting || !guildDocumentId"
              @click="submitAttempt"
            >
              {{ submitting ? 'Soumission...' : 'Soumettre la tentative' }}
            </button>

            <p v-if="!guildDocumentId && !submitting && !submitResult" class="text-sm text-gray-400">
              Guild non trouvé — impossible de soumettre
            </p>

            <div
              v-if="submitResult"
              class="p-3 rounded-lg text-sm"
              :class="submitResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
            >
              {{ submitResult.message }}
            </div>

            <button class="text-sm text-blue-600 hover:underline" @click="restartQuiz">
              Recommencer
            </button>
          </div>
        </div>

        <!-- Debug -->
        <details class="bg-gray-50 border rounded-lg p-4">
          <summary class="cursor-pointer font-medium text-gray-700">Debug</summary>
          <div class="mt-3 space-y-2 text-xs font-mono">
            <p><strong>Guild :</strong> {{ guildDocumentId || 'non trouvé' }}</p>
            <p><strong>Session :</strong> {{ selectedSessionId }}</p>
            <p class="font-semibold mt-2">Réponses envoyées :</p>
            <pre class="bg-white p-2 rounded overflow-auto max-h-32">{{ JSON.stringify(answers, null, 2) }}</pre>
          </div>
        </details>
      </template>
    </div>
  </div>
</template>
