<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="modelValue" 
        class="fixed inset-0 bg-black/40 z-[1999]"
        @click="$emit('update:modelValue', false)"
      ></div>
    </Transition>
    
    <Transition name="slide-up">
      <div 
        v-if="modelValue" 
        class="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl z-[2000] max-h-[80vh] overflow-y-auto p-6 pb-10"
      >
        <!-- Drag handle visual -->
        <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
        
        <!-- Content -->
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
