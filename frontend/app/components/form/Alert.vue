<template>
  <ClientOnly>
    <div
      v-if="message"
      :class="[
        'text-sm mt-2 p-3 rounded border flex items-start gap-2',
        variantClasses
      ]"
    >
      <span v-if="icon" class="flex-shrink-0 text-lg">{{ iconSymbol }}</span>
      <span class="flex-1">{{ message }}</span>
      <button
        v-if="dismissible"
        @click="$emit('dismiss')"
        class="flex-shrink-0 text-lg font-bold hover:opacity-70 transition-opacity"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  message: {
    type: String,
    default: null
  },
  variant: {
    type: String as PropType<'error' | 'success' | 'warning' | 'info'>,
    default: 'error',
    validator: (v: string) => ['error', 'success', 'warning', 'info'].includes(v)
  },
  icon: {
    type: Boolean,
    default: true
  },
  dismissible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['dismiss'])

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'error':
      return 'text-red-500 bg-red-50 border-red-200'
    case 'success':
      return 'text-green-500 bg-green-50 border-green-200'
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'info':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    default:
      return 'text-red-500 bg-red-50 border-red-200'
  }
})

const iconSymbol = computed(() => {
  switch (props.variant) {
    case 'error':
      return '✕'
    case 'success':
      return '✓'
    case 'warning':
      return '⚠'
    case 'info':
      return 'ℹ'
    default:
      return '✕'
  }
})
</script>
