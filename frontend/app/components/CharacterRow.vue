<template>
  <div class="bg-white rounded-[30px] p-4 flex items-center justify-between shadow-sm mb-4 w-full max-w-lg mx-auto">
    
    <div class="flex-shrink-0 mr-2 sm:mr-6">
      <img 
        :src="characterImage" 
        :alt="characterName" 
        class="w-16 h-16 sm:w-24 sm:h-24 object-contain pixelated"
      />
    </div>

    <div class="flex gap-2 sm:gap-4 overflow-x-auto">
      <div v-for="(item, index) in items" :key="index" class="w-16 sm:w-20">
        <Items 
          :level="item.level"
          :rarity="item.rarity"
          :image="item.image"
          :category="item.category"
          :types="item.types"
          :selected="false" 
        />
      </div>
    </div>

  </div>
</template>

<script setup>
// On n'importe pas ItemCard ici car Nuxt le fait auto (si dans components/)
// Sinon : import ItemCard from './ItemCard.vue'

const props = defineProps({
  characterName: { type: String, required: true },
  characterImage: { type: String, required: true },
  items: { type: Array, required: true } // Tableau d'objets item
});
</script>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
</style>