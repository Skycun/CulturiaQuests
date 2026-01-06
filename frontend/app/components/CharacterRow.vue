<template>
  <div class="bg-white rounded-[30px] p-4 flex items-center justify-between shadow-sm mb-4 w-full max-w-lg mx-auto">
    
    <div class="flex-shrink-0 mr-2 sm:mr-6">
      <img 
        :src="characterImage" 
        :alt="characterName" 
        class="w-16 h-16 sm:w-24 sm:h-24 object-contain pixelated"
      />
    </div>

    <div class="flex gap-2 sm:gap-4 overflow-x-auto p-2 scrollbar-hide">
      <div 
        v-for="(item, index) in sortedItems" 
        :key="index" 
        class="w-16 sm:w-20 flex-shrink-0 cursor-pointer transition-transform active:scale-95"
        @click="$emit('click-item', item)" 
      >
        <Items 
          :level="item.level"
          :rarity="item.rarity"
          :image="item.image"
          :category="item.category"
          :index_damage="item.index_damage || 0" 
          :types="item.types"
          :selected="false" 
        />
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';

const emit = defineEmits(['click-item']);

const props = defineProps({
  characterName: { type: String, required: true },
  characterImage: { type: String, required: true },
  items: { type: Array, required: true } 
});

// --- LOGIQUE DE TRI ---
const sortedItems = computed(() => {
  // 1. On définit l'ordre exact souhaité
  const order = ['weapon', 'helmet', 'charm'];

  // 2. On crée une copie du tableau pour éviter de modifier la prop directement
  // 3. On trie
  return [...props.items].sort((a, b) => {
    // On récupère la catégorie en minuscule pour éviter les soucis (Weapon vs weapon)
    const catA = (a.category || '').toLowerCase();
    const catB = (b.category || '').toLowerCase();

    // On compare les index dans notre tableau 'order'
    return order.indexOf(catA) - order.indexOf(catB);
  });
});
</script>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}

/* --- CACHER LA SCROLLBAR --- */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}

.scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
}
</style>