<template>
  <div class="mb-8 flex flex-col items-center">
    <div class="flex justify-center items-center mb-2 max-w-md w-full">
      <div
        v-for="stepNum in totalSteps"
        :key="stepNum"
        class="flex items-center"
      >
        <div
          :class="[
            'w-8 h-8 rounded-full flex items-center justify-center font-pixel text-sm transition-all',
            stepNum === currentStep
              ? 'bg-indigo-600 text-white scale-110'
              : stepNum < currentStep
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-500'
          ]"
        >
          <span v-if="stepNum < currentStep">✓</span>
          <span v-else>{{ stepNum }}</span>
        </div>
        <div
          v-if="stepNum < totalSteps"
          :class="[
            'w-24 h-1 mx-2 transition-all',
            stepNum < currentStep ? 'bg-green-500' : 'bg-gray-200'
          ]"
        />
      </div>
    </div>
    <p class="text-center text-sm font-pixel text-gray-600">
      {{ stepTitles[currentStep - 1] }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps({
  currentStep: {
    type: Number,
    required: true,
    validator: (v: number) => v >= 1
  },
  totalSteps: {
    type: Number,
    required: true,
    validator: (v: number) => v >= 1
  },
  stepTitles: {
    type: Array as PropType<string[]>,
    required: true,
    validator: (v: string[]) => v.length > 0
  }
})
</script>
