<template>
  <div class="flex justify-center gap-3 opacity-0">
    <!-- Gold badge -->
    <div class="flex items-center gap-2 bg-stone-800/90 rounded-full px-4 py-2 border border-stone-700/50">
      <img src="/assets/coin.png" alt="Gold" class="w-5 h-5" />
      <span class="text-white font-power text-base">+{{ formattedGold }}</span>
    </div>

    <!-- XP badge -->
    <div class="flex items-center gap-2 bg-stone-800/90 rounded-full px-4 py-2 border border-stone-700/50">
      <svg class="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z"/>
      </svg>
      <span class="text-white font-power text-base">+{{ formattedExp }} Xp</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  gold: number
  exp: number
}>()

function formatNumber(num: number): string {
  if (num >= 1000) {
    return num.toLocaleString('fr-FR')
  }
  return num.toString()
}

const formattedGold = computed(() => formatNumber(props.gold))
const formattedExp = computed(() => formatNumber(props.exp))
</script>
