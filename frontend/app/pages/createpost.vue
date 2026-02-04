<template>
  <div class="min-h-screen bg-gray-50 font-sans pb-24">
    
    <div class="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center gap-4">
        <button @click="router.back()" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-xl font-bold font-power">Nouveau Post</h1>
    </div>

    <div class="p-6">
        <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Choisir une expédition</h2>

        <div class="space-y-3">
            <div 
                v-for="run in recentRuns" 
                :key="run.id"
                @click="selectedRunId = run.id"
                class="bg-white p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 relative overflow-hidden"
                :class="selectedRunId === run.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-transparent shadow-sm hover:border-gray-200'"
            >
                <div class="w-12 h-12 bg-gray-100 rounded-lg p-1 shrink-0">
                    <img :src="run.museumImage" class="w-full h-full object-contain pixelated" />
                </div>
                
                <div class="flex-1">
                    <h3 class="font-bold text-slate-800 text-sm">{{ run.museumName }}</h3>
                    <p class="text-xs text-gray-500 font-bold mt-1">
                        Palier {{ run.tier }} • {{ run.timeAgo }}
                    </p>
                </div>

                <div v-if="selectedRunId === run.id" class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                </div>
            </div>
        </div>

        <transition name="fade">
            <div v-if="selectedRunId" class="mt-8">
                <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Votre ressenti</h2>
                <div class="flex gap-2 flex-wrap">
                    <button 
                        v-for="tag in reactions" 
                        :key="tag.text"
                        @click="selectedReaction = tag"
                        class="px-4 py-2 rounded-full border text-sm font-bold transition-all flex items-center gap-2"
                        :class="selectedReaction.text === tag.text ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'"
                    >
                        <span>{{ tag.icon }}</span>
                        <span>{{ tag.text }}</span>
                    </button>
                </div>

                <div class="mt-10">
                    <button 
                        @click="publishPost"
                        class="w-full py-4 bg-[#4D4DFF] text-white font-pixel text-xl uppercase rounded-xl shadow-[0_4px_0_#2a2a9e] active:shadow-none active:translate-y-1 transition-all"
                    >
                        Publier
                    </button>
                </div>
            </div>
        </transition>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const selectedRunId = ref(null);
const selectedReaction = ref({ icon: '⚡', text: 'Vitesse +12%' }); // Défaut

// Données simulées (À remplacer par un store "RunHistoryStore")
const recentRuns = ref([
    {
        id: 1,
        museumName: "Musée d'art et d'histoire de Saint-Lô",
        museumImage: "/assets/musee.png",
        tier: 15,
        timeAgo: "Il y a 2h",
        duration: "13:12",
        bestLoot: { name: "Anneau de Valognes", image: "/assets/charm2.png", rarity: "legendary" }
    },
    {
        id: 2,
        museumName: "Abbaye aux Hommes",
        museumImage: "/assets/musee.png", // Placeholder
        tier: 8,
        timeAgo: "Hier",
        duration: "08:45",
        bestLoot: { name: "Casque rouillé", image: "/assets/helmet2.png", rarity: "common" }
    }
]);

const reactions = [
    { icon: '⚡', text: 'Vitesse +12%' },
    { icon: '❤️', text: 'Coup de cœur' },
    { icon: '💀', text: 'Difficile' },
    { icon: '💰', text: 'Rentable' },
    { icon: '😴', text: 'Chill' }
];

const publishPost = () => {
    // ICI : Appel API pour créer le post
    console.log("Post publié !", { 
        runId: selectedRunId.value, 
        reaction: selectedReaction.value 
    });
    
    // Retour au feed
    router.push('/social');
};
</script>

<style scoped>
.font-power { font-family: 'Montserrat', sans-serif; }
.font-pixel { font-family: 'Jersey 10', sans-serif; }
.pixelated { image-rendering: pixelated; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>