<template>
  <ClientOnly>
    <div class="space-y-2">
      <label
        v-if="label"
        class="block text-sm font-pixel text-indigo-600"
      >
        {{ label }}
      </label>
      <div :class="wrapperClasses"><input
          v-bind="$attrs"
          :value="modelValue"
          @input="handleInput"
          :type="type"
          :placeholder="placeholder"
          :disabled="disabled"
          :autocomplete="autocomplete"
          :class="inputClasses" /></div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (v: string) => ['text', 'password', 'email'].includes(v)
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
  },
  autocomplete: {
    type: String,
    default: 'off'
  }
})

const emit = defineEmits(['update:modelValue'])

const wrapperClasses = computed(() => [
  'pixel-input-wrapper',
  'pixel-notch',
  'group',
  'transition-colors',
  props.disabled ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
])

const inputClasses = computed(() => [
  'w-full',
  'h-full',
  'pixel-notch',
  'bg-white',
  'px-4',
  'py-3',
  'font-pixel',
  'text-lg',
  'focus:outline-none',
  'focus:ring-0',
  props.disabled ? 'bg-gray-100 cursor-not-allowed' : ''
])

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped>
.pixel-input-wrapper {
  padding: 4px;
}

.pixel-notch {
  clip-path: polygon(
    0px 6px, 6px 6px, 6px 0px,
    calc(100% - 6px) 0px, calc(100% - 6px) 6px, 100% 6px,
    100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%,
    6px 100%, 6px calc(100% - 6px), 0px calc(100% - 6px)
  );
}
</style>
