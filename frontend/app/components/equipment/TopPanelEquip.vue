<template>
  <div class="bg-white rounded-[25px] p-4 flex items-center justify-between shadow-lg mx-auto w-full">
    <div class="flex-shrink-0 mr-4">
      <img v-if="character?.avatar" :src="character.avatar" alt="Character" class="w-20 h-20 object-contain pixelated" />
    </div>

    <div class="flex gap-2">
      <div 
        v-for="slot in ['weapon', 'helmet', 'charm']" 
        :key="slot"
        @click="$emit('change-slot', slot)"
        :class="[
          'w-16 h-16 sm:w-20 sm:h-20 rounded-xl transition-all duration-200 cursor-pointer border-2 relative overflow-hidden',
          activeSlot === slot ? 'border-black scale-105 shadow-md z-10' : 'border-transparent hover:bg-gray-50'
        ]"
      >
        <Items 
          v-if="getEquippedItem(slot)"
          v-bind="getEquippedItem(slot)"
          :selected="activeSlot === slot"
        />
        <div v-else class="w-full h-full bg-gray-200/50 flex items-center justify-center">
           <div class="w-3 h-3 rounded-full bg-gray-300"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  character: Object,
  activeSlot: String
});

defineEmits(['change-slot']);

const getEquippedItem = (slotName) => {
  if (!props.character || !props.character.equippedItems) return null;
  return props.character.equippedItems.find(i => i.category.toLowerCase() === slotName.toLowerCase());
};
</script>

<style scoped>
.pixelated { image-rendering: pixelated; }
</style>