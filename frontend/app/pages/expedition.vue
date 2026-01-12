<template>
    <div
        class="h-screen bg-gradient-to-b from-[#040050] to-black text-white font-sans flex flex-col relative overflow-hidden">

        <section class="relative flex-grow flex flex-col items-center justify-evenly pt-12 w-full max-w-md mx-auto">

            <div
                class="absolute inset-x-4 top-4 bottom-0 border-x-2 border-t-2 border-white/90 rounded-t-[50vw] pointer-events-none mask-fade"/>

            <div class="text-center shrink-0 z-10">
                <h1 class="font-pixel text-6xl sm:text-7xl mb-1">{{ formattedTime }}</h1>
                <p class="font-pixel text-3xl sm:text-4xl text-white tracking-widest">Palier {{ floor }}</p>
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
            </div>

            <div class="flex items-end justify-center gap-3 sm:gap-4 h-20 sm:h-24 shrink-0 w-full z-10">
                <div v-for="perso in characters" :key="perso.id" class="relative flex justify-center w-12 sm:w-16">

                    <div class="absolute bottom-0 w-8 sm:w-12 h-3 sm:h-4 bg-white/20 rounded-[50%] blur-[2px]"/>

                    <img 
                        :src="perso.avatar" :alt="perso.name"
                        class="anim-target w-12 h-12 sm:w-16 sm:h-16 object-contain pixelated relative z-10" />
                </div>
                
                <div v-if="characters.length === 0 && !characterStore.loading" class="text-gray-500 text-xs font-pixel">
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
import { useCharacterStore } from '~/stores/character'; // Import du store

definePageMeta({
    layout: 'footerless'
});

// --- STORES & CONFIG ---
const characterStore = useCharacterStore();
const config = useRuntimeConfig();
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';

// --- DONNÉES STATIQUES (RUN) ---
// À terme, tu devras probablement récupérer ces infos depuis un "RunStore"
const floor = ref(18);
const museumName = "Musée d'art et d'histoire de Saint-Lô";
const museumImage = "/assets/musee.png";

// --- TIMER ---
const secondsElapsed = ref(13 * 60 + 12);
let timerInterval = null;

const formattedTime = computed(() => {
    const m = Math.floor(secondsElapsed.value / 60).toString().padStart(2, '0');
    const s = (secondsElapsed.value % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
});

// --- RÉCUPÉRATION DES PERSONNAGES ---
const characters = computed(() => {
    return characterStore.characters.map(char => {
        const c = char.attributes || char;
        return {
            id: char.id,
            name: c.firstname,
            avatar: getImageUrl(c.icon)
        };
    });
});

// Helper pour l'image URL
const getImageUrl = (imgData) => {
    if (!imgData) return '/assets/default-avatar.png'; // Image par défaut si pas d'avatar
    const data = imgData.data?.attributes || imgData.attributes || imgData;
    const url = data?.url;

    if (!url) return '/assets/default-avatar.png';
    if (url.startsWith('/')) return `${strapiUrl}${url}`;
    return url;
};

// --- ANIMATION ---
const startAnimation = () => {
    // On arrête les animations précédentes pour éviter les bugs si on reload
    anime.remove('.anim-target');
    
    anime({
        targets: '.anim-target',
        translateY: [
            { value: -8, duration: 500, easing: 'easeInOutSine' },
            { value: 0, duration: 500, easing: 'easeInOutSine' }
        ],
        loop: true,
        delay: anime.stagger(200) // Décale le saut de chaque perso
    });
};

const stopExpedition = () => {
    console.log("Stop !");
    // Ici tu ajouteras la logique pour arrêter le run dans le store
};

onMounted(async () => {
    // 1. Timer
    timerInterval = setInterval(() => {
        secondsElapsed.value++;
    }, 1000);

    // 2. Charger les persos si pas déjà fait
    if (!characterStore.hasCharacters) {
        await characterStore.fetchCharacters();
    }

    // 3. Lancer l'animation une fois que le DOM est prêt
    // nextTick assure que le v-for a fini d'afficher les images
    await nextTick();
    if (characters.value.length > 0) {
        startAnimation();
    }
});

// Surveille si les persos changent (cas où le fetch prend du temps)
watch(characters, async (newVal) => {
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