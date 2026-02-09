<template>
  <div class="h-screen w-full flex flex-col bg-[#f3f3f3] font-onest overflow-hidden">
    <!-- Header -->
    <div class="shrink-0 pt-4 pb-2 px-6 relative flex items-center justify-between z-20">
      <div 
        class="bg-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer shadow-sm active:scale-95 transition-transform" 
        @click="handleBack"
      >
        <Icon name="mdi:arrow-left" class="w-6 h-6 text-[#1e1a4d]" />
      </div>

      <div class="absolute left-0 right-0 top-4 flex flex-col items-center pointer-events-none">
        <p class="text-[12px] font-medium text-[#1e1a4d] opacity-70">{{ formattedDate }}</p>
        <h1 class="text-[22px] font-power font-extrabold text-[#1e1a4d] leading-none mt-0.5">Quiz Culture</h1>
      </div>

      <div class="bg-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 shadow-sm">
        <Icon name="mdi:cube-outline" class="w-6 h-6 text-[#1e1a4d]" />
      </div>
    </div>

    <!-- Persistent Progress Bar (Fixed below header) -->
    <div v-if="!quizStore.loading && !quizStore.error && !quizStore.submitResult && currentQuestion" class="px-6 pt-4 shrink-0 z-10">
      <div class="flex justify-between items-end mb-2 px-1">
        <p class="text-[12px] font-medium text-[#1e1a4d]">
          Question {{ quizStore.currentIndex + 1 }}/{{ quizStore.questions.length }}
        </p>
        <p class="text-[16px] font-pixel text-[#1e1a4d]">
          {{ currentScoreDisplay }} Pts
        </p>
      </div>

      <div class="h-[8px] w-full bg-white rounded-full overflow-hidden shadow-sm">
        <div 
          class="h-full bg-[#59b846] transition-all duration-300"
          :style="{ width: `${progressPercentage}%` }"
        />
      </div>
    </div>

    <!-- Scrollable content area -->
    <div class="flex-1 overflow-y-auto px-6 pb-8 flex flex-col pt-6">
      
      <!-- Loading & Error -->
      <div v-if="quizStore.loading" class="flex-1 flex items-center justify-center">
        <p class="text-[#1e1a4d] font-medium animate-pulse">Chargement...</p>
      </div>
      <div v-else-if="quizStore.error" class="flex-1 flex flex-col items-center justify-center">
        <p class="text-center text-base font-semibold text-[#1e1a4d] mb-4">{{ quizStore.error }}</p>
        <FormPixelButton variant="filled" color="indigo" @click="$router.push('/social/quiz')">
          Retour
        </FormPixelButton>
      </div>

      <!-- Question State -->
      <template v-else-if="currentQuestion">
        <!-- Question Card -->
        <div class="bg-white rounded-[28px] p-6 flex items-center justify-center shadow-sm mb-6 relative shrink-0">
          <span v-if="currentQuestion.tag" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm">
            {{ currentQuestion.tag.name }}
          </span>
          <h2 class="text-[18px] font-bold text-[#1e1a4d] text-center leading-tight">
            {{ currentQuestion.question_text }}
          </h2>
        </div>

        <!-- Answers -->
        <div class="flex-1 flex flex-col justify-end">
          <!-- QCM -->
          <div v-if="currentQuestion.question_type === 'qcm'" class="flex flex-col gap-3 w-full">
            <FormPixelButton
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              variant="filled"
              color="indigo"
              class="w-full !mt-0 !py-2.5"
              :class="{'opacity-50': quizStore.selectedAnswer && quizStore.selectedAnswer !== option}"
              @click="handleSelectAnswer(option)"
            >
              {{ option }}
            </FormPixelButton>
          </div>

          <!-- Timeline -->
          <div v-else-if="currentQuestion.question_type === 'timeline'" class="bg-white rounded-[28px] p-5 shadow-sm">
             <div class="text-center mb-6">
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Année</p>
              <p class="text-4xl font-pixel text-indigo-600">
                {{ quizStore.selectedAnswer || defaultTimelineValue }}
              </p>
            </div>
            <input
              type="range"
              class="w-full h-2 bg-indigo-50 rounded-full appearance-none cursor-pointer"
              :min="currentQuestion.timeline_range?.min || 1800"
              :max="currentQuestion.timeline_range?.max || 2025"
              :value="quizStore.selectedAnswer || defaultTimelineValue"
              @input="onTimelineInput"
            />
            <div class="flex justify-between mt-3 text-[10px] font-bold text-gray-400">
              <span>{{ currentQuestion.timeline_range?.min || 1800 }}</span>
              <span>{{ currentQuestion.timeline_range?.max || 2025 }}</span>
            </div>
            <FormPixelButton
              variant="filled"
              color="indigo"
              class="w-full !mt-6"
              :disabled="!quizStore.selectedAnswer"
              @click="handleNext"
            >
              Valider
            </FormPixelButton>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuizStore } from '~/stores/quiz'

const router = useRouter()
const quizStore = useQuizStore()

const currentQuestion = computed(() => quizStore.currentQuestion)
const isLastQuestion = computed(() => quizStore.currentIndex === quizStore.questions.length - 1)
const progressPercentage = computed(() => quizStore.questions.length ? ((quizStore.currentIndex + 1) / quizStore.questions.length) * 100 : 0)

// Current Score Display (Potential score based on answers)
const currentScoreDisplay = computed(() => {
  return quizStore.answeredCount * 215
}) 

const formattedDate = computed(() => {
  const date = quizStore.sessionDate ? new Date(quizStore.sessionDate + 'T00:00:00') : new Date()
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())
})

const defaultTimelineValue = computed(() => {
  if (!currentQuestion.value?.timeline_range) return 2000
  return Math.round((currentQuestion.value.timeline_range.min + currentQuestion.value.timeline_range.max) / 2)
})

onMounted(async () => {
  if (quizStore.questions.length === 0) await quizStore.fetchTodayQuiz()
  if (quizStore.alreadyCompleted) router.replace('/social/quiz')
})

function handleBack() {
  quizStore.currentIndex > 0 ? quizStore.prevQuestion() : router.back()
}

async function handleSelectAnswer(option: string) {
  if (quizStore.submitting) return
  quizStore.selectAnswer(option)
  handleNext()
}

async function handleNext() {
  if (isLastQuestion.value) {
    quizStore.finishedAt = Date.now()
    await quizStore.submitQuiz()
    if (!quizStore.error) {
      router.push('/social/quiz/results')
    }
  } else {
    quizStore.nextQuestion()
  }
}

function onTimelineInput(e: Event) {
  quizStore.selectAnswer((e.target as HTMLInputElement).value)
}

definePageMeta({ layout: 'footerless' })
</script>

<style scoped>
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: white;
  border: 3px solid #4f39f6;
  border-radius: 50%;
  cursor: pointer;
}
input[type='range']::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: white;
  border: 3px solid #4f39f6;
  border-radius: 50%;
  cursor: pointer;
}
</style>
