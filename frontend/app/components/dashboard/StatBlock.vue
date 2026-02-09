<template>
  <div class="bg-gray-800/50 rounded-lg p-3">
    <p class="text-xs text-gray-500 uppercase tracking-wider mb-1 font-onest">{{ label }}</p>
    <p class="text-lg font-bold font-onest" :class="color || 'text-white'">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  color?: string
}>()
</script>
