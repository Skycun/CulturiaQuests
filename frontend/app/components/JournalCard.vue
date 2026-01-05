<template>
    <div class="flex flex-col items-center w-full max-w-[120px] mx-auto">

        <div class="relative p-1 transition-all duration-300 w-full aspect-square flex items-end justify-center" :class="[
            // Si complété : bordure dorée, fond blanc, forme arrondie en haut
            isCompleted ? 'border-t-4 border-x-4 border-yellow-400 rounded-t-2xl bg-white pb-2' : '',
            // Si inconnu : on garde le fond transparent ou blanc simple
            !isCompleted ? 'bg-white rounded-t-2xl' : ''
        ]">
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto z-10">
                <img :src="image" :alt="name" class="w-full h-full object-cover rounded-full"
                    :class="{ 'brightness-0 opacity-80': isUnknown }" />
            </div>

            <div v-if="isCompleted"
                class="absolute -bottom-4 left-0 w-full h-6 bg-white border-x-4 border-yellow-400 z-0"></div>
        </div>

        <div v-if="!isUnknown" class="w-full h-1.5 bg-gray-200 mt-1 rounded-full overflow-hidden relative z-20 mx-4">
            <div class="h-full bg-indigo-600 rounded-full" :style="{ width: `${progressPercentage}%` }"></div>
        </div>

        <div class="text-center mt-2 z-20 relative">
            <h3 class="font-bold text-xs sm:text-sm text-slate-900 leading-tight font-sans">
                {{ name }}
            </h3>

            <span v-if="!isUnknown" class="text-[10px] sm:text-xs text-slate-500 font-bold mt-1 block">
                {{ currentLevel }}/{{ maxLevel }}
            </span>
            <span v-else class="text-xs text-slate-500 font-bold mt-1 block">???</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    name: { type: String, default: '???' },
    image: { type: String, default: '' },
    currentLevel: { type: Number, default: 0 },
    maxLevel: { type: Number, default: 4 },
    isUnknown: { type: Boolean, default: false }
});

// Calcul du pourcentage (0 à 100)
const progressPercentage = computed(() => {
    if (props.isUnknown || props.maxLevel === 0) return 0;
    return Math.min((props.currentLevel / props.maxLevel) * 100, 100);
});

// Est considéré comme "Doré/Complet" si niveau max atteint ET pas inconnu
const isCompleted = computed(() => {
    return props.currentLevel >= props.maxLevel && !props.isUnknown;
});
</script>