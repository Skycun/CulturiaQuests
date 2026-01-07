<template>
    <div class="flex flex-col items-center w-full max-w-[120px] mx-auto">

        <div 
            class="relative w-full aspect-square flex flex-col justify-end bg-white transition-all duration-300 rounded-t-3xl rounded-b-none"
            :class="[
                isCompleted
                    ? 'border-t-4 border-x-4 border-b-0 border-yellow-400'
                    : 'shadow-sm'
            ]">

            <div v-if="isCompleted">
                <div
                    class="absolute -left-1 bottom-0 w-2 h-1/2 bg-gradient-to-t from-white via-white to-transparent z-30" />

                <div
                    class="absolute -right-1 bottom-0 w-2 h-1/2 bg-gradient-to-t from-white via-white to-transparent z-30" />
            </div>

            <div
                class="absolute inset-0 rounded-t-[calc(1.5rem-4px)] overflow-hidden z-20 flex items-end justify-center">
                <img 
                    :src="image" :alt="name"
                    class="w-full h-[90%] object-contain object-bottom transition-all duration-300"
                    :class="{ 'brightness-0 opacity-100': isUnknown }" />
            </div>
        </div>

        <UiProgressBar 
            class="z-40"
            bg-class="bg-gray-200"
            variant="flat"
            :current="isUnknown ? 0 : currentLevel"
            :max="maxLevel"
        />

        <div class="text-center mt-2">
            <h3 class="text-base sm:text-lg text-indigo-950 leading-tight font-pixel">
                {{ name }}
            </h3>

            <span v-if="!isUnknown" class="text-xs sm:text-sm text-slate-500 font-pixel mt-0.5 block">
                {{ currentLevel }}/{{ maxLevel }}
            </span>
            <span v-else class="text-xs text-slate-500 font-pixel mt-0.5 block">???</span>
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

const progressPercentage = computed(() => {
    if (props.isUnknown || props.maxLevel === 0) return 0;
    return Math.min((props.currentLevel / props.maxLevel) * 100, 100);
});

const isCompleted = computed(() => {
    return props.currentLevel >= props.maxLevel && !props.isUnknown;
});
</script>