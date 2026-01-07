<template>
  <div class="pointer-events-auto flex-1 bg-white rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden mt-1">
    
    <div class="flex flex-col border-b border-gray-100">
      <div class="px-6 pt-4 pb-2 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-gray-400 font-bold text-xs uppercase tracking-wider hidden sm:inline">Trier par</span>
          <button @click="$emit('update:sortBy', 'rarity')" :class="['text-xs font-bold transition-colors', sortBy === 'rarity' ? 'text-black underline decoration-2 underline-offset-4' : 'text-gray-400 hover:text-gray-600']">Rareté</button>
          <button @click="$emit('update:sortBy', 'level')" :class="['text-xs font-bold transition-colors', sortBy === 'level' ? 'text-black underline decoration-2 underline-offset-4' : 'text-gray-400 hover:text-gray-600']">Niveau</button>
          <button @click="$emit('update:sortBy', 'damage')" :class="['text-xs font-bold transition-colors', sortBy === 'damage' ? 'text-black underline decoration-2 underline-offset-4' : 'text-gray-400 hover:text-gray-600']">Dégâts</button>
        </div>
        <span v-if="!loading" class="text-xs text-gray-400 font-bold">{{ items.length }} items</span>
      </div>
      
      <div class="px-6 pb-3 overflow-x-auto scrollbar-hide flex gap-2">
        <button v-for="tag in availableTags" :key="tag" @click="$emit('toggle-tag', tag)" 
          :class="['px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all whitespace-nowrap capitalize', activeTag === tag ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400']">
          {{ tag }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 pb-48 relative">
      <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-2"></div>
        <p class="text-gray-400 font-bold text-sm">Récupération du butin...</p>
      </div>

      <div v-else-if="items.length > 0" class="grid grid-cols-4 gap-2 sm:gap-3 content-start">
        <div 
          v-for="item in items" 
          :key="item.id" 
          class="aspect-square cursor-pointer transition-transform active:scale-95 relative"
          @click="$emit('item-click', item)"
        >
          <Items 
            v-bind="item" 
            :selected="isRecycleMode ? selectedRecycleIds.has(item.id) : selectedId === item.id" 
          />
          
          <div v-if="isRecycleMode && selectedRecycleIds.has(item.id)" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center z-20 shadow-sm border border-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center h-48 text-gray-400 text-center px-4">
         <p class="font-bold text-lg mb-1">Aucun objet trouvé</p>
         <p class="text-sm">Essaie de changer de filtre ou de catégorie.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: Array,
  loading: Boolean,
  sortBy: String,
  activeTag: String,
  availableTags: Array,
  isRecycleMode: Boolean,
  selectedId: [String, Number],
  selectedRecycleIds: Set // On passe le Set directement
});

defineEmits(['update:sortBy', 'toggle-tag', 'item-click']);
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>