<script setup lang="ts">
import type { QuizQuestion } from '~/types/quiz'

const props = defineProps<{
  question: QuizQuestion
  selectedAnswer: string | null
}>()

const emit = defineEmits<{
  answer: [value: string]
}>()

function onSliderInput(e: Event) {
  emit('answer', (e.target as HTMLInputElement).value)
}

const defaultSliderValue = computed(() => {
  if (props.selectedAnswer) return props.selectedAnswer
  const range = props.question.timeline_range
  if (!range) return '1950'
  return String(Math.round((range.min + range.max) / 2))
})
</script>

<template>
  <div class="bg-white border rounded-lg p-6 shadow-sm">
    <!-- Header: type + tag -->
    <div class="flex items-center gap-2 mb-3">
      <span
        class="text-xs font-bold text-white px-2 py-0.5 rounded"
        :class="question.question_type === 'qcm' ? 'bg-blue-500' : 'bg-purple-500'"
      >
        {{ question.question_type === 'qcm' ? 'QCM' : 'Timeline' }}
      </span>
      <span v-if="question.tag" class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
        {{ question.tag.name }}
      </span>
    </div>

    <p class="text-lg font-semibold mb-4">{{ question.question_text }}</p>

    <!-- QCM -->
    <div v-if="question.question_type === 'qcm' && question.options" class="space-y-2">
      <button
        v-for="(opt, i) in question.options"
        :key="i"
        class="w-full text-left px-4 py-3 rounded-lg border transition-colors"
        :class="{
          'border-blue-500 bg-blue-50 text-blue-700': selectedAnswer === opt,
          'border-gray-200 hover:border-gray-300 hover:bg-gray-50': selectedAnswer !== opt,
        }"
        @click="emit('answer', opt)"
      >
        <span class="font-medium text-gray-500 mr-2">{{ String.fromCharCode(65 + i) }}.</span>
        {{ opt }}
      </button>
    </div>

    <!-- Timeline -->
    <div v-else-if="question.question_type === 'timeline'" class="space-y-3">
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500 w-14 text-right">{{ question.timeline_range?.min }}</span>
        <input
          type="range"
          class="flex-1 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg appearance-none cursor-pointer"
          :min="question.timeline_range?.min || 1900"
          :max="question.timeline_range?.max || 2025"
          :value="defaultSliderValue"
          @input="onSliderInput"
        />
        <span class="text-sm text-gray-500 w-14">{{ question.timeline_range?.max }}</span>
      </div>
      <p class="text-center">
        Annee choisie :
        <span class="text-2xl font-bold text-blue-600">{{ selectedAnswer || '?' }}</span>
      </p>
    </div>
  </div>
</template>
