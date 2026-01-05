<template>
    <div class="min-h-screen bg-gray-100 font-sans pb-24">

        <AppHeader />

        <main class="px-4 w-full max-w-lg mx-auto">

            <h1 class="text-3xl font-black text-center mb-6 mt-6 font-power tracking-wide text-slate-900">
                Journaux
            </h1>

            <div class="flex items-center gap-2 mb-8 text-slate-900 font-bold text-sm cursor-pointer hover:opacity-70">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="10" y1="6" y2="6" />
                    <line x1="4" x2="16" y1="18" y2="18" />
                </svg>
                <span>Tri par nombre d'entrées</span>
            </div>

            <div v-if="friendshipStore.loading" class="text-center py-10 font-pixel text-xl text-gray-500">
                Chargement des amitiés...
            </div>

            <div v-else-if="friendshipStore.error" class="text-center py-10 text-red-500 font-bold">
                {{ friendshipStore.error }}
            </div>

            <div v-else class="grid grid-cols-3 gap-y-10 gap-x-2">
                <NuxtLink 
                    v-for="journal in formattedJournals" 
                    :key="journal.id"
                    :to="`/stories/${journal.id}`" 
                    class="block"
                >
                    <JournalCard :name="journal.name" :image="journal.image" :current-level="journal.level"
                        :max-level="journal.maxLevel" :is-unknown="journal.isUnknown" />
                </NuxtLink>
                <div v-if="formattedJournals.length === 0" class="col-span-3 text-center text-gray-400 mt-10">
                    Vous n'avez rencontré personne pour le moment.
                </div>
            </div>

        </main>
    </div>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { useFriendshipStore } from '~/stores/friendship';
import { useGuildStore } from '~/stores/guild';

const friendshipStore = useFriendshipStore();
const guildStore = useGuildStore();

onMounted(async () => {
    if (!guildStore.hasGuild) await guildStore.fetchGuild();
    await friendshipStore.fetchFriendships();
});

// --- Transformation des données ---
const formattedJournals = computed(() => {
    const journals = friendshipStore.friendships.map(f => {
        // Gestion de la structure Strapi (attributes ou direct)
        const npc = f.npc?.attributes || f.npc;

        // Récupération des noms
        const firstName = npc?.firstname || 'Inconnu';
        const lastName = npc?.lastname || '';
        const fullName = `${firstName} ${lastName}`.trim();

        // Calcul des niveaux (comme vu précédemment)
        const maxEntries = (npc?.quests_entry_available || 0) + (npc?.expedition_entry_available || 0);
        const finalMaxLevel = maxEntries > 0 ? maxEntries : 4;
        const currentEntries = (f.quests_entry_unlocked || 0) + (f.expedition_entry_unlocked || 0);

        return {
            id: f.id,
            name: fullName,
            level: currentEntries,
            maxLevel: finalMaxLevel,
            // C'est ICI que ça change : on appelle la fonction locale
            image: getLocalImage(firstName),
            isUnknown: false
        };
    });
    return journals;
});

// --- Nouvelle fonction pour les images locales ---
const getLocalImage = (firstName) => {
    if (!firstName || firstName === 'Inconnu') {
        return '/assets/default-avatar.png'; // Image de repli
    }

    // Nettoyage du nom pour éviter les erreurs (ex: espaces accidentels)
    // On suppose que le nom du dossier est exactement le Prénom (ex: "Malori")
    const safeName = firstName.trim();

    // Construction du chemin: /assets/npc/[Nom]/[Nom].png
    return `/assets/npc/${safeName}/${safeName}.png`;
};
</script>

<style scoped>
/* Import des polices spécifiques si elles ne sont pas globales */
.font-power {
    font-family: 'Power Grotesk', 'Arial Black', sans-serif;
    /* Exemple, à adapter selon ton CSS global */
}

.font-pixel {
    font-family: 'Jersey 10', sans-serif;
}
</style>