<template>
    <div class="h-screen bg-gradient-to-b from-[#C06C08] via-[#7A3E05] to-black text-white font-sans flex flex-col relative overflow-hidden">

        <section class="relative flex-grow flex flex-col items-center pt-12 w-full max-w-md mx-auto overflow-y-auto scrollbar-hide pb-32">

            <div class="absolute inset-x-4 top-4 bottom-0 border-x-2 border-t-2 border-white/20 rounded-t-[50vw] pointer-events-none z-0"></div>

            <div class="pt-4 pb-6 text-center px-6 z-10">
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
            <h3 class="font-power text-lg font-bold mb-4">Équipements obtenu</h3>
            
            <div class="grid grid-cols-4 gap-2">
                <Items
                    v-for="(item, index) in lootItems"
                    :key="index"
                    v-bind="item"
                    class="w-full aspect-square loot-item opacity-0"
                />
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
import { nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import anime from 'animejs';
import { useCharacterStore } from '~/stores/character';
import Items from '~/components/items.vue';
import PixelButton from '~/components/form/PixelButton.vue'; 

// 1. Cacher le layout footer global
definePageMeta({
  layout: 'blank'
});

const router = useRouter();
const route = useRoute();
const characterStore = useCharacterStore();
const config = useRuntimeConfig();
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';

const tier = ref(Number(route.query.tier) || 1);
const totalDamage = ref(Number(route.query.damage) || 0);

const museumName = "Musée d'art et d'histoire de Saint-Lô";
const museumImage = "/assets/musee.png";

const goldEarned = computed(() => Math.floor(tier.value * 250 + (totalDamage.value / 100)));
const xpEarned = computed(() => Math.floor(tier.value * 180 + (totalDamage.value / 150)));

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

const characters = computed(() => {
    return characterStore.characters.map(c => {
        const char = c.attributes || c;
        return { id: c.id, avatar: getImageUrl(char.icon) };
    });
});

const lootItems = ref([]);

const generateLoot = () => {
    const count = Math.min(4 + Math.floor(tier.value / 2), 24); 
    const items = [];
    const types = ['weapon', 'helmet', 'charm']; // Tes types d'assets
    const rarities = ['common', 'common', 'rare', 'rare', 'epic', 'legendary'];
    
    for(let i=0; i<count; i++) {
        const rarityIndex = Math.min(Math.floor(Math.random() * (2 + tier.value/5)), rarities.length - 1);
        
        items.push({
            id: i,
            // Ta logique d'image spécifique
            image: `/assets/${types[Math.floor(Math.random() * types.length)]}2.png`, 
            rarity: rarities[rarityIndex] || 'common',
            level: Math.floor(Math.random() * tier.value * 2) + 1,
            index_damage: Math.floor(Math.random() * 20) + 10, 
            types: Math.random() > 0.7 ? ['nature'] : [] 
        });
    }
    lootItems.value = items;
};

const animateLootItems = () => {
    anime({
        targets: '.loot-item',
        opacity: [0, 1],
        easing: 'easeInOutSine',
        duration: 400,
        delay: anime.stagger(80)
    });
};

onMounted(async () => {
    if (!characterStore.hasCharacters) {
        await characterStore.fetchCharacters();
    }
    generateLoot();
    await nextTick();
    animateLootItems();
});
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>