<template>
  <div class="flex items-end gap-2 dialogue-bubble">
    <img
      :src="npcImage"
      alt="NPC"
      class="w-20 h-28 rounded-xl object-cover object-top border-2 border-indigo-400 flex-shrink-0"
    >
    <div class="bg-indigo-900/40 border border-indigo-500/30 rounded-2xl rounded-bl-none p-3 flex-1 backdrop-blur-sm">
      <p class="font-onest text-sm leading-snug text-white">{{ text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string
  npcImage: string
}>()
</script>

<style scoped>
.dialogue-bubble {
  animation: fadeInUp 0.3s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
