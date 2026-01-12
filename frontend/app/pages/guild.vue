<template>
    <div class="flex flex-col min-h-screen bg-black text-white pb-20">
        <!-- Hero Section -->
        <div class="relative h-[100dvh] w-full flex flex-col items-center justify-between overflow-hidden">
            <!-- Background Image -->
            <img 
                src="/assets/Guilde.png" alt="Guilde Background"
                class="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none">

            <!-- Overlay Gradient -->
            <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black z-0" />

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
            <div class="relative z-10 w-full flex justify-center mb-[100px]">
                <PixelButton variant="filled" color="darker-red" @click="router.push('/quests')">
                    Quêtes
                </PixelButton>
            </div>
        </div>

        <!-- Stats Section -->
        <div class="px-4 py-8 space-y-4 bg-black">
            <h3 class="font-power text-2xl mb-6 text-center text-white">
                Statistiques
                <span v-if="statsStore.isLoading" class="block text-sm text-gray-400 animate-pulse font-sans font-normal mt-1">Calcul en cours...</span>
            </h3>

            <!-- Loading Skeleton or Real Data -->
            <div v-if="statsStore.isLoading" class="space-y-4 animate-pulse opacity-50">
                <div v-for="i in 5" :key="i" class="h-8 bg-gray-900 rounded"/>
            </div>

            <div v-else class="space-y-2">
                <GuildStatRow 
                    v-for="(stat, index) in displayStats" 
                    :key="index"
                    :icon="stat.icon"
                    :label="stat.label"
                    :value="stat.value"
                />
            </div>
            
            <!-- Account Age Footer -->
            <div v-if="!statsStore.isLoading" class="text-center mt-8 font-onest">
                <div class="text-gray-500 text-sm">
                    Compte actif depuis {{ statsStore.accountDays }} jours
                </div>
                <button 
                    class="text-gray-500 text-sm mt-2 underline hover:text-gray-300 transition-colors"
                    @click="logout"
                    >
                    Se déconnecter
                </button>
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
import GuildStatRow from '~/components/guild/GuildStatRow.vue'

const router = useRouter()
const { logout: strapiLogout } = useStrapiAuth()
const guildStore = useGuildStore()
const statsStore = useStatisticsStore()

const logout = () => {
    strapiLogout()
    router.push('/')
}

onMounted(() => {
    // Trigger calculation on mount
    statsStore.fetchStatistics()
})

const displayStats = computed(() => [
    {
        icon: 'game-icons:medieval-barracks',
        label: 'Nombre total d\'expéditions',
        value: statsStore.totalExpeditions,
    },
    {
        icon: 'game-icons:hourglass',
        label: 'Temps total en expédition',
        value: statsStore.formattedTotalTime,
    },
    {
        icon: 'game-icons:broadsword',
        label: 'Dégâts totaux en expédition',
        value: statsStore.formattedTotalDamage,
    },
    {
        icon: 'game-icons:3d-stairs',
        label: 'Étage maximal atteint',
        value: statsStore.maxFloor,
    },
    {
        icon: 'game-icons:open-chest',
        label: 'Total coffres ouverts',
        value: statsStore.totalPoiVisits,
    },
    {
        icon: 'game-icons:direction-signs',
        label: 'POI unique visités',
        value: statsStore.totalDistinctPois,
    },
    {
        icon: 'game-icons:hanging-sign',
        label: 'POI le plus visité',
        value: statsStore.mostVisitedPoiName || 'Aucun',
    },
    {
        icon: 'game-icons:cardboard-box-closed',
        label: 'Total d\'items collectés',
        value: statsStore.totalItemsCollected,
    },
    {
        icon: 'game-icons:recycle',
        label: 'Total d\'items recyclés',
        value: statsStore.totalItemsScrapped,
    },
    {
        icon: 'game-icons:metal-bar',
        label: 'Total de scrap accumulé',
        value: statsStore.totalScrapAccumulated,
    },
    {
        icon: 'game-icons:coins',
        label: 'Or Total Accumulé',
        value: statsStore.totalGold,
    },
    {
        icon: 'game-icons:queen-crown',
        label: 'Expérience Totale',
        value: statsStore.formattedTotalExp,
    },
    {
        icon: 'game-icons:bookmarklet',
        label: 'Niveau Guilde',
        value: guildStore.level,
    }
])
</script>

<style scoped>
    
</style>