<template>
    <div class="flex flex-col min-h-screen bg-gray-900 text-white pb-20">
        <!-- Hero Section -->
        <div class="relative h-[100dvh] w-full flex flex-col items-center justify-between overflow-hidden">
            <!-- Background Image -->
            <img 
                src="/assets/Guilde.png" alt="Guilde Background"
                class="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none">

            <!-- Overlay Gradient (optional, for readability) -->
            <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-0" />

            <!-- Top Content -->
            <div class="relative z-10 flex flex-col items-center mt-16 text-center w-full px-4">
                <h1 class="font-power text-5xl tracking-wide text-amber-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                    Guilde
                </h1>
                <h2 class="font-pixel text-2xl text-white mt-2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                    {{ guildStore.name || 'Nom de la Guilde' }}
                </h2>
            </div>

            <!-- Bottom Button -->
            <div class="relative z-10 w-full flex justify-center mb-12">
                <PixelButton variant="filled" color="darker-red" @click="router.push('/quests')">
                    Quêtes
                </PixelButton>
            </div>
        </div>

        <!-- Stats Section -->
        <div class="px-4 py-8 space-y-4">
            <h3 class="font-power text-2xl mb-6 border-b border-gray-700 pb-2 flex justify-between items-center">
                <span>Statistiques</span>
                <span v-if="statsStore.isLoading" class="text-sm text-gray-400 animate-pulse font-sans">Calcul en cours...</span>
            </h3>

            <!-- Loading Skeleton or Real Data -->
            <div v-if="statsStore.isLoading" class="grid grid-cols-1 gap-4 animate-pulse opacity-50">
                <div v-for="i in 3" :key="i" class="bg-gray-800 p-4 rounded-lg border-2 border-gray-700 h-16"></div>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div 
                    v-for="(stat, index) in displayStats" :key="index"
                    class="bg-gray-800 p-4 rounded-lg border-2 border-gray-700 flex items-center justify-between hover:border-amber-500/50 transition-colors"
                >
                    <div class="flex items-center space-x-3">
                        <span class="text-2xl">{{ stat.icon }}</span>
                        <span class="font-onest text-gray-300">{{ stat.label }}</span>
                    </div>
                    <span class="font-pixel text-xl text-amber-400">{{ stat.value }}</span>
                </div>
            </div>
            
            <!-- Account Age Footer -->
            <div v-if="!statsStore.isLoading" class="text-center text-gray-500 text-sm mt-8 font-onest">
                Compte actif depuis {{ statsStore.accountDays }} jours
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGuildStore } from '~/stores/guild'
import { useStatisticsStore } from '~/stores/statistics'
import PixelButton from '~/components/form/PixelButton.vue'

const router = useRouter()
const guildStore = useGuildStore()
const statsStore = useStatisticsStore()

onMounted(() => {
    // Trigger calculation on mount
    statsStore.fetchStatistics()
})

const displayStats = computed(() => [
    {
        label: 'Expéditions',
        value: statsStore.totalExpeditions,
        icon: '🏃'
    },
    {
        label: 'Temps de Jeu',
        value: statsStore.formattedTotalTime,
        icon: '⏱️'
    },
    {
        label: 'Étage Max',
        value: statsStore.maxFloor,
        icon: 'elevator' // Using emoji for simplicity: 🔼 or 🏰
        // If icon library is used, adjust accordingly. Keeping emoji for consistency with existing code.
    },
    {
        label: 'Dégâts Totaux',
        value: statsStore.formattedTotalDamage,
        icon: '⚔️'
    },
    {
        label: 'POI Visités',
        value: statsStore.totalPoiVisits,
        icon: '📍'
    },
    {
        label: 'Lieux Uniques',
        value: statsStore.totalDistinctPois,
        icon: '🌍'
    },
    {
        label: 'Items Collectés',
        value: statsStore.totalItemsCollected,
        icon: '🎒'
    },
    {
        label: 'Items Recyclés',
        value: statsStore.totalItemsScrapped,
        icon: '♻️'
    },
    {
        label: 'Scrap Accumulé',
        value: statsStore.totalScrapAccumulated,
        icon: '⚙️'
    },
    {
        label: 'Expérience Totale',
        value: statsStore.totalExp, // Can format with 'k'/'M' if needed later
        icon: '✨'
    },
    // Guild snapshot data (from guildStore)
    {
        label: 'Or Actuel',
        value: guildStore.gold,
        icon: '💰'
    },
    {
        label: 'Niveau Guilde',
        value: guildStore.level,
        icon: '📊'
    }
])
</script>

<style scoped>
/* Ensure font-power is available if not globally applied, 
   but it should be based on typography.md */
</style>
