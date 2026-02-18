<template>
    <div class="flex flex-col min-h-screen bg-black text-white pb-20">
        <div v-if="loading" class="flex items-center justify-center h-screen">
            <div class="text-amber-400 font-pixel text-2xl animate-pulse">Chargement du profil...</div>
        </div>

        <div v-else-if="error" class="flex flex-col items-center justify-center h-screen px-4 text-center">
            <h1 class="text-red-500 font-power text-3xl mb-4">Erreur</h1>
            <p class="text-gray-400 mb-6">{{ error }}</p>
            <PixelButton variant="filled" color="darker-red" @click="router.back()">
                Retour
            </PixelButton>
        </div>

        <template v-else>
            <div class="relative h-[60vh] w-full flex flex-col items-center justify-between overflow-hidden">
                <img 
                    src="/assets/Guilde.png" alt="Guilde Background"
                    class="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-50">

                <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black z-0" />

                <!-- Back Button -->
                <button
                    class="absolute top-[env(safe-area-inset-top)] left-6 z-20 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 active:scale-95 border border-white/20"
                    @click="router.back()"
                >
                    <Icon name="mdi:arrow-left" class="w-6 h-6 text-white drop-shadow-lg" />
                </button>

                <!-- Top Content -->
                <div class="relative z-10 flex flex-col items-center mt-16 pt-[env(safe-area-inset-top)] text-center w-full px-4">
                    <h1 class="font-power text-4xl tracking-wide text-amber-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                        Inspection
                    </h1>
                    <h2 class="font-pixel text-2xl text-white mt-2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                        {{ guildName }}
                    </h2>
                    <div class="mt-2 text-sm text-gray-400 font-pixel">
                        Propriétaire: {{ ownerName }}
                    </div>
                </div>
            </div>

            <div class="px-4 py-8 bg-black -mt-20 relative z-10">

                <!-- Characters Section -->
                <div class="mb-8">
                    <h3 class="font-power text-2xl mb-4 text-center text-white">Ses Héros</h3>
                    <div class="space-y-4">
                        <CharacterRow 
                            v-for="char in formattedCharacters"
                            :key="char.id"
                            :characterName="char.name"
                            :characterImage="char.avatar"
                            :items="char.equippedItems"
                        />
                    </div>
                </div>

                <BadgeShowcase 
                    :equipped-badges="mappedBadges" 
                    :readonly="true"
                />
                <!-- Note: Badges collection is not yet populated in backend response properly or user didn't ask for specific badge logic on inspect aside from 'badges displayed'. 
                     Assuming 'equipped badges' logic is similar to own profile but read-only. 
                     For now passing empty array or need to extract from guild data if available.
                     My backend populate didn't explicitly include 'badges'. 
                     I should have checked if guild has 'badges' relation. 
                     The prompt said: "badges affiché par le joueur".
                     Usually badges are on User or Guild.
                     I'll assume they are not available for now or I'd need to update backend.
                     Let's check backend if badges are on guild.
                -->

                <div class="space-y-4">
                    <h3 class="font-power text-2xl mb-6 text-center text-white">
                        Statistiques
                    </h3>

                    <div class="space-y-2">
                        <GuildStatRow 
                            v-for="(stat, index) in displayStats" 
                            :key="index"
                            :icon="stat.icon"
                            :label="stat.label"
                            :value="stat.value"
                        />
                    </div>
                    
                    <div class="text-center mt-8 font-onest">
                        <div class="text-gray-500 text-sm">
                            Compte actif depuis {{ accountDays }} jours
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Stores
import { useGuildStore } from '~/stores/guild'

// Composants
import PixelButton from '~/components/form/PixelButton.vue'
import GuildStatRow from '~/components/guild/GuildStatRow.vue'
import BadgeShowcase from '~/components/guild/BadgeShowcase.vue'
import CharacterRow from '~/components/CharacterRow.vue'

// Composables
import { useItemMapper } from '~/composables/useItemMapper'
import { formatCompactNumber } from '~/utils/format'

const route = useRoute()
const router = useRouter()
const guildStore = useGuildStore()
const { getImageUrl, mapItems } = useItemMapper()

const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
    const guildId = route.query.id as string;
    if (!guildId) {
        error.value = "Identifiant de guilde manquant";
        loading.value = false;
        return;
    }

    try {
        await guildStore.fetchPublicGuild(guildId);
    } catch (e) {
        error.value = "Impossible de charger le profil (Non ami ou inexistant)";
    } finally {
        loading.value = false;
    }
})

const inspectedGuild = computed(() => guildStore.inspectedGuild)

const guildName = computed(() => inspectedGuild.value?.name || inspectedGuild.value?.attributes?.name || 'Inconnu')
const ownerName = computed(() => inspectedGuild.value?.user?.username || inspectedGuild.value?.attributes?.user?.data?.attributes?.username || '')

// Helper for deep access
const getAttr = (obj: any, key: string) => obj?.[key] ?? obj?.attributes?.[key];

const formattedCharacters = computed(() => {
    if (!inspectedGuild.value) return [];
    
    // Access characters array
    const charsData = inspectedGuild.value.characters?.data || inspectedGuild.value.characters || [];
    
    return charsData.map((char: any) => {
        const c = char.attributes || char;
        return {
            id: char.id,
            name: `${c.firstname || ''} ${c.lastname || ''}`.trim(),
            avatar: getImageUrl(c.icon),
            equippedItems: mapItems(c.items)
        };
    });
});

const mappedBadges = computed(() => {
    if (!inspectedGuild.value) return [];
    
    // Access equipped_badges array
    const badgesData = inspectedGuild.value.equipped_badges?.data || inspectedGuild.value.equipped_badges || [];
    
    return badgesData.map((badge: any) => {
        const b = badge.attributes || badge;
        return {
            id: badge.id,
            image: getImageUrl(b.image)
        };
    });
});

const stats = computed(() => inspectedGuild.value?.stats || {});

const accountDays = computed(() => stats.value.accountDays || 0);

const displayStats = computed(() => {
    const s = stats.value;
    const guildExp = s.totalExp || 0;
    const level = Math.floor(Math.sqrt(guildExp / 75)) + 1;

    // Helper to format large numbers if needed, reusing logic from store or local
    const fmt = (val: number) => {
        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
        return Math.floor(val).toString();
    };

    // Format time
    const ms = s.totalTime || 0;
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const timeFmt = `${hours}h ${minutes}m`;

    return [
        {
            icon: 'game-icons:medieval-barracks',
            label: 'Nombre total d'expéditions',
            value: s.totalExpeditions || 0,
        },
        {
            icon: 'game-icons:hourglass',
            label: 'Temps total en expédition',
            value: timeFmt,
        },
        {
            icon: 'game-icons:broadsword',
            label: 'Dégâts totaux en expédition',
            value: fmt(s.totalDamage || 0),
        },
        {
            icon: 'game-icons:3d-stairs',
            label: 'Étage maximal atteint',
            value: s.maxFloor || 0,
        },
        {
            icon: 'game-icons:open-chest',
            label: 'Total coffres ouverts',
            value: s.totalPoiVisits || 0,
        },
        {
            icon: 'game-icons:direction-signs',
            label: 'POI unique visités',
            value: s.totalDistinctPois || 0,
        },
        {
            icon: 'game-icons:hanging-sign',
            label: 'POI le plus visité',
            value: s.mostVisitedPoiName || 'Aucun',
        },
        {
            icon: 'game-icons:cardboard-box-closed',
            label: 'Total d'items collectés',
            value: s.totalItemsCollected || 0,
        },
        {
            icon: 'game-icons:recycle',
            label: 'Total d'items recyclés',
            value: s.totalItemsScrapped || 0,
        },
        {
            icon: 'game-icons:metal-bar',
            label: 'Total de scrap accumulé',
            value: s.totalScrapAccumulated || 0,
        },
        {
            icon: 'game-icons:coins',
            label: 'Or Total Accumulé',
            value: s.totalGold || 0,
        },
        {
            icon: 'game-icons:queen-crown',
            label: 'Expérience Totale',
            value: fmt(s.totalExp || 0),
        },
        {
            icon: 'game-icons:bookmarklet',
            label: 'Niveau Guilde',
            value: level,
        }
    ];
});
</script>

<style scoped>
/* Les styles sont gérés via Tailwind */
</style>
