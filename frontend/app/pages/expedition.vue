<template>
    <div class="h-screen bg-gradient-to-b from-[#040050] to-black text-white font-sans flex flex-col relative overflow-hidden">

        <section class="relative flex-grow flex flex-col items-center justify-evenly pt-12 w-full max-w-md mx-auto">

            <div
                class="absolute inset-x-4 top-4 bottom-0 border-x-2 border-t-2 border-white/90 rounded-t-[50vw] pointer-events-none mask-fade"/>

            <div class="text-center shrink-0 z-10">
                <h1 class="font-pixel text-6xl sm:text-7xl mb-1">{{ formattedTime }}</h1>
                
                <p class="font-pixel text-3xl sm:text-4xl text-white tracking-widest">
                    Palier {{ infiniteTierInfo.tier }}
                </p>
            </div>

            <div class="relative w-48 h-40 sm:w-64 sm:h-56 shrink-0 flex items-center justify-center z-10">
                <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-white/5 rounded-full blur-xl"/>
                <img 
                    :src="museumImage" alt="Musée"
                    class="w-full h-full object-contain pixelated relative z-10 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
            </div>

            <div class="text-center shrink-0 max-w-[80%] z-10">
                <p class="font-power text-gray-400 text-sm font-semibold mb-1">Actuellement :</p>
                <h2 class="font-power text-2xl sm:text-3xl leading-tight">
                    {{ currentExpedition.name }}
                </h2>
                <div v-if="globalMultiplier > 1" class="mt-2 inline-block bg-green-900/30 border border-green-500/30 px-2 py-0.5 rounded text-[10px] text-green-400 font-bold uppercase tracking-wider">
                    Bonus Synergie x{{ globalMultiplier }}
                </div>
            </div>

            <div class="flex items-end justify-center gap-3 sm:gap-4 h-20 sm:h-24 shrink-0 w-full z-10">
                <div v-for="perso in formattedCharacters" :key="perso.id" class="relative flex justify-center w-12 sm:w-16">
                    <div class="absolute bottom-0 w-8 sm:w-12 h-3 sm:h-4 bg-white/20 rounded-[50%] blur-[2px]"></div>
                    <img :src="perso.avatar" :alt="perso.name" class="anim-target w-12 h-12 sm:w-16 sm:h-16 object-contain pixelated relative z-10" />
                </div>
                
                <div v-if="formattedCharacters.length === 0 && !characterStore.loading" class="text-gray-500 text-xs font-pixel">
                    Aucun héros...
                </div>
            </div>

        </section>

        <section class="shrink-0 w-full max-w-md mx-auto px-4 pb-8 pt-2 flex flex-col items-center z-20">
            <p class="font-onest text-center text-gray-300 text-xs sm:text-sm max-w-xs leading-relaxed mb-4">
                Allez explorer pendant que<br>
                vos personnages se battent pour le royaume
            </p>

            <div class="w-[90%]">
                <FormPixelButton color="red" class="w-full" @click="stopExpedition">
                    Arrêter l'expédition
                </FormPixelButton>
            </div>
        </section>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import anime from 'animejs';
import { useRouter } from 'vue-router';
import { useCharacterStore } from '~/stores/character';
import FormPixelButton from '~/components/form/PixelButton.vue';
import { useDamageCalculator } from '~/composables/useDamageCalculator';

definePageMeta({ layout: 'footerless' });

// --- CONFIGURATION ---
const characterStore = useCharacterStore();
const config = useRuntimeConfig();
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';
const { calculateItemPower } = useDamageCalculator();
const router = useRouter();

// --- CONSTANTES DE JEU ---
const BASE_DIFFICULTY = 500; 
const SCALING_FACTOR = 1.5; 

// Extension jusqu'à 24 objets (4 équipes complètes)
const SYNERGY_BONUS = [
    // 0 à 6 (Ta base actuelle)
    1.0, 1.1, 1.2, 1.3, 1.5, 1.75, 2.0, 
    
    // 7 à 12 (Progression vers x4)
    2.25, 2.5, 2.75, 3.0, 3.5, 4.0, 
    
    // 13 à 18 (Progression vers x8)
    4.5, 5.0, 5.5, 6.0, 7.0, 8.0, 
    
    // 19 à 24 (Mode "Dieu" -> x15)
    9.0, 10.0, 11.0, 12.0, 13.5, 15.0 
];

// --- ETAT ---
const currentExpedition = ref({
    name: "Musée d'art et d'histoire de Saint-Lô",
    type: "history",
});
const museumImage = "/assets/musee.png";

const secondsElapsed = ref(0);
const totalDamageDealt = ref(0);
let timerInterval = null;

const formattedTime = computed(() => {
    const m = Math.floor(secondsElapsed.value / 60).toString().padStart(2, '0');
    const s = (secondsElapsed.value % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
});

// --- 1. PRÉPARATION DES DONNÉES ---
const formattedCharacters = computed(() => {
    // Sécurité : si le store est vide, on renvoie tableau vide
    if (!characterStore.characters) return [];

    return characterStore.characters.map(char => {
        const c = char.attributes || char;
        
        // Récupération des items
        const rawItems = c.items?.data || c.items || [];
        
        // FILTRAGE : On retire les items recyclés (isScrapped: true)
        const validItems = rawItems.filter(i => {
            const attrs = i.attributes || i;
            return attrs.isScrapped !== true;
        });
        
        const equippedItems = validItems.map(i => {
            const itemAttr = i.attributes || i;
            
            // Gestion Rareté (String ou Objet)
            let rarityStr = 'common';
            if (typeof itemAttr.rarity === 'string') {
                rarityStr = itemAttr.rarity;
            } else if (itemAttr.rarity?.data?.attributes?.name) {
                rarityStr = itemAttr.rarity.data.attributes.name;
            } else if (itemAttr.rarity?.name) { // Strapi v5 flat
                rarityStr = itemAttr.rarity.name;
            }

            // Gestion Tags
            const tags = (itemAttr.tags?.data || itemAttr.tags || []).map(t => 
                (t.attributes?.name || t.name || '').toLowerCase()
            );

            return {
                id: i.id,
                level: Number(itemAttr.level) || 1,
                index_damage: Number(itemAttr.index_damage) || 0, 
                rarity: rarityStr,
                types: tags
            };
        });

        return {
            id: char.id,
            name: c.firstname,
            avatar: getImageUrl(c.icon),
            equippedItems
        };
    });
});

// --- 2. CALCUL DU DPS ---
const rawTotalDamage = computed(() => {
    let total = 0;
    formattedCharacters.value.forEach(char => {
        char.equippedItems.forEach(item => {
            total += calculateItemPower(item);
        });
    });
    return total;
});

const globalMultiplier = computed(() => {
    let count = 0;
    const typeExp = currentExpedition.value.type.toLowerCase();
    
    formattedCharacters.value.forEach(char => {
        char.equippedItems.forEach(item => {
            if (item.types && item.types.includes(typeExp)) count++;
        });
    });
    
    const index = Math.min(count, SYNERGY_BONUS.length - 1);
    return SYNERGY_BONUS[index];
});

const finalDPS = computed(() => {
    return Math.floor(rawTotalDamage.value * globalMultiplier.value);
});

// --- 3. PROGRESSION PALIERS ---
const infiniteTierInfo = computed(() => {
    const score = totalDamageDealt.value;

    if (score < BASE_DIFFICULTY) return { tier: 1 };

    const tierIndex = Math.floor(Math.log(score / BASE_DIFFICULTY) / Math.log(SCALING_FACTOR));
    return { tier: tierIndex + 2 };
});

// --- HELPERS ---
const formatNumber = (num) => {
    if(!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num).toString();
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
const startAnimation = () => {
    anime.remove('.anim-target');
    anime({
        targets: '.anim-target',
        translateY: [ { value: -8, duration: 500, easing: 'easeInOutSine' }, { value: 0, duration: 500, easing: 'easeInOutSine' } ],
        loop: true,
        delay: anime.stagger(200)
    });
};

const stopExpedition = () => {
    router.push({
        path: '/expedition-summary',
        query: {
            tier: infiniteTierInfo.value.tier,
            damage: totalDamageDealt.value
        }
    });
};

// --- LIFECYCLE ---
onMounted(async () => {
    // Boucle de jeu (1 seconde)
    timerInterval = setInterval(() => {
        secondsElapsed.value++;
        
        if (finalDPS.value > 0) {
            totalDamageDealt.value += finalDPS.value;
        }
    }, 1000);

    // FIX MAJEUR : On force le chargement avec TRUE pour récupérer les items et leurs stats
    // Même si les persos sont déjà là, on veut être sûr d'avoir les items à jour.
    await characterStore.fetchCharacters(true);

    // Lancement animations après chargement des données
    await nextTick();
    if (formattedCharacters.value.length > 0) {
        startAnimation();
    }
});

watch(formattedCharacters, async (newVal) => {
    if (newVal.length > 0) {
        await nextTick();
        startAnimation();
    }
});

onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
    anime.remove('.anim-target');
});
</script>

<style scoped>
.mask-fade {
    -webkit-mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
    mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
}
.pixelated {
    image-rendering: pixelated;
}
</style>