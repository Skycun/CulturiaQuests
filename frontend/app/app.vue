<script setup lang="ts">
import { useZoneStore } from '~/stores/zone'

const zoneStore = useZoneStore()

onMounted(() => {
  // Préchargement des données cartographiques (Zones) en arrière-plan
  // Stratégie Offline-First : IndexedDB ou API
  zoneStore.init()
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>