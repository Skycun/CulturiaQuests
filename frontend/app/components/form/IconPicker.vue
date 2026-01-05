<template>
  <ClientOnly>
    <div class="pt-2">
      <label v-if="label" class="block text-sm font-pixel text-indigo-600 mb-3">
        {{ label }}
      </label>

      <div v-if="loading" class="text-center py-8 text-gray-500">
        Chargement...
      </div>

      <div v-else-if="items.length === 0" class="text-center py-8 text-gray-500">
        Aucun élément disponible
      </div>

      <div
        v-else
        :class="[
          'grid gap-3',
          `grid-cols-${columns}`,
          `sm:grid-cols-${smColumns}`
        ]"
      >
        <div
          v-for="item in items"
          :key="item.id"
          @click="handleSelect(item)"
          :class="[
            'cursor-pointer transition-all aspect-square',
            modelValue === item.id
              ? 'pixel-notch bg-indigo-600 p-[4px] scale-105'
              : 'hover:scale-110',
            disabled && 'opacity-50 cursor-not-allowed'
          ]"
        >
          <div v-if="modelValue === item.id" class="pixel-notch bg-white p-1 h-full">
            <img
              :src="formatImageUrl(item)"
              :alt="item.name || 'Item'"
              class="w-full h-full object-contain"
            />
          </div>
          <img
            v-else
            :src="formatImageUrl(item)"
            :alt="item.name || 'Item'"
            class="w-full h-full object-contain rounded"
          />
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
interface IconPickerItem {
  id: number
  url: string
  name?: string
}

const props = defineProps({
  modelValue: {
    type: Number as PropType<number | null>,
    default: null
  },
  items: {
    type: Array as PropType<IconPickerItem[]>,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  columns: {
    type: Number,
    default: 4
  },
  smColumns: {
    type: Number,
    default: 6
  },
  getImageUrl: {
    type: Function as PropType<(item: IconPickerItem) => string>,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

function handleSelect(item: IconPickerItem) {
  if (!props.disabled) {
    emit('update:modelValue', item.id)
  }
}

function formatImageUrl(item: IconPickerItem): string {
  if (props.getImageUrl) {
    return props.getImageUrl(item)
  }
  return item.url || ''
}
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
