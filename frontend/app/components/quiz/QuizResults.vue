<script setup lang="ts">
import type { QuizSubmitResult } from '~/types/quiz'
import {
  getTierColor,
  getTierLabel,
  getSlotLabel,
  getRarityColor,
  MAX_QUIZ_SCORE
} from '~/types/quiz'

defineProps<{
  result: QuizSubmitResult
}>()
</script>

<template>
  <div class="bg-white border rounded-lg p-6 shadow-sm">
    <!-- Score + Tier -->
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold mb-2">Resultats</h2>
      <p class="mb-2">
        <span class="text-5xl font-bold text-blue-600">{{ result.score }}</span>
        <span class="text-lg text-gray-400"> / {{ MAX_QUIZ_SCORE }}</span>
      </p>
      <span
        class="inline-block px-4 py-1 rounded-full text-sm font-semibold"
        :class="getTierColor(result.rewards.tier)"
      >
        {{ getTierLabel(result.rewards.tier) }}
      </span>
      <p class="text-sm text-gray-500 mt-2">Streak: {{ result.newStreak }} jour(s)</p>
    </div>

    <!-- Recompenses -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 class="font-semibold mb-3">Recompenses</h3>
      <div class="flex gap-4 justify-center mb-3">
        <div class="text-center">
          <span class="text-2xl">Gold</span>
          <p class="font-bold text-yellow-600">+{{ result.rewards.gold }}</p>
          <p class="text-xs text-gray-500">Gold</p>
        </div>
        <div class="text-center">
          <span class="text-2xl">XP</span>
          <p class="font-bold text-purple-600">+{{ result.rewards.exp }}</p>
          <p class="text-xs text-gray-500">XP</p>
        </div>
      </div>
      <div v-if="result.rewards.items.length > 0" class="border-t pt-3">
        <p class="text-sm text-gray-600 mb-2">Items obtenus :</p>
        <div class="space-y-2">
          <div
            v-for="item in result.rewards.items"
            :key="item.documentId"
            class="flex items-center gap-3 bg-white px-3 py-2 rounded border hover:shadow-sm transition-shadow"
            :class="getRarityColor(item.rarity)"
          >
            <div v-if="item.icon?.url" class="w-10 h-10 flex-shrink-0">
              <img :src="item.icon.url" :alt="item.name" class="w-full h-full object-contain">
            </div>
            <div v-else class="w-10 h-10 flex-shrink-0 bg-gray-200 rounded flex items-center justify-center">
              <span class="text-gray-400 text-xs">?</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm truncate">{{ item.name }}</span>
                <span class="text-xs text-gray-400 capitalize">({{ item.rarity }})</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>Niv. {{ item.level }}</span>
                <span>•</span>
                <span>{{ getSlotLabel(item.slot) }}</span>
                <span>•</span>
                <span>Dmg: {{ item.index_damage }}</span>
              </div>
              <div v-if="item.tags && item.tags.length > 0" class="flex gap-1 mt-1 flex-wrap">
                <span
                  v-for="tag in item.tags"
                  :key="tag.name"
                  class="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                >
                  {{ tag.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail des reponses -->
    <div class="space-y-2">
      <h3 class="font-semibold mb-2">Detail des reponses</h3>
      <div
        v-for="(ans, i) in result.detailedAnswers"
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
          <span v-if="!ans.isCorrect" class="text-red-600">Votre reponse: {{ ans.userAnswer }}</span>
          <span :class="ans.isCorrect ? 'text-green-600' : 'text-gray-600'">
            {{ ans.isCorrect ? 'Correct' : 'Correct:' }} {{ ans.correctAnswer }}
          </span>
        </p>
        <p v-if="ans.explanation" class="text-xs text-gray-500 mt-1 italic">{{ ans.explanation }}</p>
      </div>
    </div>
  </div>
</template>
