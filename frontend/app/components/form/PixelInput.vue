<template>
  <div class="space-y-2">
    <label
      v-if="label"
      class="block text-sm font-pixel text-indigo-600"
    >
      {{ label }}
    </label>
    <div
      :class="[
        'p-[4px] pixel-notch group transition-colors',
        disabled ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
      ]"
    >
      <input
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[
          'w-full h-full pixel-notch bg-white px-4 py-3 font-pixel text-lg',
          'focus:outline-none focus:ring-0',
          'disabled:bg-gray-100 disabled:cursor-not-allowed'
        ]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'password', 'email'].includes(v)
  },
  placeholder: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.pixel-notch {
  clip-path: polygon(
    0px 6px, 6px 6px, 6px 0px,
    calc(100% - 6px) 0px, calc(100% - 6px) 6px, 100% 6px,
    100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%,
    6px 100%, 6px calc(100% - 6px), 0px calc(100% - 6px)
  );
}
</style>
