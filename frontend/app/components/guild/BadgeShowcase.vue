<template>
  <div class="bg-gray-900/80 rounded-xl p-4 border border-gray-800 mb-6 backdrop-blur-sm">
    
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-power text-lg text-amber-400 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        Mes Badges Favoris
      </h3>
      
      <span class="text-xs font-bold bg-gray-800 text-gray-400 px-2 py-1 rounded border border-gray-700">
        {{ equippedBadges.length }} / 4
      </span>
    </div>

    <div class="grid grid-cols-4 gap-3">
      <div 
        v-for="index in 4" 
        :key="index" 
        class="flex flex-col items-center gap-2"
      >
        <div 
          v-if="equippedBadges[index - 1]" 
          @click="$emit('open-collection')"
          class="w-full aspect-square bg-gray-800 rounded-xl p-0.5 border-2 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] relative group cursor-pointer hover:scale-105 transition-transform"
        >
            <div class="w-full h-full rounded-lg bg-black/40 flex items-center justify-center overflow-hidden">
                <img :src="equippedBadges[index - 1].image" class="w-full h-full object-contain" />
            </div>
            
            </div>

        <button 
          v-else 
          @click="$emit('open-collection')"
          class="w-full aspect-square rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/30 hover:bg-gray-800 hover:border-gray-500 hover:text-white text-gray-500 flex items-center justify-center transition-all group"
        >
           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
           </svg>
        </button>
      </div>
    </div>

    <button 
      @click="$emit('open-collection')"
      class="w-full mt-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider rounded border border-gray-700 transition-colors flex items-center justify-center gap-2"
    >
      Accéder à la collection
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  equippedBadges: { type: Array, default: () => [] }
});

defineEmits(['open-collection']);
</script>