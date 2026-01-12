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

      <div class="absolute bottom-2 left-1.5 flex flex-col gap-1 z-10">
        <img 
          v-for="type in types" 
          :key="type"
          :src="getTypeIcon(type)" 
          class="w-3 h-3 sm:w-4 sm:h-4 object-contain drop-shadow-sm"
        />
      </div>

      <span class="absolute bottom-1 right-2 font-pixel text-white text-[10px] sm:text-base z-10 text-shadow-outline leading-none text-right">
        {{ formattedDamage }}
      </span>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  level: { type: Number, required: true },
  // On ajoute index_damage (avec une valeur par défaut de 0 pour éviter les NaN si manquant)
  index_damage: { type: Number, default: 0 },
  rarity: { 
    type: String, 
    required: true,
    validator: (v) => ['legendary', 'epic', 'rare', 'common', 'basic'].includes(v) // Ajout de 'basic' au validateur
  },
  selected: { type: Boolean, default: false },
  image: { type: String, required: true },
  types: { type: Array, default: () => [] }, 
  category: { type: String, default: 'Weapon' }
});

// --- 1. Calcul des Dégâts ---
const calculatedDamage = computed(() => {
  const base = props.index_damage || 0;
  const lvl = props.level || 1;
  
  let multiplier = 1;
  switch (props.rarity?.toLowerCase()) {
    case 'basic': multiplier = 1; break;
    case 'common': multiplier = 1.5; break;
    case 'rare': multiplier = 2; break;
    case 'epic': multiplier = 3; break;
    case 'legendary': multiplier = 3; break;
    default: multiplier = 1;
  }

  return Math.floor(base * lvl * multiplier);
});

// --- 2. Formatage (12000 -> 12k) ---
const formattedDamage = computed(() => {
  const val = calculatedDamage.value;
  if (val >= 1000) {
    // toFixed(1) garde une décimale (12.5k), replace enlève le .0 si c'est un entier (12.0k -> 12k)
    return (val / 1000).toFixed(1).replace('.0', '') + 'k';
  }
  return val.toString();
});

// --- 3. Gestion des Couleurs ---
const gradientClass = computed(() => {
  switch (props.rarity?.toLowerCase()) {
    case 'legendary': return 'bg-gradient-to-b from-yellow-300 to-amber-500';
    case 'epic': return 'bg-gradient-to-b from-fuchsia-400 to-purple-600'; 
    case 'rare': return 'bg-gradient-to-b from-sky-400 to-blue-600';
    case 'common': return 'bg-gradient-to-b from-green-400 to-emerald-600';
    case 'basic': return 'bg-gradient-to-b from-gray-300 to-gray-500';
    default: return 'bg-gray-400';
  }
});

// --- 4. Icônes ---
const getTypeIcon = (typeName) => {
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
@media (min-width: 640px) {
  .text-shadow-outline {
    text-shadow: -2px 0 #000, 0 2px #000, 2px 0 #000, 0 -2px #000, 2px 2px #000, -2px -2px #000;
  }
}
</style>