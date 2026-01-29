<template>
    <div class="h-screen bg-gradient-to-b from-[#040050] to-black text-white font-sans flex flex-col relative overflow-hidden">

        <section class="relative flex-grow flex flex-col items-center justify-evenly pt-12 w-full max-w-md mx-auto">

            <div
                class="absolute inset-x-4 top-4 bottom-0 border-x-2 border-t-2 border-white/90 rounded-t-[50vw] pointer-events-none mask-fade"/>

            <div class="text-center shrink-0 z-10">
                <h1 class="font-pixel text-6xl sm:text-7xl mb-1">{{ formattedTime }}</h1>
                
                <p class="font-pixel text-3xl sm:text-4xl text-white tracking-widest">
                    Palier {{ currentTier }}
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
                    {{ museumName }}
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
                <FormPixelButton color="red" class="w-full" @click="stopExpedition" :disabled="stopping">
                    {{ stopping ? 'Arrêt en cours...' : "Arrêter l'expédition" }}
                </FormPixelButton>
                <p v-if="error" class="text-red-500 text-center mt-2">{{ error }}</p>
            </div>
        </section>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import anime from 'animejs';
import { useRouter } from 'vue-router';
import { useCharacterStore } from '~/stores/character';
import { useRunStore } from '~/stores/run';
import FormPixelButton from '~/components/form/PixelButton.vue';

definePageMeta({ layout: 'blank' });

// --- CONFIGURATION ---
const characterStore = useCharacterStore();
const runStore = useRunStore();
const config = useRuntimeConfig();
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';
const router = useRouter();

// --- STATE ---
const secondsElapsed = ref(0);
const stopping = ref(false);
const error = ref(null);
let timerInterval = null;

// --- COMPUTED ---
const activeRun = computed(() => runStore.activeRun);

const museumName = computed(() => {
    const museum = activeRun.value?.museum?.data?.attributes || activeRun.value?.museum;
    return museum?.name || "Lieu inconnu";
});

const museumImage = "/assets/musee.png"; // Placeholder or fetch from museum?

const currentTier = computed(() => {
    // Formula: floor(log(totalDamage/100) / log(1.5)) + 2
    // totalDamage = dps * seconds
    const dps = activeRun.value?.dps || 0;
    const totalDamage = dps * secondsElapsed.value;
    
    if (totalDamage < 100) return 1;
    
    const tier = Math.floor(Math.log(totalDamage / 100) / Math.log(1.5)) + 2;
    return Math.max(1, tier);
});

const formattedTime = computed(() => {
    const m = Math.floor(secondsElapsed.value / 60).toString().padStart(2, '0');
    const s = (secondsElapsed.value % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
});

// Used for display only (synergy bonus logic moved to backend dps calculation, 
// but we keep display of characters)
const formattedCharacters = computed(() => {
    if (!characterStore.characters) return [];
    return characterStore.characters.map(char => {
        const c = char.attributes || char;
        return {
            id: char.id,
            name: c.firstname,
            avatar: getImageUrl(c.icon)
        };
    });
});

// We assume Synergy is already factored into `run.dps`. 
// If we want to display it, we'd need to re-calculate it or fetch it.
// For now, setting to 1 or removing the badge logic if we don't know it.
// But the user likes seeing "Bonus Synergie".
// Ideally `run` should have `synergy_bonus` field?
// Or we re-calculate it just for display.
const globalMultiplier = ref(1); // Placeholder

// --- HELPERS ---
const getImageUrl = (imgData) => {
    if (!imgData) return '/assets/default-avatar.png';
    const data = imgData.data?.attributes || imgData.attributes || imgData;
    const url = data?.url;
    if (!url) return '/assets/default-avatar.png';
    if (url.startsWith('/')) return `${strapiUrl}${url}`;
    return url;
};

// --- ACTIONS ---
const startAnimation = () => {
    anime.remove('.anim-target');
    anime({
        targets: '.anim-target',
        translateY: [ { value: -8, duration: 500, easing: 'easeInOutSine' }, { value: 0, duration: 500, easing: 'easeInOutSine' } ],
        loop: true,
        delay: anime.stagger(200)
    });
};

const stopExpedition = async () => {
    const run = activeRun.value;
    if (!run) return;
    
    const runId = run.documentId;
    stopping.value = true;
    error.value = null;
    
    try {
        await runStore.endExpedition(runId);
        
        router.push({
            path: '/expedition-summary',
            query: {
                runId: runId
            }
        });
    } catch (e) {
        error.value = e.message || "Erreur à l'arrêt";
    } finally {
        stopping.value = false;
    }
};

// --- LIFECYCLE ---
onMounted(async () => {
    await characterStore.fetchCharacters();
    
    // Fetch active run
    const run = await runStore.fetchActiveRun();
    
    if (!run) {
        // No active run, redirect
        router.push('/map');
        return;
    }
    
    // Init timer
    const start = new Date(run.date_start).getTime();
    
    const updateTimer = () => {
        const now = Date.now();
        secondsElapsed.value = Math.floor((now - start) / 1000);
    };
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);

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
