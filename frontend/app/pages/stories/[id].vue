<template>
    <UiOverlayPanel @close="goBack">
        
        <div v-if="loading" class="text-center py-20 text-gray-500 font-pixel">
            Chargement du journal...
        </div>

        <div v-else-if="error" class="text-center py-20 text-red-500 font-bold">
            {{ error }}
        </div>

        <StoriesJournalDetail v-else-if="details" :details="details" />

    </UiOverlayPanel>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { onMounted, ref } from 'vue';
import { useStrapiClient } from '#imports';

const route = useRoute();
const router = useRouter();
const friendshipId = route.params.id;

const details = ref(null);
const loading = ref(true);
const error = ref(null);

const goBack = () => {
    router.push('/stories');
};

onMounted(async () => {
    const client = useStrapiClient();

    try {
        const idToSearch = Number(friendshipId);
        // Optimisation : on pourrait utiliser findOne si l'API Strapi le permet directement avec l'ID, 
        // mais gardons la logique actuelle qui semble fonctionner pour toi.
        const response = await client('/friendships', {
            method: 'GET',
            params: {
                populate: {
                    npc: {
                        populate: ['dialogs']
                    }
                }
            }
        });

        const rawData = response.data || response;
        const list = Array.isArray(rawData) ? rawData : (rawData.data || []);

        const foundFriendship = list.find(item => {
            const fId = item.id || item.attributes?.id;
            return fId == idToSearch;
        });

        if (!foundFriendship) {
            error.value = "Journal introuvable";
            return;
        }

        // --- Transformation des données ---
        const f = foundFriendship.attributes || foundFriendship;
        const npc = f.npc?.attributes || f.npc;

        const firstname = npc?.firstname || 'Inconnu';
        const lastname = npc?.lastname || '';
        const safeName = firstname.trim();

        const maxLevel = (npc?.quests_entry_available || 0) + (npc?.expedition_entry_available || 0) || 4;
        const currentLevel = (f.quests_entry_unlocked || 0) + (f.expedition_entry_unlocked || 0);

        // Traitement des dialogues
        const rawDialogs = npc?.dialogs?.data || npc?.dialogs || [];
        const entries = [];

        rawDialogs.forEach((dObj) => {
            const d = dObj.attributes || dObj;
            const texts = d.dialogues || [];

            texts.forEach((text, index) => {
                const entryNumber = index + 1;
                if (entryNumber <= currentLevel) {
                    entries.push({
                        id: `${d.id}-${index}`,
                        index: entryNumber,
                        text: text
                    });
                }
            });
        });

        entries.sort((a, b) => b.index - a.index);

        details.value = {
            fullName: `${firstname} ${lastname}`,
            job: npc?.job || 'Aventurier',
            image: `/assets/npc/${safeName}/${safeName}.png`,
            level: currentLevel,
            maxLevel: maxLevel,
            entries: entries
        };

    } catch (e) {
        console.error("Erreur chargement journal:", e);
        error.value = "Impossible de charger le journal.";
    } finally {
        loading.value = false;
    }
});

definePageMeta({
    pageTransition: {
        name: 'slide-up',
        mode: 'out-in'
    }
});
</script>