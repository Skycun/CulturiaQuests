<template>
  <div class="min-h-screen bg-black text-white font-sans flex flex-col">
    
    <div class="sticky top-0 z-20 bg-black/80 backdrop-blur-md p-4 border-b border-gray-800">
      <div class="flex items-center gap-4 mb-4">
        <button @click="router.back()" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="font-power text-2xl text-white">Collection de Badges</h1>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button 
            v-for="tab in tabs" :key="tab.id"
            @click="activeTab = tab.id"
            class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border shrink-0"
            :class="activeTab === tab.id ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'"
        >
            {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <div 
            v-for="badge in filteredBadges" 
            :key="badge.id"
            @click="handleBadgeClick(badge)"
            class="relative aspect-square rounded-xl p-1 transition-all duration-200"
            :class="getBadgeClasses(badge)"
        >
            <div class="w-full h-full rounded-lg overflow-hidden bg-gray-900 relative">
                <img 
                    :src="badge.image" 
                    class="w-full h-full object-contain p-2"
                    :class="{ 'grayscale opacity-30': !badge.unlocked }"
                />
                
                <div v-if="!badge.unlocked" class="absolute inset-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                </div>

                <div v-if="badge.equipped" class="absolute top-1 right-1 bg-green-500 text-black rounded-full p-0.5 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                </div>
            </div>

            <p class="text-[10px] text-center mt-1 truncate font-bold" :class="badge.unlocked ? 'text-gray-300' : 'text-gray-700'">
                {{ badge.name }}
            </p>
        </div>
    </div>

    <transition name="fade">
        <div v-if="showMaxAlert" class="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 font-bold text-sm">
            Maximum 4 badges équipés !
        </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useBadgeStore } from '~/stores/badge';

const router = useRouter();
const badgeStore = useBadgeStore();

const activeTab = ref('all');
const showMaxAlert = ref(false);

const tabs = [
    { id: 'all', label: 'Tous' },
    { id: 'comcom', label: 'Com-Com' },
    { id: 'departement', label: 'Département' },
    { id: 'region', label: 'Région' },
    { id: 'special', label: 'Spécial' }
];

const filteredBadges = computed(() => {
    return badgeStore.badgesByCategory(activeTab.value);
});

// Gestion des classes CSS pour l'état visuel
const getBadgeClasses = (badge) => {
    if (!badge.unlocked) return 'opacity-60 cursor-not-allowed';
    
    if (badge.equipped) {
        return 'ring-2 ring-green-500 bg-green-500/10 scale-105 cursor-pointer';
    }
    
    return 'hover:bg-gray-800 cursor-pointer';
};

const handleBadgeClick = (badge) => {
    if (!badge.unlocked) return; // On ne fait rien si verrouillé

    // Si on essaie d'équiper un 5ème badge
    if (!badge.equipped && badgeStore.equippedCount >= 4) {
        triggerAlert();
        return;
    }

    // Sinon on bascule
    badgeStore.toggleEquip(badge.id);
};

const triggerAlert = () => {
    showMaxAlert.value = true;
    setTimeout(() => showMaxAlert.value = false, 2000);
};
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.font-power { font-family: 'Montserrat', sans-serif; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>