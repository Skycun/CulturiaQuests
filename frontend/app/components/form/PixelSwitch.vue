<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled || loading"
    class="group focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none transition-transform active:scale-95"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <div
      :class="[
        'h-8 w-16 p-1 pixel-notch transition-colors duration-200',
        modelValue ? outerColorClass : 'bg-gray-400'
      ]"
    >
      <div
        :class="[
          'h-full w-7 bg-white pixel-notch transition-transform duration-200 flex items-center justify-center',
          modelValue ? 'translate-x-7' : 'translate-x-0'
        ]"
      >
        <Icon v-if="loading" name="mdi:loading" class="w-4 h-4 animate-spin" :class="modelValue ? textColorClass : 'text-gray-400'" />
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: 'indigo'
  }
});

defineEmits(['update:modelValue']);

const outerColorClass = computed(() => {
  if (props.color === 'indigo') return 'bg-indigo-600 group-hover:bg-indigo-700';
  if (props.color === 'red') return 'bg-red-600 group-hover:bg-red-700';
  return 'bg-indigo-600';
});

const textColorClass = computed(() => {
  if (props.color === 'indigo') return 'text-indigo-600';
  if (props.color === 'red') return 'text-red-600';
  return 'text-indigo-600';
});
</script>

<style scoped>
.pixel-notch {
  clip-path: polygon(
    0px 4px, 4px 4px, 4px 0px,
    calc(100% - 4px) 0px, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0px calc(100% - 4px)
  );
}
</style>
