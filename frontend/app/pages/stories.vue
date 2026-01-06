<template>
    <div class="min-h-screen bg-gray-100 font-sans pb-24">

        <AppHeader />

        <main class="px-4 w-full max-w-lg mx-auto">

            <h1 class="text-3xl text-center my-6 font-power">
                Journaux
            </h1>

            <button
                class="flex items-center gap-2 mb-8 text-slate-900 font-bold text-sm mx-auto"
                @click="npcStore.toggleSortMethod()">
                <Icon name="bx-sort" class="w-6 h-6 bg-black" />
                <span>
                    {{ storiesSortMethod === 'alpha' ? "Tri alphabétique (A-Z)" : "Tri par nombre d'entrées" }}
                </span>
            </button>

            <div v-if="loading" class="text-center py-10 font-pixel text-xl text-gray-500">
                Chargement de la collection...
            </div>

            <div v-else-if="error" class="text-center py-10 text-red-500 font-bold">
                {{ error }}
            </div>

            <div v-else class="grid grid-cols-3 gap-y-10 gap-x-2">
                <template v-for="item in sortedJournals" :key="item.id">

                    <NuxtLink 
                        v-if="!item.isUnknown" :to="`/stories/${item.friendshipId}`"
                        class="block group">
                        <JournalCard 
                            class="max-w-[120px] mx-auto"
                            :name="item.name" :image="item.image" :current-level="item.level"
                            :max-level="item.maxLevel" :is-unknown="false" />
                    </NuxtLink>

                    <div v-else class="block">
                        <JournalCard 
                            class="max-w-[120px] mx-auto"
                            :name="item.name" :image="item.image" :current-level="item.level"
                            :max-level="item.maxLevel" :is-unknown="true" />
                    </div>

                </template>
            </div>

        </main>

        <NuxtPage />
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useGuildStore } from '~/stores/guild';
import { useNpcStore } from '~/stores/npc';
import { useFriendshipStore } from '~/stores/friendship';
import { storeToRefs } from 'pinia';

// Stores
const guildStore = useGuildStore();
const npcStore = useNpcStore();
const friendshipStore = useFriendshipStore();

// États
const loading = ref(true);
const error = ref(null);
const { storiesSortMethod } = storeToRefs(npcStore);

onMounted(async () => {
    loading.value = true;
    try {
        // Ensure guild is loaded
        if (!guildStore.hasGuild) {
            await guildStore.fetchGuild();
        }

        // Fetch NPCs and friendships if not cached
        if (!npcStore.hasNpcs) {
            await npcStore.fetchNpcs();
        }
        if (!friendshipStore.hasFriendships) {
            await friendshipStore.fetchFriendships();
        }

    } catch (e) {
        console.error('Erreur chargement journaux:', e);
        error.value = "Impossible de charger les journaux.";
    } finally {
        loading.value = false;
    }
});

onUnmounted(() => {
    // Reset du tri quand on quitte la section Stories
    npcStore.storiesSortMethod = 'alpha';
});

// --- LOGIQUE DE FUSION ET DE TRI ---
const sortedJournals = computed(() => {
    if (!npcStore.hasNpcs) return [];

    const journals = npcStore.npcs.map(npcObj => {
        const npc = npcObj.attributes || npcObj;
        const npcId = npcObj.id;

        // Use NPC store's helper - handles all friendship logic
        const friendshipInfo = npcStore.getNpcFriendshipInfo(npcId);

        // Calculate max entries
        const maxEntries = (npc.quests_entry_available || 0) +
                          (npc.expedition_entry_available || 0);
        const finalMax = maxEntries > 0 ? maxEntries : 4;

        // Get NPC name
        const firstName = npc.firstname || 'Inconnu';
        const lastName = npc.lastname || '';
        const realName = `${firstName} ${lastName}`.trim();
        const realImage = getLocalImage(firstName);

        return {
            id: npcId,
            friendshipId: friendshipInfo.friendship?.id,
            name: friendshipInfo.discovered ? realName : "???",
            level: friendshipInfo.totalUnlocked,
            maxLevel: finalMax,
            image: realImage,
            isUnknown: !friendshipInfo.discovered
        };
    });

    // Sort logic
    const unlocked = journals.filter(j => !j.isUnknown);
    const locked = journals.filter(j => j.isUnknown);

    if (storiesSortMethod.value === 'alpha') {
        unlocked.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        unlocked.sort((a, b) => b.level - a.level);
    }

    return [...unlocked, ...locked];
});

// Fonction image (inchangée)
const getLocalImage = (name) => {
    if (!name || name === 'Inconnu') return '/assets/default-avatar.png';
    const safeName = name.trim();
    return `/assets/npc/${safeName}/${safeName}.png`;
};
</script>