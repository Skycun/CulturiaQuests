<template>
  <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-gray-400 font-onest mb-1">{{ label }}</p>
        <p class="text-3xl font-bold text-white">{{ value }}</p>
        <p v-if="sub" class="text-xs mt-2 font-onest" :class="subColor">{{ sub }}</p>
      </div>
      <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="iconBg">
        <Icon :name="icon" class="w-5 h-5" :class="iconColor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  icon: string
  label: string
  value: number | string
  sub?: string | null
  color?: string
}>()

const colorMap: Record<string, { iconBg: string; iconColor: string; subColor: string }> = {
  blue: { iconBg: 'bg-blue-400/10', iconColor: 'text-blue-400', subColor: 'text-blue-400' },
  amber: { iconBg: 'bg-amber-400/10', iconColor: 'text-amber-400', subColor: 'text-amber-400' },
  emerald: { iconBg: 'bg-emerald-400/10', iconColor: 'text-emerald-400', subColor: 'text-emerald-400' },
  purple: { iconBg: 'bg-purple-400/10', iconColor: 'text-purple-400', subColor: 'text-purple-400' },
  red: { iconBg: 'bg-red-400/10', iconColor: 'text-red-400', subColor: 'text-red-400' },
}

const resolved = computed(() => colorMap[props.color || 'blue'] || colorMap.blue)
const iconBg = computed(() => resolved.value.iconBg)
const iconColor = computed(() => resolved.value.iconColor)
const subColor = computed(() => resolved.value.subColor)
</script>
