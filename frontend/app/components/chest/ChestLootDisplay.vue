<template>
  <div class="w-full max-w-md flex flex-col flex-1">
    <!-- White arch with opened chest -->
    <div class="relative mt-8">
      <div class="absolute inset-x-4 -top-4 h-56 bg-gradient-to-b from-white/30 via-white/15 to-transparent rounded-t-[120px] border-t-2 border-x-2 border-white/20"></div>
      <div class="relative z-10 flex justify-center pt-6">
        <img
          src="/assets/map/chest-opened.png"
          alt="Coffre ouvert"
          class="w-52 h-52 object-contain drop-shadow-2xl"
        />
      </div>
    </div>

    <!-- Loot content -->
    <div class="space-y-4 px-2 flex-1 flex flex-col">
      <h2 class="text-2xl font-power text-white text-center mt-4">
        Récompenses obtenues
      </h2>

      <!-- Gold & XP badges -->
      <ChestLootBadges
        ref="badgesRef"
        :gold="loot.gold"
        :exp="loot.exp"
      />

      <!-- Items list -->
      <div class="space-y-3 flex-1 overflow-y-auto">
        <ChestLootItemCard
          v-for="item in loot.items"
          :key="item.documentId"
          :ref="setItemRef"
          :item="item"
        />
      </div>

      <!-- Return button -->
      <div class="pt-4 pb-8 mt-auto">
        <FormPixelButton
          color="indigo"
          variant="filled"
          class="w-full"
          @click="$emit('back')"
        >
          Revenir à la carte
        </FormPixelButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChestLoot } from '~/types/loot'
import type { ComponentPublicInstance } from 'vue'
import { useChestAnimation } from '~/composables/useChestAnimation'

const props = defineProps<{
  loot: ChestLoot
}>()

defineEmits<{
  back: []
}>()

const { animateLootDisplay } = useChestAnimation()

const badgesRef = ref<ComponentPublicInstance>()
const itemRefs = ref<HTMLElement[]>([])

const setItemRef = (el: Element | ComponentPublicInstance | null) => {
  if (el) {
    const htmlEl = el instanceof HTMLElement ? el : (el as ComponentPublicInstance).$el
    if (htmlEl instanceof HTMLElement) {
      itemRefs.value.push(htmlEl)
    }
  }
}

async function playAnimations() {
  // Wait for DOM to be ready
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 50))

  const badgesEl = badgesRef.value?.$el as HTMLElement | undefined
  await animateLootDisplay(badgesEl, itemRefs.value)
}

onMounted(() => {
  itemRefs.value = []
  playAnimations()
})

defineExpose({
  playAnimations
})
</script>
