<template>
  <div class="pointer-events-auto absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur px-4 py-4 border-t border-gray-100 z-30 flex flex-col gap-3">
    
    <transition name="fade" mode="out-in">
        <button 
            v-if="mode === 'normal' && hasSelection"
            @click="$emit('equip')"
            class="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 text-xl uppercase font-power flex items-center justify-center gap-2"
        >
            <span>Équiper</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
        </button>
    </transition>

    <div class="flex gap-3 w-full">
      <div class="flex-1">
         <PxButton v-if="mode === 'normal'" variant="filled" color="indigo" class="!mt-0 w-full h-14 text-lg" @click="$emit('toggle-recycle')">Recycler</PxButton>
         
         <PxButton v-if="mode === 'recycle'" variant="filled" color="indigo" class="!mt-0 w-full h-14 text-lg" @click="$emit('confirm-recycle')" :disabled="!canRecycle">Valider</PxButton>
         
         <button 
            v-if="mode === 'upgrade'"
            @click="$emit('confirm-upgrade')"
            :disabled="!hasSelection || !canAffordUpgrade"
            :class="[
              'w-full h-14 font-bold rounded-xl shadow-lg transition-all active:scale-95 font-power flex items-center justify-center gap-3',
              (hasSelection && canAffordUpgrade) ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
            ]"
         >
            <span class="text-sm">Améliorer</span>
            <span v-if="hasSelection && canAffordUpgrade" class="text-sm opacity-90 whitespace-nowrap">
              Niv. {{ newLevel }}
            </span>
         </button>
      </div>

      <div class="flex-1">
         <PxButton v-if="mode === 'normal'" variant="filled" color="indigo" class="!mt-0 w-full h-14 text-lg" @click="$emit('toggle-upgrade')">Améliorer</PxButton>
         <PxButton v-if="mode === 'recycle'" variant="filled" color="red" class="!mt-0 w-full h-14 text-lg" @click="$emit('toggle-recycle')">Annuler</PxButton>
         <PxButton v-if="mode === 'upgrade'" variant="filled" color="red" class="!mt-0 w-full h-14 text-lg" @click="$emit('toggle-upgrade')">Annuler</PxButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import PxButton from '../form/PixelButton.vue';

defineProps({
  mode: String, // 'normal', 'recycle', 'upgrade'
  hasSelection: Boolean,
  canRecycle: Boolean,
  canAffordUpgrade: Boolean,
  newLevel: Number
});

defineEmits(['equip', 'toggle-recycle', 'confirm-recycle', 'toggle-upgrade', 'confirm-upgrade']);
</script>

<style scoped>
.font-power { font-family: 'Montserrat', sans-serif; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>