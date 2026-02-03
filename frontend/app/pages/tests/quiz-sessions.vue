<script setup lang="ts">
const user = useStrapiUser()
const client = useStrapiClient()

const loading = ref(false)
const error = ref<string | null>(null)
const sessions = ref<any[]>([])
const selectedSession = ref<any | null>(null)
const questions = ref<any[]>([])
const questionsLoading = ref(false)

const isAuthenticated = computed(() => !!user.value)

async function fetchSessions() {
  loading.value = true
  error.value = null
  try {
    const res = await client<any>('/quiz-sessions?sort=date:desc', { method: 'GET' })
    sessions.value = res.data || []
  } catch (e: any) {
    error.value = e?.message || 'Erreur lors de la récupération des sessions'
  } finally {
    loading.value = false
  }
}

async function selectSession(session: any) {
  selectedSession.value = session
  questionsLoading.value = true
  try {
    const res = await client<any>(
      `/quiz-questions?filters[session][documentId][$eq]=${session.documentId}&sort=order&populate=tag`,
      { method: 'GET' }
    )
    questions.value = res.data || []
  } catch (e: any) {
    error.value = e?.message || 'Erreur lors de la récupération des questions'
  } finally {
    questionsLoading.value = false
  }
}

onMounted(() => {
  fetchSessions()
})

definePageMeta({
  layout: 'test',
})
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">Quiz Sessions — Debug</h1>
    <p class="text-gray-500 mb-6">
      Vérifie que les sessions et questions sont bien créées en base via
      <code class="bg-gray-100 px-1 rounded">generate-quiz-questions.ts --save</code>.
    </p>

    <!-- Auth warning -->
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

    <!-- Refresh -->
    <button
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mb-6"
      :disabled="loading"
      @click="fetchSessions"
    >
      {{ loading ? 'Chargement...' : 'Rafraîchir' }}
    </button>

    <!-- No sessions -->
    <div v-if="sessions.length === 0 && !loading" class="bg-gray-50 border rounded p-6 text-center text-gray-500">
      Aucune session trouvée.
    </div>

    <!-- Sessions list -->
    <div v-else class="space-y-3">
      <div
        v-for="session in sessions"
        :key="session.documentId"
        class="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        :class="selectedSession?.documentId === session.documentId ? 'ring-2 ring-blue-500' : ''"
        @click="selectSession(session)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="font-semibold">{{ session.date }}</span>
            <span
              class="text-sm px-2 py-0.5 rounded"
              :class="{
                'bg-green-100 text-green-700': session.generation_status === 'completed',
                'bg-yellow-100 text-yellow-700': session.generation_status === 'pending' || session.generation_status === 'generating',
                'bg-red-100 text-red-700': session.generation_status === 'failed',
              }"
            >{{ session.generation_status }}</span>
          </div>
          <span class="text-xs font-mono text-gray-400">{{ session.documentId }}</span>
        </div>
      </div>
    </div>

    <!-- Selected session: questions -->
    <div v-if="selectedSession" class="mt-6">
      <h2 class="text-xl font-semibold mb-3">Questions — {{ selectedSession.date }}</h2>

      <div v-if="questionsLoading" class="text-gray-500">Chargement...</div>

      <div v-else-if="questions.length === 0" class="text-gray-500 text-center py-4">
        Aucune question pour cette session.
      </div>

      <div v-else class="space-y-3">
        <div v-for="q in questions" :key="q.documentId" class="bg-white border rounded-lg p-4 shadow-sm">
          <!-- Header: type + ordre + tag -->
          <div class="flex items-center gap-2 mb-2">
            <span
              class="text-xs font-bold text-white px-2 py-0.5 rounded"
              :class="q.question_type === 'qcm' ? 'bg-blue-500' : 'bg-purple-500'"
            >{{ q.question_type === 'qcm' ? 'QCM' : 'Timeline' }}</span>
            <span class="text-sm text-gray-500">#{{ q.order }}</span>
            <span v-if="q.tag" class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{{ q.tag.name }}</span>
          </div>

          <!-- Texte -->
          <p class="font-medium mb-2">{{ q.question_text }}</p>

          <!-- Options QCM -->
          <div v-if="q.question_type === 'qcm' && q.options" class="ml-4 space-y-1">
            <div v-for="(opt, i) in q.options" :key="i" class="text-sm text-gray-600">
              <span>{{ String.fromCharCode(65 + i) }}.</span> {{ opt }}
            </div>
          </div>

          <!-- Timeline: plage uniquement (réponse correcte masquée server-side) -->
          <div v-else-if="q.question_type === 'timeline'" class="ml-4 text-sm text-gray-600">
            <span v-if="q.timeline_range">
              Plage : {{ q.timeline_range.min }} – {{ q.timeline_range.max }}
            </span>
          </div>
        </div>
      </div>

      <!-- Raw JSON -->
      <details class="mt-4">
        <summary class="cursor-pointer text-sm text-gray-500 hover:underline">Données brutes (JSON)</summary>
        <pre class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(questions, null, 2) }}</pre>
      </details>
    </div>
  </div>
</template>
