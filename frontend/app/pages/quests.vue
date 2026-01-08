<script setup lang="ts">
import { useQuestStore } from '~/stores/quest'
import { storeToRefs } from 'pinia'
import QuestBox from '~/components/quest/QuestBox.vue'
import PixelButton from '~/components/form/PixelButton.vue'

const router = useRouter()
const questStore = useQuestStore()
const { availableQuests } = storeToRefs(questStore)

onMounted(async () => {
    await questStore.fetchQuests()
    console.log('Quêtes chargées:', availableQuests.value)
})
</script>

<template>
    <div class="min-h-screen bg-gray-50 pb-20 pt-6 px-4 flex flex-col">
        <h1 class="text-3xl text-center text-gray-800 mb-8 font-power">
            Tableau de quêtes
        </h1>

        <div v-if="questStore.loading" class="text-center py-8">
            <p class="text-gray-500">Chargement des quêtes...</p>
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
