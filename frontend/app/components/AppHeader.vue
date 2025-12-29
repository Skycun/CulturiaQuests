<template>
  <header class="fixed top-0 left-0 w-full z-50 backdrop-blur-md transition-all duration-300 pt-[env(safe-area-inset-top)] box-content pointer-events-none">

    <div class="w-full max-w-5xl mx-auto px-4 sm:px-8 h-14 sm:h-20 flex items-center">
      <div class="w-full grid grid-cols-3 gap-2 sm:gap-4 items-center">

        <div class="header-pill pointer-events-auto">
          <img src="/assets/coin.png" alt="Or" class="header-icon">
          <span class="block sm:hidden">{{ formatCompact(guildStore.gold) }}</span>
          <span class="hidden sm:block">{{ formatFull(guildStore.gold) }}</span>
        </div>

        <div class="header-pill pointer-events-auto">
          <img src="/assets/scrap.png" alt="Scrap" class="header-icon">
          <span class="block sm:hidden">{{ formatCompact(guildStore.scrap) }}</span>
          <span class="hidden sm:block">{{ formatFull(guildStore.scrap) }}</span>
        </div>

        <div class="header-pill pointer-events-auto">
          <img src="/assets/level.png" alt="Niveau" class="header-icon">
          <span>Lvl {{ guildStore.level }}</span>
        </div>

      </div>
    </div>
  </header>

  <div class="w-full h-14 sm:h-20 pt-[env(safe-area-inset-top)] box-content"></div>
</template>

<script setup>
import { useGuildStore } from '~/stores/guild';

const guildStore = useGuildStore();

const formatFull = (num) => num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "0";
const formatCompact = (num) => {
  if (!num) return "0";
  return new Intl.NumberFormat('fr-FR', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(num);
};
</script>

<style scoped>
.header-pill {
  @apply flex items-center justify-center bg-transparent rounded-full border-2 border-black shadow-sm whitespace-nowrap overflow-hidden px-3 py-1 sm:px-6 sm:py-2 font-bold text-xs sm:text-xl text-black w-full;
}
.header-icon {
  @apply object-contain mr-1.5 sm:mr-3 w-4 h-4 sm:w-8 sm:h-8;
}
</style>