<template>
    <div 
        class="w-full relative"
        :class="[heightClass, bgClass, containerRadiusClass]"
    >
        <div 
            class="h-full transition-all duration-500 ease-out"
            :class="[
                isCompleted ? 'bg-yellow-400' : 'bg-indigo-600',
                barRadiusClass
            ]"
            :style="{ width: `${percentage}%` }" 
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    current: { 
        type: Number, 
        required: true 
    },
    max: { 
        type: Number, 
        required: true 
    },
    heightClass: { 
        type: String, 
        default: 'h-2' 
    },
    bgClass: { 
        type: String, 
        default: 'bg-gray-100' 
    },
    variant: {
        type: String as () => 'default' | 'flat',
        default: 'default',
        validator: (value: string) => ['default', 'flat'].includes(value)
    }
});

const percentage = computed(() => {
    if (props.max <= 0) return 0;
    return Math.min((props.current / props.max) * 100, 100);
});

const isCompleted = computed(() => props.current >= props.max && props.max > 0);

const containerRadiusClass = computed(() => {
    if (props.variant === 'default') return 'rounded-full overflow-hidden';
    return ''; // 'flat' has no radius on container by default
});

const barRadiusClass = computed(() => {
    if (props.variant === 'default') return 'rounded-full';
    
    // Variant 'flat' (used in JournalCard)
    // rounded-l-none always
    // rounded-r-full if in progress
    // rounded-none if completed
    return `rounded-l-none ${isCompleted.value ? 'rounded-r-none' : 'rounded-r-full'}`;
});
</script>
