<template>
    <div class="h-screen bg-gradient-to-b from-[#C06C08] via-[#7A3E05] to-black text-white font-sans flex flex-col relative overflow-hidden">

        <section class="relative flex-grow flex flex-col items-center pt-12 w-full max-w-md mx-auto overflow-y-auto scrollbar-hide pb-32">

            <div class="absolute inset-x-4 top-4 bottom-0 border-x-2 border-t-2 border-white/20 rounded-t-[50vw] pointer-events-none z-0"></div>

            <div v-if="loading" class="pt-32 text-center z-10">
                <p class="font-pixel text-2xl animate-pulse">Chargement...</p>
            </div>

            <div v-else class="pt-4 pb-6 text-center px-6 z-10 w-full">
          <h1 class="font-pixel text-4xl my-8">Expédition terminée</h1>

          <div class="flex items-center justify-center gap-4 mb-8">
            <img :src="museumImage" class="w-40 h-full object-contain" />
            <div class="text-left">
                <h2 class="font-power text-xl font-bold leading-tight max-w-[150px]">{{ museumName }}</h2>
            </div>
          </div>

          <div class="flex justify-center gap-3 mb-8">
             <div v-for="char in characters" :key="char.id" class="relative">
                <div class="absolute bottom-0 inset-x-1 h-2 bg-black/40 rounded-full blur-sm"></div>
                <img :src="char.avatar" class="w-16 h-16 object-contain pixelated relative z-10" />
             </div>
          </div>

          <div class="mb-8">
            <p class="font-power text-sm text-orange-200 mb-1">Palier atteint</p>
            <p class="font-pixel text-6xl text-white drop-shadow-lg">{{ tier }}</p>
            <p v-if="entryUnlocked" class="text-green-400 font-bold font-pixel text-xl mt-2 animate-bounce">
                QUÊTE RÉUSSIE !
            </p>
          </div>

          <div class="flex justify-center gap-4 mb-10">
            <div class="flex items-center gap-3 bg-[#965A0C] border border-[#F4B942] px-4 py-2 rounded-full shadow-lg">
                <img src="/assets/coin.png" alt="Or" class="w-6 h-6 object-contain pixelated">
                <span class="font-bold font-power text-sm">+ {{ formatNumber(goldEarned) }}</span>
            </div>
            <div class="flex items-center gap-3 bg-[#5A3805] border border-[#4DA6FF] px-4 py-2 rounded-full shadow-lg">
                <img src="/assets/level.png" alt="Niveau" class="w-5 h-5 object-contain pixelated">
                <span class="font-bold font-power text-sm">+{{ formatNumber(xpEarned) }} Xp</span>
            </div>
          </div>

          <div class="w-full">
            <h3 class="font-power text-lg font-bold mb-4">Équipements obtenus ({{ lootItems.length }})</h3>
            
            <div v-if="lootItems.length > 0" class="grid grid-cols-4 gap-2">
                <Items
                    v-for="(item, index) in lootItems"
                    :key="index"
                    v-bind="item"
                    class="w-full aspect-square loot-item opacity-0"
                />
            </div>
            <div v-else class="text-gray-400 text-sm font-pixel">
                Aucun équipement trouvé...
            </div>
          </div>

            </div>
        </section>

        <div class="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20 flex justify-center">
            <PixelButton @click="router.push('/map')" color="indigo" class="w-full max-w-md">
                Revenir au menu principal
            </PixelButton>
        </div>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import anime from 'animejs';
import { useCharacterStore } from '~/stores/character';
import { useGuildStore } from '~/stores/guild';
import Items from '~/components/items.vue';
import PixelButton from '~/components/form/PixelButton.vue'; 

definePageMeta({
  layout: 'blank'
});

const router = useRouter();
const route = useRoute();
const characterStore = useCharacterStore();
const guildStore = useGuildStore();
const client = useStrapiClient();
const config = useRuntimeConfig();
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';

const runId = route.query.runId;
const loading = ref(true);
const run = ref(null);
const lootItems = ref([]);

// --- COMPUTED ---
const tier = computed(() => run.value?.threshold_reached || 0);
const goldEarned = computed(() => run.value?.gold_earned || 0);
const xpEarned = computed(() => run.value?.xp_earned || 0);
const entryUnlocked = computed(() => run.value?.entry_unlocked || false);

const museumName = computed(() => run.value?.museum?.name || run.value?.museum?.data?.attributes?.name || "Lieu inconnu");
const museumImage = "/assets/musee.png"; // Placeholder

const characters = computed(() => {
    return characterStore.characters.map(c => {
        const char = c.attributes || c;
        return { id: c.id, avatar: getImageUrl(char.icon) };
    });
});

// --- HELPERS ---
const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const getImageUrl = (imgData) => {
    if (!imgData) return '/assets/default-avatar.png';
    const data = imgData.data?.attributes || imgData.attributes || imgData;
    const url = data?.url;
    if (!url) return '/assets/default-avatar.png';
    if (url.startsWith('/')) return `${strapiUrl}${url}`;
    return url;
};

// --- ANIMATION ---
const animateLootItems = () => {
    anime({
        targets: '.loot-item',
        opacity: [0, 1],
        easing: 'easeInOutSine',
        duration: 400,
        delay: anime.stagger(80)
    });
};

// --- LIFECYCLE ---
onMounted(async () => {
    if (!runId) {
        router.push('/map');
        return;
    }

    // Load characters if needed for avatar display
    if (!characterStore.hasCharacters) {
        await characterStore.fetchCharacters();
    }

    try {
        // Fetch Run Data
        const response = await client(`/runs/${runId}`, {
             method: 'GET',
             params: {
                 populate: {
                     museum: true,
                     items: {
                         populate: ['icon', 'rarity', 'tags']
                     }
                 }
             }
        });
        
        run.value = response.data || response;
        
        // Process Loot
        const rawItems = run.value.items || [];
        const itemsList = Array.isArray(rawItems) ? rawItems : (rawItems.data || []);
        
        lootItems.value = itemsList.map(item => {
             const i = item.attributes || item;
             const rarity = i.rarity?.name || i.rarity?.data?.attributes?.name || 'common';
             const tags = (i.tags?.data || i.tags || []).map(t => (t.name || t.attributes?.name || '').toLowerCase());
             
             return {
                 id: item.id,
                 image: getImageUrl(i.icon),
                 rarity: rarity,
                 level: i.level,
                 index_damage: i.index_damage,
                 types: tags,
                 category: i.slot
             };
        });
        
        // Refresh Guild Stats (Gold/XP)
        await guildStore.refetchStats();
        
        loading.value = false; // Set loading to false FIRST
        await nextTick();
        animateLootItems();

    } catch (e) {
        console.error("Error loading run summary:", e);
        loading.value = false;
    }
});
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.font-pixel { font-family: 'Jersey 10', sans-serif; }
.pixelated { image-rendering: pixelated; }
</style>
