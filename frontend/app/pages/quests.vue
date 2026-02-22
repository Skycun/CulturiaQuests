<script setup lang="ts">
import { useQuestStore } from '~/stores/quest'
import { usePOIStore } from '~/stores/poi'
import { storeToRefs } from 'pinia'
import { calculateDistance } from '~/utils/geolocation'
import QuestBox from '~/components/quest/QuestBox.vue'
import PixelButton from '~/components/form/PixelButton.vue'

const router = useRouter()
const questStore = useQuestStore()
const poiStore = usePOIStore()
const { availableQuests } = storeToRefs(questStore)

const generating = ref(false)

onMounted(async () => {
    await questStore.fetchQuests()

    // Si pas de quêtes aujourd'hui, en générer automatiquement
    if (availableQuests.value.length === 0) {
        await generateQuests()
    }
})

async function generateQuests() {
    generating.value = true

    try {
        // S'assurer que les POIs sont chargés
        await poiStore.init()

        // Récupérer la position GPS (ou position par défaut Saint-Lô)
        const position = await getCurrentPosition()

        // Trier les POIs par distance et prendre les 8 plus proches (tous différents)
        const sortedPois = [...poiStore.pois]
            .filter(p => p.lat != null && p.lng != null)
            .map(p => ({
                ...p,
                distance: calculateDistance(position.lat, position.lng, p.lat!, p.lng!),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 8)

        if (sortedPois.length < 2) return

        const poiDocumentIds = sortedPois.map(p => p.documentId)
        await questStore.generateDailyQuests(poiDocumentIds)
    } catch (e) {
        console.error('Failed to generate quests:', e)
    } finally {
        generating.value = false
    }
}

function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ lat: 49.1167, lng: -1.0833 })
            return
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            },
            () => {
                // En cas d'erreur, utiliser la position par défaut (Saint-Lô)
                resolve({ lat: 49.1167, lng: -1.0833 })
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
        )
    })
}
</script>

<template>
    <div class="min-h-screen bg-gray-50 pb-20 pt-6 px-4 flex flex-col">
        <h1 class="text-3xl text-center text-gray-800 mb-8 font-power pt-[env(safe-area-inset-top)]">
            Tableau de quêtes
        </h1>

        <div v-if="questStore.loading || generating" class="text-center py-8">
            <p class="text-gray-500">
                {{ generating ? 'Génération des quêtes du jour...' : 'Chargement des quêtes...' }}
            </p>
        </div>

        <div v-else-if="questStore.error" class="text-center py-8 text-red-500">
            {{ questStore.error }}
        </div>

        <div v-else class="space-y-4 max-w-2xl mx-auto w-full flex-grow">
            <QuestBox
                v-for="quest in availableQuests"
                :key="quest.id"
                :quest="quest"
            />

            <div v-if="availableQuests.length === 0" class="text-center text-gray-500 mt-8">
                Aucune quête disponible pour le moment.
            </div>
        </div>

        <!-- Bouton retour Guilde -->
        <div class="mt-8 mb-[25px] flex justify-center w-full">
            <PixelButton variant="filled" color="darker-red" @click="router.push('/guild')">
                Guilde
            </PixelButton>
        </div>
    </div>
</template>
