<template>
  <div class="min-h-screen bg-[#F8F9FF] font-sans pb-40">
    
    <!-- Top Bar -->
    <div class="bg-white pt-[env(safe-area-inset-top)] p-4 sticky top-0 z-30 shadow-sm flex items-center justify-between border-b border-gray-100">
        <div class="flex items-center gap-4">
            <button @click="router.back()" class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-all active:scale-90 border border-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 class="text-lg font-power text-slate-800">Partager une aventure</h1>
        </div>
        <div v-if="selectedRun" class="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
            Aperçu en direct
        </div>
    </div>

    <div class="p-5 max-w-2xl mx-auto space-y-8">
        
        <!-- 1. Sélection de la Run -->
        <section>
            <h2 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-[#4D4DFF] rounded-full"></span>
                1. Choisir une expédition
            </h2>

            <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div class="w-10 h-10 border-4 border-[#4D4DFF] border-t-transparent rounded-full animate-spin"></div>
                <p class="mt-4 text-sm font-bold text-slate-400 animate-pulse uppercase tracking-wider">Chargement des runs...</p>
            </div>

            <div v-else-if="recentRuns.length === 0" class="text-center py-12 px-6 text-gray-400 font-bold text-sm bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <div class="mb-3 text-3xl opacity-50 text-slate-300">⚔️</div>
                Aucune expédition récente trouvée.<br>Partez à l'aventure d'abord !
            </div>

            <div v-else class="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-5 px-5">
                <div 
                    v-for="run in recentRuns" 
                    :key="run.id"
                    @click="selectRun(run)"
                    class="shrink-0 w-64 bg-white p-4 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden group shadow-sm"
                    :class="selectedRun?.id === run.id ? 'border-[#4D4DFF] bg-[#4D4DFF]/5 shadow-indigo-100' : 'border-white hover:border-gray-200'"
                >
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-gray-50 rounded-2xl p-1.5 shrink-0 border border-gray-100 group-hover:scale-105 transition-transform">
                            <img :src="run.museumImage" class="w-full h-full object-contain pixelated" />
                        </div>
                        <div class="min-w-0">
                            <h3 class="font-bold text-slate-800 text-sm truncate leading-tight">{{ run.museumName }}</h3>
                            <p class="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wide">
                                {{ run.timeAgo }}
                            </p>
                        </div>
                    </div>
                    
                    <div class="mt-3 flex flex-wrap gap-1">
                        <span class="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100/50">{{ run.stats.threshold }}</span>
                        <span class="text-[8px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100/50">{{ run.stats.totalDamage }} Dégâts</span>
                        <span class="text-[8px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100/50">{{ run.stats.duration }}</span>
                    </div>

                    <div v-if="selectedRun?.id === run.id" class="absolute top-2 right-2 w-5 h-5 bg-[#4D4DFF] rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                    </div>
                </div>
            </div>
        </section>

        <transition name="slide-fade">
            <div v-if="selectedRun" class="space-y-8">
                
                <!-- 2. Grosses Pastilles (Bento Grid) -->
                <section>
                    <h2 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span class="w-1.5 h-1.5 bg-[#4D4DFF] rounded-full"></span>
                        2. Affichage principal
                    </h2>

                    <div class="grid grid-cols-2 gap-3">
                        <!-- Obligatoires -->
                        <div class="bg-white border-2 border-gray-100 rounded-3xl p-4 shadow-sm opacity-50 cursor-not-allowed">
                            <span class="text-[9px] text-gray-400 font-bold uppercase block tracking-wider mb-1">Temps passé</span>
                            <span class="font-pixel text-slate-800 text-2xl block leading-none">{{ selectedRun.stats.duration }}</span>
                        </div>
                        <div class="bg-white border-2 border-gray-100 rounded-3xl p-4 shadow-sm opacity-50 cursor-not-allowed">
                            <span class="text-[9px] text-gray-400 font-bold uppercase block tracking-wider mb-1">Palier atteint</span>
                            <span class="font-pixel text-slate-800 text-2xl block leading-none">{{ selectedRun.stats.threshold }}</span>
                        </div>

                        <!-- Optionnel (Meilleur Loot) -->
                        <div v-if="selectedRun.stats.bestLootId" 
                             @click="showLoot = !showLoot"
                             class="col-span-2 p-4 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden shadow-sm flex items-center justify-between"
                             :class="showLoot ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100 bg-white grayscale'"
                        >
                            <div class="flex items-center gap-4">
                                <div>
                                    <span class="text-[9px] text-orange-400 font-bold uppercase block tracking-wider mb-0.5">Meilleur Loot</span>
                                    <span class="font-bold text-slate-800 text-sm block leading-tight">{{ selectedRun.stats.bestLoot }}</span>
                                </div>
                            </div>
                            <div class="w-12 h-6 rounded-full transition-colors relative" :class="showLoot ? 'bg-orange-400' : 'bg-gray-200'">
                                <div class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all" :class="showLoot ? 'left-7' : 'left-1'"></div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 3. Petites Pastilles (Tags) -->
                <section>
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span class="w-1.5 h-1.5 bg-[#4D4DFF] rounded-full"></span>
                            3. Personnaliser (Tags)
                        </h2>
                        <span class="text-[10px] font-bold px-2 py-1 rounded-lg" :class="selectedTags.length === 5 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'">
                            {{ selectedTags.length }} / 5
                        </span>
                    </div>

                    <div class="flex gap-2 flex-wrap">
                        <button 
                            v-for="tag in availableTags" 
                            :key="tag"
                            @click="toggleTag(tag)"
                            class="px-4 py-2 rounded-full border-2 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
                            :class="selectedTags.includes(tag) 
                                ? 'bg-black text-white border-black ring-4 ring-black/5' 
                                : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'"
                        >
                            {{ tag }}
                        </button>
                    </div>
                </section>
            </div>
        </transition>

        <!-- Bouton Publier -->
        <div v-if="selectedRun" class="fixed bottom-24 left-0 right-0 p-5 bg-gradient-to-t from-[#F8F9FF] via-[#F8F9FF]/80 to-transparent z-[100]">
            <button 
                @click="publishPost"
                :disabled="isPublishing"
                class="w-full py-4 bg-[#4D4DFF] text-white font-pixel text-xl uppercase rounded-3xl shadow-[0_6px_0_#2a2a9e] active:shadow-none active:translate-y-1 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-1 max-w-2xl mx-auto block group"
            >
                <div class="flex items-center justify-center gap-3">
                    <span v-if="isPublishing" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>{{ isPublishing ? 'Envoi...' : 'Partager l\'aventure' }}</span>
                    <span v-if="!isPublishing" class="group-hover:translate-x-1 transition-transform">🚀</span>
                </div>
            </button>
        </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDamageCalculator } from '~/composables/useDamageCalculator';
import { formatCompactNumber } from '~/utils/format';

const router = useRouter();
const config = useRuntimeConfig();
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';
const { calculateItemPower } = useDamageCalculator();
const { find } = useStrapi();

// --- ÉTATS ---
const isLoading = ref(true);
const isPublishing = ref(false);
const recentRuns = ref([]);
const selectedRun = ref(null);
const showLoot = ref(true);
const selectedTags = ref([]);

// Liste des ressentis statiques
const staticFeelings = [
    "❤️ Coup de cœur", 
    "🏆 Nouveau record", 
    "🏛️ Lieu magnifique", 
    "🧠 Très enrichissant", 
    "🍀 Bonne fortune"
];

// --- HELPERS ---
const formatValue = (num) => formatCompactNumber(num);

const getDurationSeconds = (start, end) => {
    if(!start || !end) return 0;
    return Math.floor((new Date(end) - new Date(start)) / 1000);
};

const formatDurationHMS = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const getImageUrl = (imgData) => {
    if (!imgData) return null; 
    const url = imgData.url || imgData.attributes?.url || imgData.data?.attributes?.url;
    if (!url) return null;
    return url.startsWith('/') ? `${strapiUrl}${url}` : url;
};

const getMuseumImageByTag = (museum) => {
    const firstTag = museum.tags?.[0]?.name?.toLowerCase();
    const availableTags = ['art', 'history', 'make', 'nature', 'science', 'society'];
    if (firstTag && availableTags.includes(firstTag)) {
        const capitalizedTag = firstTag.charAt(0).toUpperCase() + firstTag.slice(1);
        return `/assets/map/museum/${capitalizedTag}.png`;
    }
    return '/assets/musee.png';
};

const formatTimeAgo = (dateString) => {
    const diffInMinutes = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    return `Il y a ${Math.floor(diffInHours / 24)}j`;
};

// --- RÉCUPÉRATION DES DONNÉES ---
const fetchRecentRuns = async () => {
    isLoading.value = true;
    try {
        const response = await find('runs', {
            populate: ['museum', 'museum.tags', 'items', 'items.rarity', 'items.icon'],
            sort: 'createdAt:desc',
            pagination: { limit: 5 },
            filters: { date_end: { $null: false } }
        });
        
        recentRuns.value = (response.data || []).map(run => {
            let bestItem = null;
            let maxPower = -1;
            if (run.items && run.items.length > 0) {
                run.items.forEach(item => {
                    const power = calculateItemPower(item);
                    if (power > maxPower) { maxPower = power; bestItem = item; }
                });
            }
            const durationSeconds = getDurationSeconds(run.date_start, run.date_end);
            const totalDamage = (run.dps || 0) * durationSeconds;
            return {
                id: run.documentId || run.id,
                museumName: run.museum?.name || "Lieu inconnu",
                museumImage: getMuseumImageByTag(run.museum || {}),
                timeAgo: formatTimeAgo(run.createdAt),
                stats: {
                    totalDamage: formatValue(totalDamage),
                    rawTotalDamage: totalDamage,
                    duration: formatDurationHMS(durationSeconds),
                    rawDuration: durationSeconds,
                    gold: formatValue(run.gold_earned),
                    xp: formatValue(run.xp_earned),
                    threshold: run.threshold_reached || 1,
                    bestLoot: bestItem ? bestItem.name : null,
                    bestLootId: bestItem ? (bestItem.documentId || bestItem.id) : null
                }
            };
        });
    } catch (error) {
        console.error("Erreur lors du chargement des expéditions", error);
    } finally {
        isLoading.value = false;
    }
};

// --- LOGIQUE DE SÉLECTION ---
const selectRun = (run) => {
    selectedRun.value = run;
    selectedTags.value = []; 
    showLoot.value = !!run.stats.bestLootId;
};

const availableTags = computed(() => {
    if (!selectedRun.value) return [];
    const stats = selectedRun.value.stats;
    const dynamicTags = [
        `⚔️ ${stats.totalDamage} Dégâts`,
        `💰 ${stats.gold} Or`,
        `✨ ${stats.xp} XP`
    ];
    return [...dynamicTags, ...staticFeelings];
});

const toggleTag = (tag) => {
    if (selectedTags.value.includes(tag)) {
        selectedTags.value = selectedTags.value.filter(t => t !== tag);
    } else {
        if (selectedTags.value.length < 5) selectedTags.value.push(tag);
        else { selectedTags.value.shift(); selectedTags.value.push(tag); }
    }
};

// --- PUBLICATION ---
const publishPost = async () => {
    if (!selectedRun.value || isPublishing.value) return;
    
    isPublishing.value = true;
    const client = useStrapiClient();

    try {
        const payload = {
            data: {
                run_history: selectedRun.value.id,
                show_loot: showLoot.value,
                tags: JSON.parse(JSON.stringify(selectedTags.value)),
                best_loot: selectedRun.value.stats.bestLootId || null
            }
        };

        const response = await client('/posts', {
            method: 'POST',
            body: payload
        });
        
        if (response) {
            router.push('/social');
        }
    } catch (error) {
        let debugMsg = "Erreur de publication :\n";
        if (error.response) {
            debugMsg += `Status: ${error.response.status}\nData: ${JSON.stringify(error.response._data || error.response.data)}\n`;
        } else {
            debugMsg += `Message: ${error.message}\n`;
        }
        alert(debugMsg);
        isPublishing.value = false; 
    }
};

onMounted(() => { fetchRecentRuns(); });
</script>

<style scoped>
.font-power { font-family: 'Montserrat', sans-serif; }
.font-pixel { font-family: 'Jersey 10', sans-serif; }
.pixelated { image-rendering: pixelated; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

.slide-fade-enter-active { transition: all 0.4s ease-out; }
.slide-fade-leave-active { transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(20px); opacity: 0; }
</style>