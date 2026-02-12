<template>
  <div class="min-h-screen bg-gray-50 font-sans pb-24">
    
    <div class="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center gap-4">
        <button @click="router.back()" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-xl font-bold font-power">Nouveau Post</h1>
    </div>

    <div class="p-6">
        
        <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">1. Choisir une expédition</h2>

        <div v-if="isLoading" class="flex flex-col items-center justify-center py-10 space-y-4">
            <div class="w-8 h-8 border-4 border-[#4D4DFF] border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="recentRuns.length === 0" class="text-center py-10 text-gray-400 font-bold text-sm bg-white rounded-2xl border-2 border-dashed border-gray-200">
            Aucune expédition récente trouvée.<br>Partez à l'aventure d'abord !
        </div>

        <div v-else class="space-y-3">
            <div 
                v-for="run in recentRuns" 
                :key="run.id"
                @click="selectRun(run)"
                class="bg-white p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 relative overflow-hidden"
                :class="selectedRun?.id === run.id ? 'border-[#4D4DFF] bg-[#4D4DFF]/5 shadow-sm' : 'border-transparent shadow-sm hover:border-gray-200'"
            >
                <div class="w-12 h-12 bg-gray-100 rounded-lg p-1 shrink-0">
                    <img :src="run.museumImage" class="w-full h-full object-contain pixelated" />
                </div>
                
                <div class="flex-1">
                    <h3 class="font-bold text-slate-800 text-sm truncate">{{ run.museumName }}</h3>
                    <p class="text-xs text-gray-500 font-bold mt-1">
                        Palier {{ run.stats.threshold }} • {{ run.timeAgo }}
                    </p>
                </div>

                <div v-if="selectedRun?.id === run.id" class="w-6 h-6 bg-[#4D4DFF] rounded-full flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                </div>
            </div>
        </div>

        <transition name="fade">
            <div v-if="selectedRun" class="mt-8">
                
                <div class="mb-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider">2. Chiffres clés à afficher</h2>
                        <span class="text-xs font-bold" :class="selectedStats.length === 2 ? 'text-green-500' : 'text-orange-400'">
                            {{ selectedStats.length }} / 2
                        </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <button 
                            v-for="stat in availableStats" 
                            :key="stat.key"
                            @click="toggleStat(stat.key)"
                            class="p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden"
                            :class="selectedStats.includes(stat.key) ? 'border-[#4D4DFF] bg-[#4D4DFF]/5' : 'border-gray-100 bg-white hover:border-gray-200'"
                        >
                            <span class="text-xl mb-1 block">{{ stat.icon }}</span>
                            <span class="text-[10px] text-gray-400 font-bold uppercase block">{{ stat.label }}</span>
                            <span class="font-bold text-slate-800 text-sm block truncate">{{ stat.value }}</span>
                            
                            <div v-if="selectedStats.includes(stat.key)" class="absolute top-2 right-2 w-4 h-4 bg-[#4D4DFF] rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" /></svg>
                            </div>
                        </button>
                    </div>
                </div>

                <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">3. Votre ressenti</h2>
                <div class="flex gap-2 flex-wrap">
                    <button 
                        v-for="tag in reactions" 
                        :key="tag.text"
                        @click="selectedReaction = tag"
                        class="px-4 py-2 rounded-full border text-sm font-bold transition-all flex items-center gap-2"
                        :class="selectedReaction.text === tag.text ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'"
                    >
                        <span>{{ tag.icon }}</span>
                        <span>{{ tag.text }}</span>
                    </button>
                </div>

                <div class="mt-10">
                    <button 
                        @click="publishPost"
                        :disabled="isPublishing || selectedStats.length === 0"
                        class="w-full py-4 bg-[#4D4DFF] text-white font-pixel text-xl uppercase rounded-xl shadow-[0_4px_0_#2a2a9e] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-1"
                    >
                        {{ isPublishing ? 'Publication en cours...' : 'Publier' }}
                    </button>
                </div>
            </div>
        </transition>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const config = useRuntimeConfig();
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';

// --- ÉTATS ---
const isLoading = ref(true);
const isPublishing = ref(false);
const recentRuns = ref([]);
const selectedRun = ref(null);
const selectedStats = ref([]); 
const selectedReaction = ref({ icon: '🔥', text: 'Incroyable !' });

const reactions = [
    { icon: '⚡', text: 'Speedrun' },
    { icon: '🔥', text: 'Incroyable !' },
    { icon: '💀', text: 'J\'ai souffert' },
    { icon: '💰', text: 'Rentable' },
    { icon: '💪', text: 'Nouveau record' }
];

// --- HELPERS (Formatage) ---
const formatNumber = (num) => {
    if(!num) return "0";
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

const getDuration = (start, end) => {
    if(!start || !end) return "00:00";
    const diffInSeconds = Math.floor((new Date(end) - new Date(start)) / 1000);
    const m = Math.floor(diffInSeconds / 60).toString().padStart(2, '0');
    const s = (diffInSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const getImageUrl = (imgData) => {
    if (!imgData) return '/assets/musee.png'; 
    const url = imgData.data?.attributes?.url || imgData.attributes?.url || imgData.url;
    if (!url) return '/assets/musee.png';
    return url.startsWith('/') ? `${strapiUrl}${url}` : url;
};

const formatTimeAgo = (dateString) => {
    const diffInMinutes = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    return `Il y a ${Math.floor(diffInHours / 24)} jours`;
};

// --- RÉCUPÉRATION DES DONNÉES DEPUIS STRAPI ---
const fetchRecentRuns = async () => {
    isLoading.value = true;
    const client = useStrapiClient();
    
    try {
        // Remplacer 'runs' par le nom exact de ta collection si différent (ex: 'run-histories')
        const response = await client('/runs?populate=*&sort=createdAt:desc&pagination[limit]=5');
        
        recentRuns.value = response.data.map(run => {
            const attr = run.attributes || run; 
            
            // On map toutes les stats de la BDD
            return {
                id: run.id,
                museumName: attr.museum?.data?.attributes?.name || attr.museum?.name || "Lieu inconnu",
                museumImage: getImageUrl(attr.museum?.data?.attributes?.icon || attr.museum?.icon),
                timeAgo: formatTimeAgo(attr.createdAt),
                stats: {
                    dps: formatNumber(attr.dps),
                    duration: getDuration(attr.date_start, attr.date_end),
                    gold: formatNumber(attr.gold_earned),
                    xp: formatNumber(attr.xp_earned),
                    threshold: attr.threshold_reached || 1,
                    // Gestion d'un objet looté (prend le premier item de la liste s'il y en a)
                    bestLoot: attr.items?.data?.length > 0 ? attr.items.data[0].attributes.name : null
                }
            };
        });
    } catch (error) {
        console.error("Erreur Strapi :", error);
    } finally {
        isLoading.value = false;
    }
};

// --- LOGIQUE DE SÉLECTION ---
const selectRun = (run) => {
    selectedRun.value = run;
    // Par défaut, on présélectionne le temps et le palier
    selectedStats.value = ['duration', 'threshold'];
};

const availableStats = computed(() => {
    if (!selectedRun.value) return [];
    const stats = selectedRun.value.stats;
    const list = [
        { key: 'duration', icon: '⏱️', label: 'Temps passé', value: stats.duration },
        { key: 'threshold', icon: '🏆', label: 'Palier atteint', value: `Palier ${stats.threshold}` },
        { key: 'dps', icon: '⚔️', label: 'Dégâts (DPS)', value: stats.dps },
        { key: 'xp', icon: '✨', label: 'Expérience', value: `${stats.xp} XP` },
        { key: 'gold', icon: '💰', label: 'Or récolté', value: stats.gold },
    ];
    if (stats.bestLoot) {
        list.push({ key: 'bestLoot', icon: '🎁', label: 'Meilleur Objet', value: stats.bestLoot });
    }
    return list;
});

const toggleStat = (statKey) => {
    if (selectedStats.value.includes(statKey)) {
        selectedStats.value = selectedStats.value.filter(k => k !== statKey);
    } else {
        if (selectedStats.value.length < 2) {
            selectedStats.value.push(statKey);
        } else {
            // Remplacer le premier élément (UX fluide pour les choix)
            selectedStats.value.shift();
            selectedStats.value.push(statKey);
        }
    }
};

// --- PUBLICATION API ---
const publishPost = async () => {
    if (!selectedRun.value) return;
    
    isPublishing.value = true;
    const client = useStrapiClient();

    try {
        // Préparation du payload avec les stats choisies par le joueur
        await client('/posts', {
            method: 'POST',
            body: {
                data: {
                    run: selectedRun.value.id,
                    reaction_icon: selectedReaction.value.icon,
                    reaction_text: selectedReaction.value.text,
                    selected_stats: selectedStats.value // Array contenant ex: ['duration', 'dps']
                }
            }
        });

        router.push('/social');
    } catch (error) {
        console.error("Erreur lors de la publication :", error);
    } finally {
        isPublishing.value = false;
    }
};

onMounted(() => {
    fetchRecentRuns();
});
</script>

<style scoped>
.font-power { font-family: 'Montserrat', sans-serif; }
.font-pixel { font-family: 'Jersey 10', sans-serif; }
.pixelated { image-rendering: pixelated; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; transform: translateY(0); }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>