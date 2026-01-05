<template>
    <div class="min-h-screen bg-gray-100 font-sans pb-24">

        <AppHeader />

        <main class="px-4 w-full max-w-lg mx-auto">

            <h1 class="text-3xl font-black text-center mb-6 mt-6 font-power tracking-wide text-slate-900">
                Journaux
            </h1>

            <button @click="toggleSort"
                class="flex items-center gap-2 mb-8 text-slate-900 font-bold text-sm cursor-pointer hover:opacity-70 transition-opacity mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="10" y1="6" y2="6" />
                    <line x1="4" x2="16" y1="18" y2="18" />
                </svg>
                <span>
                    {{ sortMethod === 'alpha' ? "Tri alphabétique (A-Z)" : "Tri par nombre d'entrées" }}
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

                    <NuxtLink v-if="!item.isUnknown" :to="`/stories/${item.friendshipId}`"
                        class="block group cursor-pointer transition-transform hover:scale-105">
                        <JournalCard :name="item.name" :image="item.image" :current-level="item.level"
                            :max-level="item.maxLevel" :is-unknown="false" />
                    </NuxtLink>

                    <div v-else class="block opacity-100 cursor-default">
                        <JournalCard :name="item.name" :image="item.image" :current-level="item.level"
                            :max-level="item.maxLevel" :is-unknown="true" />
                    </div>

                </template>
            </div>

        </main>
    </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { useStrapiClient } from '#imports';
import { useGuildStore } from '~/stores/guild';

// Stores & Clients
const guildStore = useGuildStore();
const client = useStrapiClient();

// États
const loading = ref(true);
const error = ref(null);
const sortMethod = ref('alpha'); // 'alpha' (par défaut) ou 'entries'

// Données brutes
const allNpcs = ref([]);
const myFriendships = ref([]);

onMounted(async () => {
    loading.value = true;
    try {
        if (!guildStore.hasGuild) await guildStore.fetchGuild();

        // 1. On lance les deux requêtes en parallèle pour aller plus vite
        const [npcsRes, friendshipsRes] = await Promise.all([
            // Récupérer TOUS les NPCs de la base
            client('/npcs', { params: { pagination: { limit: 100 } } }),
            // Récupérer MES amitiés
            client('/friendships', { params: { populate: ['npc'] } })
        ]);

        // Extraction des données (Compatible v4/v5)
        allNpcs.value = Array.isArray(npcsRes.data) ? npcsRes.data : (npcsRes || []);
        myFriendships.value = Array.isArray(friendshipsRes.data) ? friendshipsRes.data : (friendshipsRes || []);

    } catch (e) {
        console.error('Erreur chargement journaux:', e);
        error.value = "Impossible de charger les journaux.";
    } finally {
        loading.value = false;
    }
});

// --- LOGIQUE DE FUSION ET DE TRI ---
const sortedJournals = computed(() => {
    if (allNpcs.value.length === 0) return [];

    const journals = allNpcs.value.map(npcObj => {
        // 1. On récupère les données proprement
        const npc = npcObj.attributes || npcObj;

        // Au lieu de l'ID numérique instable, on utilise le documentId
        const npcDocId = npcObj.documentId || npc.documentId;

        // 2. Recherche de l'amitié correspondante via documentId
        const linkedFriendship = myFriendships.value.find(f => {
            const fData = f.attributes || f;
            const fNpc = fData.npc?.data || fData.npc;

            if (!fNpc) return false;

            // LA CLEF DU SUCCÈS EST ICI 🗝️
            // On compare les chaînes de caractères documentId (ex: "nlivv26...")
            // Si documentId n'existe pas (vieux Strapi), on se rabat sur l'id classique
            if (fNpc.documentId && npcDocId) {
                return fNpc.documentId === npcDocId;
            }
            return fNpc.id == npc.id;
        });

        // --- Le reste ne change pas ---
        const friendshipData = linkedFriendship ? (linkedFriendship.attributes || linkedFriendship) : null;

        const maxEntries = (npc.quests_entry_available || 0) + (npc.expedition_entry_available || 0);
        const finalMax = maxEntries > 0 ? maxEntries : 4;

        const currentEntries = friendshipData
            ? (friendshipData.quests_entry_unlocked || 0) + (friendshipData.expedition_entry_unlocked || 0)
            : 0;

        const isUnlocked = !!linkedFriendship && currentEntries > 0;

        // 1. On récupère les infos de base
        const firstName = npc.firstname || npc.firstName || npc.first_name || 'Inconnu';
        const lastName = npc.lastname || npc.lastName || npc.last_name || '';
        const realName = `${firstName} ${lastName}`.trim();
        const realImage = getLocalImage(firstName);

        // 2. On décide quoi afficher selon l'état
        let displayName = "???";
        let displayImage = realImage;

        if (isUnlocked) {
            // Si débloqué, on affiche le vrai nom
            displayName = realName;
        }

        return {
            id: npc.id,
            friendshipId: linkedFriendship?.id,
            name: displayName,
            level: currentEntries,
            maxLevel: finalMax,
            image: displayImage,
            isUnknown: !isUnlocked
        };
    });

    // Tri
    const unlocked = journals.filter(j => !j.isUnknown);
    const locked = journals.filter(j => j.isUnknown);

    if (sortMethod.value === 'alpha') {
        unlocked.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        unlocked.sort((a, b) => b.level - a.level);
    }

    return [...unlocked, ...locked];
});

// Fonction utilitaire pour changer le tri
const toggleSort = () => {
    sortMethod.value = sortMethod.value === 'alpha' ? 'entries' : 'alpha';
};

// Fonction image (inchangée)
const getLocalImage = (name) => {
    if (!name || name === 'Inconnu') return '/assets/default-avatar.png';
    const safeName = name.trim();
    return `/assets/npc/${safeName}/${safeName}.png`;
};
</script>