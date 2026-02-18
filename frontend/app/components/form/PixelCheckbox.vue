<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="group flex items-center gap-3 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none transition-transform active:scale-95"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <!-- Box -->
    <div
      :class="[
        'h-7 w-7 shrink-0 p-1 pixel-notch transition-colors duration-200',
        modelValue ? outerColorClass : 'bg-gray-400'
      ]"
    >
      <div class="h-full w-full pixel-notch bg-white flex items-center justify-center">
        <Icon
          v-if="modelValue"
          name="mdi:check-bold"
          :class="['w-3.5 h-3.5 transition-opacity duration-100', textColorClass]"
        />
      </div>
    </div>

    <!-- Label -->
    <span v-if="label" class="font-pixel text-sm text-indigo-600 leading-tight text-left">
      {{ label }}
    </span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: 'indigo'
  }
})

defineEmits(['update:modelValue'])

const outerColorClass = computed(() => {
  if (props.color === 'indigo') return 'bg-indigo-600 group-hover:bg-indigo-700'
  if (props.color === 'red') return 'bg-red-600 group-hover:bg-red-700'
  return 'bg-indigo-600'
})

const textColorClass = computed(() => {
  if (props.color === 'indigo') return 'text-indigo-600'
  if (props.color === 'red') return 'text-red-600'
  return 'text-indigo-600'
})
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
