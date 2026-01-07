<template>
    <div>
        <!-- Bouton de Tri -->
        <button
            class="flex items-center gap-2 mb-8 text-slate-900 font-pixel text-lg mx-auto"
            @click="npcStore.toggleSortMethod()">
            <Icon name="bx-sort" class="w-6 h-6 bg-black" />
            <span>
                {{ storiesSortMethod === 'alpha' ? "Tri alphabétique (A-Z)" : "Tri par nombre d'entrées" }}
            </span>
        </button>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-10 font-pixel text-xl text-gray-500">
            Chargement de la collection...
        </div>

        <!-- Erreur -->
        <div v-else-if="error" class="text-center py-10 text-red-500 font-pixel text-lg">
            {{ error }}
        </div>

        <!-- Grille -->
        <div v-else class="grid grid-cols-3 gap-y-10 gap-x-2">
            <template v-for="item in sortedJournals" :key="item.id">

                <NuxtLink 
                    v-if="!item.isUnknown" :to="`/stories/${item.friendshipId}`"
                    class="block group">
                    <JournalCard 
                        class="max-w-[120px] mx-auto"
                        :name="item.name" 
                        :image="item.image" 
                        :current-level="item.level"
                        :max-level="item.maxLevel" 
                        :is-unknown="false" 
                    />
                </NuxtLink>

                <div v-else class="block">
                    <JournalCard 
                        class="max-w-[120px] mx-auto"
                        :name="item.name" 
                        :image="item.image" 
                        :current-level="item.level"
                        :max-level="item.maxLevel" 
                        :is-unknown="true" 
                    />
                </div>

            </template>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useGuildStore } from '~/stores/guild';
import { useNpcStore } from '~/stores/npc';
import { useFriendshipStore } from '~/stores/friendship';
import { storeToRefs } from 'pinia';

// Stores
const guildStore = useGuildStore();
const npcStore = useNpcStore();
const friendshipStore = useFriendshipStore();

// États (Récupérés directement du store pour le tri et la liste)
const { storiesSortMethod, sortedJournals } = storeToRefs(npcStore);

// États locaux (juste pour le chargement initial de la page)
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
    loading.value = true;
    try {
        // Chargement parallèle pour plus de rapidité
        const promises = [];
        
        if (!guildStore.hasGuild) promises.push(guildStore.fetchGuild());
        if (!npcStore.hasNpcs) promises.push(npcStore.fetchNpcs());
        if (!friendshipStore.hasFriendships) promises.push(friendshipStore.fetchFriendships());

        await Promise.all(promises);

    } catch (e) {
        console.error('Erreur chargement journaux:', e);
        error.value = "Impossible de charger les journaux.";
    } finally {
        loading.value = false;
    }
});

onUnmounted(() => {
    // Reset du tri quand le composant est détruit
    npcStore.storiesSortMethod = 'alpha';
});
</script>