<template>
  <div
    :class="[
      'rounded-2xl p-3 opacity-0 border-l-4 shadow-lg',
      rarityClasses
    ]"
  >
    <div class="flex items-center gap-3">
      <div class="w-14 h-14 rounded-xl bg-black/20 flex items-center justify-center p-1">
        <img
          :src="iconUrl"
          :alt="item.name"
          class="w-full h-full object-contain"
        />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-gray-300 font-onest text-xs mb-0.5">
          Niv. {{ item.level }} - {{ formattedDamage }}k
        </p>
        <p class="text-white font-power text-base truncate">{{ item.name }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LootItem } from '~/types/loot'
import { getRarityClasses } from '~/types/loot'

const props = defineProps<{
  item: LootItem
}>()

const config = useRuntimeConfig()

const iconUrl = computed(() => {
  const icon = props.item.icon?.data || props.item.icon
  if (!icon?.url) return '/assets/helmet1.png'
  if (icon.url.startsWith('http')) return icon.url
  return `${config.public.strapi.url}${icon.url}`
})

const rarityClasses = computed(() => getRarityClasses(props.item))

const formattedDamage = computed(() => {
  const num = props.item.index_damage
  if (num >= 1000) {
    return num.toLocaleString('fr-FR')
  }
  return num.toString()
})
</script>
