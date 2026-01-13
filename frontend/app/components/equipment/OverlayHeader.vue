<template>
  <div class="pointer-events-auto px-6 pt-safe-top pb-1 flex justify-between items-center mt-2">
    <h2 class="text-2xl font-bold font-power text-black">{{ title }}</h2>
    <button @click="$emit('close')" class="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-500 hover:text-black transition-colors">
      <span class="text-xl font-bold">✕</span>
    </button>
  </div>
</template>

<script setup>
defineProps(['title']);
defineEmits(['close']);
</script>

<style scoped>
.pt-safe-top { padding-top: max(20px, env(safe-area-inset-top)); }
</style>