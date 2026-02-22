<script setup lang="ts">
import { useZoneStore } from '~/stores/zone'

const zoneStore = useZoneStore()
const { createChannels, scheduleQuizNotification, setupNotificationListeners } = useNotifications()

onMounted(async () => {
  // Préchargement des données cartographiques (Zones) en arrière-plan
  // Stratégie Offline-First : IndexedDB ou API
  zoneStore.init()

  // Initialisation des notifications locales (no-op sur web)
  await createChannels()
  await setupNotificationListeners()
  await scheduleQuizNotification()
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>