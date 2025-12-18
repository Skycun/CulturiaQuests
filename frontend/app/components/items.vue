<template>
  <div 
    :class="[
      'relative w-full aspect-square pixel-box select-none transition-transform duration-200 cursor-pointer',
      selected ? 'bg-black p-[4px] scale-105 z-10' : 'p-0 hover:scale-105'
    ]"
  >
    
    <div :class="['w-full h-full pixel-box relative flex flex-col items-center justify-center', gradientClass]">
      
      <span class="absolute top-1 left-2 font-pixel text-white text-[10px] sm:text-base z-10 text-shadow-outline leading-none">
        Niv. {{ level }}
      </span>

      <img 
        :src="image" 
        :alt="category" 
        class="w-[55%] h-[55%] object-contain pixelated drop-shadow-md mt-1" 
      />

      <div class="absolute bottom-1.5 left-2 flex gap-0.5 z-10">
        <img 
          v-for="type in types" 
          :key="type"
          :src="getTypeIcon(type)" 
          class="w-3 h-3 sm:w-5 sm:h-5 drop-shadow-sm"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  level: { type: Number, required: true },
  rarity: { 
    type: String, 
    required: true,
    validator: (v) => ['legendary', 'epic', 'rare', 'common'].includes(v)
  },
  selected: { type: Boolean, default: false },
  image: { type: String, required: true },
  types: { type: Array, default: () => [] }, 
  category: { type: String, default: 'Weapon' }
});

const gradientClass = computed(() => {
  switch (props.rarity) {
    case 'legendary': return 'bg-gradient-to-b from-[#fcd34d] to-[#fbbf24]'; 
    case 'epic': return 'bg-gradient-to-b from-[#e879f9] to-[#a855f7]'; 
    case 'common': return 'bg-gradient-to-b from-[#4ade80] to-[#22c55e]'; 
    case 'rare': return 'bg-gradient-to-b from-[#38bdf8] to-[#3b82f6]';
    default: return 'bg-gray-400';
  }
});

const getTypeIcon = (typeName) => {
  // Remplace par tes vrais chemins
  const map = {
    nature: '/assets/nature-icon.png',
    history: '/assets/history-icon.png',
    science: '/assets/science-icon.png',
    art: '/assets/art-icon.png', 
    make: '/assets/make-icon.png',
    society: '/assets/society-icon.png' 
  };
  return map[typeName.toLowerCase()] || `/${typeName}.svg`;
};
</script>

<style scoped>
.pixel-box {
  clip-path: polygon(
    0px 4px, 4px 4px, 4px 0px,
    calc(100% - 4px) 0px, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0px calc(100% - 4px)
  );
}

.font-pixel {
  font-family: 'Jersey 10', sans-serif;
}

.pixelated {
  image-rendering: pixelated;
}

.text-shadow-outline {
  text-shadow: -1px 0 #000, 0 1px #000, 1px 0 #000, 0 -1px #000, 1px 1px #000, -1px -1px #000;
}
/* Sur les écrans plus grands, on épaissit le contour du texte */
@media (min-width: 640px) {
  .text-shadow-outline {
    text-shadow: -2px 0 #000, 0 2px #000, 2px 0 #000, 0 -2px #000, 2px 2px #000, -2px -2px #000;
  }
}
</style>