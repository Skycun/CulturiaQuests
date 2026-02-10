<template>
  <div class="h-screen w-full flex flex-col bg-[#f3f3f3] font-onest overflow-hidden">
    <!-- Header -->
    <div class="shrink-0 pt-6 pb-2 px-6 relative flex items-center justify-between z-20">
      <div 
        class="bg-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer shadow-sm active:scale-95 transition-transform" 
        @click="router.push('/social/quiz')"
      >
        <Icon name="mdi:close" class="w-6 h-6 text-[#1e1a4d]" />
      </div>

      <div class="absolute left-0 right-0 top-6 flex flex-col items-center pointer-events-none">
        <p class="text-[13px] font-medium text-[#1e1a4d] opacity-80">Quiz Terminé</p>
        <h1 class="text-[24px] font-power font-extrabold text-[#1e1a4d] leading-none mt-0.5">Résultats</h1>
      </div>

      <div class="bg-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 shadow-sm opacity-0">
        <!-- Spacer -->
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-6 pt-6 pb-12 flex flex-col">
      <div v-if="quizStore.loading" class="flex-1 flex items-center justify-center">
        <p class="text-[#1e1a4d] font-medium animate-pulse">Chargement des résultats...</p>
      </div>

      <div v-else-if="quizStore.error" class="flex-1 flex flex-col items-center justify-center text-center">
        <p class="text-red-500 font-medium mb-4">{{ quizStore.error }}</p>
        <FormPixelButton variant="filled" color="indigo" @click="router.push('/social/quiz')">
          Retour au quiz
        </FormPixelButton>
      </div>

      <div v-else-if="!result" class="flex-1 flex flex-col items-center justify-center text-center">
        <p class="text-[#1e1a4d] font-medium mb-4">Aucun résultat trouvé.</p>
        <FormPixelButton variant="filled" color="indigo" @click="router.push('/social/quiz')">
          Retour au quiz
        </FormPixelButton>
      </div>

      <template v-else>
        <!-- Main Score Card -->
        <div class="bg-white rounded-[28px] py-10 px-6 text-center shadow-sm relative mb-8 shrink-0">
          <h2 class="text-3xl font-power text-[#1e1a4d] mb-2">Bravo !</h2>
          
          <div class="flex items-center justify-center gap-8 my-8">
            <div class="text-center">
              <p class="text-6xl font-power text-indigo-600 leading-none">{{ result.score }}</p>
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Points obtenus</p>
            </div>
          </div>

          <!-- Rewards Grid -->
          <div class="bg-[#f3f3f3] rounded-2xl p-6">
            <p class="text-[10px] font-power text-indigo-900 mb-4 uppercase tracking-widest">Récompenses gagnées</p>
            <div class="flex justify-around">
              <div class="flex flex-col items-center">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-2xl">💰</div>
                <p class="font-power text-lg text-[#1e1a4d]">+{{ result.rewards.gold }}</p>
                <p class="text-[9px] font-bold text-gray-400 uppercase">Pièces</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-2xl">✨</div>
                <p class="font-power text-lg text-[#1e1a4d]">+{{ result.rewards.exp }}</p>
                <p class="text-[9px] font-bold text-gray-400 uppercase">Expérience</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-2xl">🔥</div>
                <p class="font-power text-lg text-[#1e1a4d]">{{ result.newStreak }}</p>
                <p class="text-[9px] font-bold text-gray-400 uppercase">Série</p>
              </div>
            </div>
            
            <!-- Items -->
            <div v-if="result.rewards.items.length > 0" class="mt-6 pt-4 border-t border-gray-200">
               <p class="text-[9px] font-bold text-gray-400 uppercase mb-3">Objets reçus</p>
               <div class="flex flex-wrap justify-center gap-2">
                <div 
                  v-for="item in result.rewards.items" 
                  :key="item.documentId"
                  class="bg-white px-4 py-2 rounded-xl text-xs font-bold text-[#1e1a4d] shadow-sm border border-gray-100 flex items-center gap-2"
                >
                  <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                  {{ item.name }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Answers -->
        <h3 class="text-sm font-power text-[#1e1a4d] mb-4 uppercase tracking-widest px-1">Détails des questions</h3>
        <div class="space-y-4 mb-8">
          <div 
            v-for="(ans, i) in result.detailedAnswers" 
            :key="ans.questionId"
            class="bg-white rounded-[24px] p-5 shadow-sm border-l-8"
            :class="ans.isCorrect ? 'border-green-500' : 'border-red-500'"
          >
            <div class="flex justify-between items-start mb-2">
              <p class="text-[15px] font-bold text-[#1e1a4d] flex-1 leading-tight">
                {{ i + 1 }}. {{ ans.questionText }}
              </p>
              <div 
                class="ml-3 px-2 py-1 rounded-lg text-xs font-power"
                :class="ans.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                +{{ ans.score }}
              </div>
            </div>

            <div class="space-y-2 mt-4">
              <div class="flex items-center gap-2">
                <p class="text-xs text-gray-400 font-bold uppercase w-20">Ta réponse</p>
                <p class="text-sm font-bold" :class="ans.isCorrect ? 'text-green-600' : 'text-red-600'">
                  {{ ans.userAnswer || 'Aucune' }}
                </p>
              </div>
              <div v-if="!ans.isCorrect" class="flex items-center gap-2">
                <p class="text-xs text-gray-400 font-bold uppercase w-20">Correct</p>
                <p class="text-sm font-bold text-green-600">{{ ans.correctAnswer }}</p>
              </div>
            </div>

            <div v-if="ans.explanation" class="mt-4 pt-3 border-t border-gray-50">
              <p class="text-[13px] text-gray-600 italic leading-snug">
                <span class="font-bold not-italic text-indigo-950">Le savais-tu ?</span> {{ ans.explanation }}
              </p>
            </div>
          </div>
        </div>

        <FormPixelButton
          variant="filled"
          color="indigo"
          class="w-full shrink-0"
          @click="router.push('/social/quiz')"
        >
          Retour au classement
        </FormPixelButton>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuizStore } from '~/stores/quiz'

const router = useRouter()
const quizStore = useQuizStore()

const result = computed(() => quizStore.submitResult)

// Protection si accès direct sans résultat dans le store
onMounted(async () => {
  if (!quizStore.submitResult) {
    // Si on a déjà chargé le quiz du jour dans l'index, on a l'ID de l'attempt
    if (quizStore.alreadyCompleted && quizStore.existingAttempt?.documentId) {
      await quizStore.fetchResults(quizStore.existingAttempt.documentId)
    } 
    // Sinon on tente de recharger le quiz du jour pour récupérer l'ID
    else {
      await quizStore.fetchTodayQuiz()
      if (quizStore.alreadyCompleted && quizStore.existingAttempt?.documentId) {
        await quizStore.fetchResults(quizStore.existingAttempt.documentId)
      }
    }
  }
})

definePageMeta({
  layout: 'footerless',
})
</script>
