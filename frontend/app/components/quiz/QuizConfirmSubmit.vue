<script setup lang="ts">
defineProps<{
  answeredCount: number
  totalQuestions: number
  timeSpentSeconds: number
  submitting: boolean
}>()

const emit = defineEmits<{
  submit: []
  goBack: []
}>()
</script>

<template>
  <div class="bg-white border rounded-lg p-6 shadow-sm text-center">
    <h2 class="text-2xl font-bold mb-4">Pret a soumettre ?</h2>
    <p class="text-gray-500 mb-4">
      Vous avez repondu a {{ answeredCount }} questions sur {{ totalQuestions }}.
    </p>
    <p class="text-sm text-gray-400 mb-6">
      Temps ecoule : {{ timeSpentSeconds }}s
    </p>

    <button
      class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
      :disabled="submitting"
      @click="emit('submit')"
    >
      {{ submitting ? 'Soumission en cours...' : 'Soumettre mes reponses' }}
    </button>

    <button
      class="block mx-auto mt-4 text-sm text-gray-500 hover:underline"
      @click="emit('goBack')"
    >
      Revoir mes reponses
    </button>
  </div>
</template>
