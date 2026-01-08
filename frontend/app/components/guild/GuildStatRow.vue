<template>
    <div class="flex items-center justify-between py-2 border-b border-gray-900 last:border-0">
        <Icon v-if="icon" :name="icon" class="text-gray-500 mr-3" />
        <span class="font-onest text-gray-300 flex-1">{{ label }}</span>
        <span class="font-pixel text-xl text-white">{{ value }}</span>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    icon?: string
    label: string
    value: string | number
}>()
</script>
