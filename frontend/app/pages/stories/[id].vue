<template>
    <div class="fixed inset-0 z-50 flex flex-col justify-end isolate">
        <!-- Wrapper global sans padding body -->

        <div 
            class="absolute inset-0 bg-black/20 backdrop-blur-[1px]" 
            @click="$router.push('/stories')"
        />

        <!-- Panel Overlay -->
        <div class="overlay-panel relative w-full h-[80vh] bg-gray-100 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden z-10">

            <!-- Handle Bar -->
            <div class="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-pointer" @click="$router.push('/stories')">
                <div class="w-12 h-1.5 bg-gray-300 rounded-full"/>
            </div>

            <div v-if="details" class="flex-1 overflow-y-auto p-5 pb-20">

                <div class="bg-white rounded-3xl p-6 shadow-sm flex items-center gap-4 mb-8">
                    <div class="w-20 h-20 shrink-0">
                        <img 
                            :src="details.image"
                            class="w-full h-full object-cover rounded-full border-2 border-gray-100" />
                    </div>

                    <div class="flex-1">
                        <h1 class="text-xl font-black text-slate-900 leading-tight">
                            {{ details.fullName }}
                        </h1>
                        <p class="text-slate-500 font-bold text-sm mb-3">
                            {{ details.job }}
                        </p>

                        <div class="flex items-center gap-3">
                            <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    class="h-full bg-indigo-600 rounded-full"
                                    :style="{ width: `${(details.level / details.maxLevel) * 100}%` }" />
                            </div>
                            <span class="text-xs font-black text-indigo-900">{{ details.level }}/{{ details.maxLevel
                            }}</span>
                        </div>
                    </div>
                </div>

                <div class="space-y-8">
                    <div v-for="entry in details.entries" :key="entry.id">

                        <h2 class="text-2xl font-black font-power text-slate-900 mb-3">
                            Entrée {{ entry.index }}
                        </h2>

                        <div class="bg-white rounded-2xl p-5 shadow-sm text-sm leading-relaxed text-slate-700 text-justify">
                            {{ entry.text }}
                        </div>

                    </div>

                    <div v-if="details.entries.length === 0" class="text-center text-gray-400 italic mt-10">
                        Aucune entrée débloquée pour le moment.
                    </div>
                </div>

            </div>

            <div v-else class="text-center py-20 text-gray-500">
                Chargement du journal...
            </div>

        </div>
    </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { onMounted, ref } from 'vue';
import { useStrapiClient } from '#imports';

const route = useRoute();
const friendshipId = route.params.id;

const details = ref(null);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
    const client = useStrapiClient(); // On initialise le client

    try {
        const idToSearch = Number(friendshipId);
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
        // On s'assure d'avoir un tableau
        const list = Array.isArray(rawData) ? rawData : (rawData.data || []);

        // On cherche notre ID
        const foundFriendship = list.find(item => {
            const fId = item.id || item.attributes?.id;
            return fId == idToSearch;
        });

        if (!foundFriendship) {
            error.value = "Introuvable";
            console.error("Toujours pas trouvé l'ID", idToSearch);
            return;
        }

        // Formatage
        const f = foundFriendship.attributes || foundFriendship;
        const npc = f.npc?.attributes || f.npc;

        const firstname = npc?.firstname || 'Inconnu';
        const lastname = npc?.lastname || '';
        const safeName = firstname.trim();

        // IMAGE
        const imagePath = `/assets/npc/${safeName}/${safeName}.png`;

        const maxLevel = (npc?.quests_entry_available || 0) + (npc?.expedition_entry_available || 0) || 4;
        const currentLevel = (f.quests_entry_unlocked || 0) + (f.expedition_entry_unlocked || 0);

        // DIALOGUES
        const rawDialogs = npc?.dialogs?.data || npc?.dialogs || [];
        const entries = [];

        rawDialogs.forEach((dObj) => {
            const d = dObj.attributes || dObj;
            // Sécurité si dialogues est null
            const texts = d.dialogues || [];

            texts.forEach((text, index) => {
                const entryNumber = index + 1;
                // On affiche SEULEMENT si débloqué
                if (entryNumber <= currentLevel) {
                    entries.push({
                        id: `${d.id}-${index}`,
                        index: entryNumber,
                        text: text
                    });
                }
            });
        });

        // Tri du plus récent au plus vieux
        entries.sort((a, b) => b.index - a.index);

        details.value = {
            fullName: `${firstname} ${lastname}`,
            job: npc?.job || 'Aventurier',
            image: imagePath,
            level: currentLevel,
            maxLevel: maxLevel,
            entries: entries
        };

    } catch (e) {
        console.error("Erreur critique:", e);
        error.value = e.message;
    } finally {
        loading.value = false;
    }
});

// Animation de transition
definePageMeta({
    pageTransition: {
        name: 'slide-up',
        mode: 'out-in'
    }
});
</script>

<style scoped>
/* Police spécifique pour les titres "Entrée X" */
.font-power {
    font-family: 'Power Grotesk', sans-serif;
    /* À adapter selon ton projet */
}
</style>
