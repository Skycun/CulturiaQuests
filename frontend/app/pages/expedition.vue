<template>
    <div
        class="h-screen bg-gradient-to-b from-[#040050] to-black text-white font-sans flex flex-col relative overflow-hidden">

        <section class="relative flex-grow flex flex-col items-center justify-evenly pt-12 w-full max-w-md mx-auto">

            <div
                class="absolute inset-x-4 top-4 bottom-0 border-x-2 border-t-2 border-white/90 rounded-t-[50vw] pointer-events-none mask-fade">
            </div>

            <div class="text-center shrink-0 z-10">
                <h1 class="font-pixel text-6xl sm:text-7xl mb-1">{{ formattedTime }}</h1>
                <p class="font-pixel text-3xl sm:text-4xl text-white tracking-widest">Palier {{ floor }}</p>
            </div>

            <div class="relative w-48 h-40 sm:w-64 sm:h-56 shrink-0 flex items-center justify-center z-10">
                <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-white/5 rounded-full blur-xl">
                </div>
                <img :src="museumImage" alt="Musée"
                    class="w-full h-full object-contain pixelated relative z-10 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
            </div>

            <div class="text-center shrink-0 max-w-[80%] z-10">
                <p class="font-power text-gray-400 text-sm font-semibold mb-1">Actuellement :</p>
                <h2 class="font-power text-2xl sm:text-3xl leading-tight">
                    {{ museumName }}
                </h2>
            </div>

            <div class="flex items-end justify-center gap-3 sm:gap-4 h-20 sm:h-24 shrink-0 w-full z-10">
                <div v-for="(perso, index) in characters" :key="perso.id"
                    class="relative flex justify-center w-12 sm:w-16">

                    <div class="absolute bottom-0 w-8 sm:w-12 h-3 sm:h-4 bg-white/20 rounded-[50%] blur-[2px]"></div>

                    <img :src="perso.avatar" :alt="perso.name"
                        class="anim-target w-12 h-12 sm:w-16 sm:h-16 object-contain pixelated relative z-10" />
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import anime from 'animejs';

definePageMeta({
    layout: 'footerless'
});

const floor = ref(18);
const museumName = "Musée d'art et d'histoire de Saint-Lô";
const museumImage = "/assets/musee.png";

const characters = ref([
    { id: 1, name: "Guerrier", avatar: "/assets/char-knight.png" },
    { id: 2, name: "Mage", avatar: "/assets/char-mage.png" },
    { id: 3, name: "Aventurière", avatar: "/assets/char-adventurer.png" },
    { id: 4, name: "Archer", avatar: "/assets/char-archer.png" },
]);

const secondsElapsed = ref(13 * 60 + 12);
let timerInterval = null;

const formattedTime = computed(() => {
    const m = Math.floor(secondsElapsed.value / 60).toString().padStart(2, '0');
    const s = (secondsElapsed.value % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
});

const stopExpedition = () => {
    console.log("Stop !");
};

onMounted(() => {
    timerInterval = setInterval(() => {
        secondsElapsed.value++;
    }, 1000);

    anime({
        targets: '.anim-target',
        translateY: [
            { value: -8, duration: 500, easing: 'easeInOutSine' },
            { value: 0, duration: 500, easing: 'easeInOutSine' }
        ],
        loop: true,
        delay: anime.stagger(200)
    });
});

onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
.mask-fade {
    -webkit-mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
    mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
}
</style>