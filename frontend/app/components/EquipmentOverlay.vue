<template>
  <transition name="slide-up">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex flex-col">
      
      <div class="absolute inset-0 bg-gray-100/95 backdrop-blur-sm" @click="$emit('close')"></div>

      <div class="relative flex flex-col h-full w-full max-w-lg mx-auto pointer-events-none">
        
        <div class="pointer-events-auto px-6 pt-safe-top pb-2 flex justify-between items-center mt-4">
          <h2 class="text-3xl font-bold font-power text-black">Équipement</h2>
          <button @click="$emit('close')" class="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-500 hover:text-black transition-colors">
            <span class="text-2xl font-bold">✕</span>
          </button>
        </div>

        <div class="pointer-events-auto px-4 py-4">
          <div class="bg-white rounded-[25px] p-4 flex items-center justify-between shadow-lg mx-auto w-full">
            <div class="flex-shrink-0 mr-4">
              <img v-if="character?.avatar" :src="character.avatar" alt="Character" class="w-20 h-20 object-contain pixelated" />
            </div>

            <div class="flex gap-2">
              <div 
                v-for="slot in ['weapon', 'helmet', 'charm']" 
                :key="slot"
                @click="changeSlot(slot)"
                :class="[
                  'w-16 h-16 sm:w-20 sm:h-20 rounded-xl transition-all duration-200 cursor-pointer border-2 relative overflow-hidden',
                  activeSlot === slot ? 'border-black scale-105 shadow-md z-10' : 'border-transparent hover:bg-gray-50'
                ]"
              >
                <Items 
                  v-if="getEquippedItem(slot)"
                  v-bind="getEquippedItem(slot)"
                  :selected="activeSlot === slot"
                />
                <div v-else class="w-full h-full bg-gray-200/50 flex items-center justify-center">
                   <div class="w-3 h-3 rounded-full bg-gray-300"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pointer-events-auto flex-1 bg-white rounded-t-[35px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden mt-2">
          
          <div class="flex flex-col border-b border-gray-100">
            <div class="px-6 pt-6 pb-2 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <span class="text-gray-400 font-bold text-sm uppercase tracking-wider hidden sm:inline">Trier par</span>
                
                <button @click="sortBy = 'level'" :class="['text-sm font-bold transition-colors', sortBy === 'level' ? 'text-black underline decoration-2 underline-offset-4' : 'text-gray-400 hover:text-gray-600']">
                  Niveau
                </button>
                
                <button @click="sortBy = 'damage'" :class="['text-sm font-bold transition-colors', sortBy === 'damage' ? 'text-black underline decoration-2 underline-offset-4' : 'text-gray-400 hover:text-gray-600']">
                  Dégâts
                </button>

                <button @click="sortBy = 'rarity'" :class="['text-sm font-bold transition-colors', sortBy === 'rarity' ? 'text-black underline decoration-2 underline-offset-4' : 'text-gray-400 hover:text-gray-600']">
                  Rareté
                </button>
              </div>
              <span v-if="!loading" class="text-sm text-gray-400 font-bold">{{ filteredItems.length }} items</span>
            </div>

            <div class="px-6 pb-4 overflow-x-auto scrollbar-hide flex gap-2">
              <button 
                v-for="tag in availableTags" 
                :key="tag"
                @click="toggleTag(tag)"
                :class="[
                  'px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap capitalize',
                  activeTag === tag ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
                ]"
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 pb-48 relative">
            <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-2"></div>
              <p class="text-gray-400 font-bold text-sm">Récupération du butin...</p>
            </div>

            <div v-else-if="filteredItems.length > 0" class="grid grid-cols-4 gap-3 sm:gap-4 content-start">
              <div 
                v-for="item in filteredItems" 
                :key="item.id" 
                class="aspect-square cursor-pointer transition-transform active:scale-95"
                @click="selectNewItem(item)"
              >
                <Items v-bind="item" :selected="selectedItemId === item.id" />
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center h-48 text-gray-400 text-center px-4">
               <p class="font-bold text-lg mb-1">Aucun objet trouvé</p>
               <p class="text-sm">Essaie de changer de filtre ou de catégorie.</p>
            </div>
          </div>

          <div class="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur px-4 py-4 border-t border-gray-100 z-30 flex flex-col gap-3">
            
            <transition name="fade">
              <button 
                v-if="selectedItemId"
                @click="handleEquip"
                class="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 text-xl uppercase font-power flex items-center justify-center gap-2"
              >
                <span>Équiper</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
              </button>
            </transition>

            <div class="flex gap-3 w-full">
              <div class="flex-1">
                <PxButton variant="filled" color="indigo" class="!mt-0 w-full h-14 text-lg">
                  Recycler
                </PxButton>
              </div>
              <div class="flex-1">
                <PxButton variant="filled" color="indigo" class="!mt-0 w-full h-14 text-lg">
                  Améliorer
                </PxButton>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import PxButton from './form/PixelButton.vue';

const props = defineProps({
  isOpen: Boolean,
  character: Object,
  initialSlot: String,
  allInventory: Array,
  loading: Boolean
});

const emit = defineEmits(['close', 'equip']);

// --- ÉTAT ---
const activeSlot = ref('weapon');
const selectedItemId = ref(null);
const sortBy = ref('level');
const activeTag = ref(null);

const availableTags = ['nature', 'history', 'science', 'art', 'make', 'society'];
const rarityWeight = { legendary: 4, epic: 3, rare: 2, common: 1, basic: 0 };

// --- WATCHERS ---
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.initialSlot) activeSlot.value = props.initialSlot;
    selectedItemId.value = null;
  }
});

const changeSlot = (slot) => {
  activeSlot.value = slot;
  activeTag.value = null;
  selectedItemId.value = null;
};

const toggleTag = (tag) => {
  activeTag.value = activeTag.value === tag ? null : tag;
};

const getEquippedItem = (slotName) => {
  if (!props.character || !props.character.equippedItems) return null;
  return props.character.equippedItems.find(i => i.category.toLowerCase() === slotName.toLowerCase());
};

const selectNewItem = (item) => {
  selectedItemId.value = selectedItemId.value === item.id ? null : item.id;
};

const handleEquip = () => {
  if (!selectedItemId.value) return;
  const itemToEquip = props.allInventory.find(i => i.id === selectedItemId.value);
  if (itemToEquip) {
    emit('equip', itemToEquip);
    selectedItemId.value = null;
  }
};

// --- CALCUL DE DÉGÂTS ---
const calculateDamage = (item) => {
  const base = item.index_damage || 0;
  const lvl = item.level || 1;
  let multiplier = 1;
  
  switch (item.rarity?.toLowerCase()) {
    case 'basic': multiplier = 1; break;
    case 'common': multiplier = 1.5; break;
    case 'rare': multiplier = 2; break;
    case 'epic': multiplier = 3; break;
    case 'legendary': multiplier = 3; break;
    default: multiplier = 1;
  }
  
  return Math.floor(base * lvl * multiplier);
};

// --- COMPUTED FILTRAGE + TRI ---
const filteredItems = computed(() => {
  if (!props.allInventory) return [];
  
  const currentEquipped = getEquippedItem(activeSlot.value);

  let items = props.allInventory.filter(item => {
    const cat = (item.category || item.slot || '').toLowerCase();
    const isCategoryMatch = cat === activeSlot.value.toLowerCase();
    const isNotCurrentlyEquipped = !currentEquipped || item.id !== currentEquipped.id;
    return isCategoryMatch && isNotCurrentlyEquipped;
  });

  if (activeTag.value) {
    items = items.filter(item => item.types && item.types.includes(activeTag.value.toLowerCase()));
  }

  return items.sort((a, b) => {
    // 1. Tri par Dégâts
    if (sortBy.value === 'damage') {
        const dmgA = calculateDamage(a);
        const dmgB = calculateDamage(b);
        if (dmgA === dmgB) return b.level - a.level;
        return dmgB - dmgA;
    }
    
    // 2. Tri par Niveau
    if (sortBy.value === 'level') {
        return b.level - a.level;
    }
    
    // 3. Tri par Rareté
    const weightA = rarityWeight[a.rarity?.toLowerCase()] || 0;
    const weightB = rarityWeight[b.rarity?.toLowerCase()] || 0;
    if (weightB === weightA) return b.level - a.level;
    return weightB - weightA;
  });
});
</script>

<style scoped>
.pt-safe-top { padding-top: max(20px, env(safe-area-inset-top)); }
.pixelated { image-rendering: pixelated; }
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(20px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.font-power { font-family: 'Montserrat', sans-serif; }
</style>