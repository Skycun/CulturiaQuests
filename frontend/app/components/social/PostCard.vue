<template>
  <div class="bg-white p-5 rounded-[30px] shadow-sm mb-4 transition-all duration-300 hover:shadow-md border border-gray-50 relative">
    
    <!-- Menu Dropdown -->
    <div v-if="showMenu" class="absolute top-12 right-5 bg-white border border-gray-100 shadow-xl rounded-2xl py-2 z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-200">
        <button @click="openEditModal" class="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Modifier
        </button>
        <button @click="openDeleteModal" class="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Supprimer
        </button>
    </div>

    <!-- Modal de Modification -->
    <Teleport to="body">
        <transition name="fade">
            <div v-if="showEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
                <div class="bg-[#F8F9FF] rounded-[40px] p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-bold text-slate-800 font-power">Modifier le post</h3>
                        <button @click="showEditModal = false" class="text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <!-- Toggle Loot -->
                    <div v-if="post.bestLootId" 
                         @click="editedShowLoot = !editedShowLoot"
                         class="mb-6 p-4 rounded-3xl transition-all cursor-pointer flex items-center justify-between"
                         :class="editedShowLoot ? 'bg-orange-50/50' : 'bg-white opacity-60'"
                    >
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-slate-700 text-sm">Afficher le loot</span>
                        </div>
                        <div class="w-10 h-5 rounded-full transition-colors relative" :class="editedShowLoot ? 'bg-orange-400' : 'bg-gray-200'">
                            <div class="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all" :class="editedShowLoot ? 'left-6' : 'left-0.5'"></div>
                        </div>
                    </div>

                    <!-- Tags Selection -->
                    <div class="mb-8">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Choisir vos tags</span>
                            <span class="text-[10px] font-bold" :class="editedTags.length === 5 ? 'text-green-500' : 'text-slate-400'">{{ editedTags.length }} / 5</span>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button 
                                v-for="tag in allAvailableTags" :key="tag"
                                @click="toggleEditedTag(tag)"
                                class="px-3 py-1.5 rounded-full border-2 text-[10px] font-bold transition-all shadow-sm"
                                :class="editedTags.includes(tag) ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-100'"
                            >
                                {{ tag }}
                            </button>
                        </div>
                    </div>

                    <PixelButton color="indigo" @click="handleUpdate" :disabled="isUpdating" class="w-full !mt-0">
                        {{ isUpdating ? 'Mise à jour...' : 'Enregistrer' }}
                    </PixelButton>
                </div>
            </div>
        </transition>
    </Teleport>

    <!-- Modal de Suppression -->
    <Teleport to="body">
        <transition name="fade">
            <div v-if="showDeleteModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                <div class="bg-white rounded-[40px] p-8 w-full max-sm shadow-2xl animate-in zoom-in-95 duration-300">
                    <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 text-center mb-2 font-power">Supprimer le post ?</h3>
                    <p class="text-gray-500 text-center text-sm mb-8 font-onest">Cette action est irréversible.</p>
                    <div class="flex flex-col gap-3">
                        <PixelButton color="red" @click="handleDelete" class="w-full !mt-0">Supprimer</PixelButton>
                        <button @click="showDeleteModal = false" class="py-3 text-sm font-bold text-slate-400 hover:text-slate-600 uppercase font-power tracking-widest">Annuler</button>
                    </div>
                </div>
            </div>
        </transition>
    </Teleport>

    <!-- Post Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shadow-inner shrink-0 aspect-square">
            <img 
                :src="post.authorAvatar || '/assets/user/placeholder_pdp.jpg'" 
                class="w-full h-full object-cover" 
                @error="(e) => e.target.src = '/assets/user/placeholder_pdp.jpg'"
            />
        </div>
        <div class="min-w-0">
          <h3 class="font-bold text-slate-800 leading-none text-sm truncate">{{ post.authorName }}</h3>
          <p class="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider truncate">{{ post.location }} • {{ post.timeAgo }}</p>
        </div>
      </div>
      <button v-if="isAuthor" @click.stop="showMenu = !showMenu" class="text-gray-300 hover:text-gray-500 transition-colors p-1 shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
      </button>
    </div>

    <!-- Museum Info -->
    <div class="bg-gray-50 rounded-2xl p-4 mb-4 flex items-center gap-4 border border-gray-100/50">
        <div class="w-14 h-14 bg-white rounded-xl shadow-sm p-1.5 shrink-0 flex items-center justify-center border border-white">
            <img :src="post.museumImage" class="w-full h-full object-contain pixelated" />
        </div>
        <div class="min-w-0">
            <p class="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5 opacity-80">Lieu visité</p>
            <h4 class="font-power font-bold text-slate-800 leading-tight text-sm truncate">{{ post.museumName }}</h4>
        </div>
    </div>

    <!-- Bento Stats -->
    <div class="grid gap-2.5" :class="activeStats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'">
        <div v-for="stat in activeStats" :key="stat.key" 
             class="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col justify-center items-center shadow-sm text-center relative overflow-hidden"
             :class="stat.key === 'bestLoot' ? [rarityColor(stat.rarity), 'border-none'] : ''"
        >
            <template v-if="stat.key === 'bestLoot'">
                <div class="w-10 h-10 mb-1 relative flex items-center justify-center">
                    <img :src="stat.image || '/assets/charm2.png'" class="w-full h-full object-contain pixelated drop-shadow-md" />
                    <span v-if="stat.power" class="absolute -bottom-1 -right-1 font-pixel text-white text-[10px] text-shadow-outline leading-none">
                        {{ stat.power }}
                    </span>
                </div>
                <span class="text-[8px] font-bold text-white/90 uppercase tracking-tighter">Loot</span>
            </template>
            <template v-else>
                <span class="text-[9px] font-bold text-gray-400 uppercase mb-1 tracking-tight">{{ stat.label }}</span>
                <span class="font-pixel text-slate-800 leading-none" :class="activeStats.length === 3 ? 'text-xl' : 'text-2xl'">{{ stat.value }}</span>
            </template>
        </div>
    </div>

    <!-- Tags Display -->
    <div class="mt-4 flex flex-wrap gap-1.5">
        <div v-for="tag in post.tags" :key="tag" 
             class="bg-green-50 border border-green-100 rounded-full py-1.5 px-3 flex items-center shadow-sm"
        >
            <span class="font-bold text-green-700 text-[10px] whitespace-nowrap">{{ tag }}</span>
        </div>
    </div>

    <!-- Footer Likes -->
    <div class="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3">
        <button @click="toggleLike" class="flex items-center gap-2 transition-all group p-1 -ml-1 rounded-lg hover:bg-red-50" :class="isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform group-active:scale-75" :class="{ 'animate-heartbeat': animateHeart }" :fill="isLiked ? 'currentColor' : 'none'" viewBox="0 0 24 24" :stroke="isLiked ? 'currentColor' : 'currentColor'">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span class="text-xs font-bold">{{ localLikes }}</span>
        </button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useDamageCalculator } from '~/composables/useDamageCalculator';
import PixelButton from '~/components/form/PixelButton.vue';
import { formatCompactNumber } from '~/utils/format';

const props = defineProps({
  post: { type: Object, required: true }
});

const emit = defineEmits(['delete', 'edit', 'refresh']);

const { calculateItemPower } = useDamageCalculator();
const user = useStrapiUser();
const client = useStrapiClient();

// --- ÉTATS ---
const isLiked = ref(false);
const localLikes = ref(0);
const animateHeart = ref(false);
const showMenu = ref(false);
const showDeleteModal = ref(false);
const showEditModal = ref(false);
const isUpdating = ref(false);

const editedShowLoot = ref(true);
const editedTags = ref([]);

const staticFeelings = ["❤️ Coup de cœur", "🏆 Nouveau record", "🏛️ Lieu magnifique", "🧠 Très enrichissant", "🍀 Bonne fortune"];

// --- HELPERS ---
const formatValue = (num) => formatCompactNumber(num);

const isAuthor = computed(() => {
    if (!user.value || !props.post.authorId) return false;
    const currentUserId = user.value.documentId || user.value.id;
    return currentUserId === props.post.authorId;
});

const allAvailableTags = computed(() => {
    const dynamic = [
        `⚔️ ${formatValue(props.post.rawTotalDamage)} Dégâts`, 
        `💰 ${formatValue(props.post.rawGold)} Or`, 
        `✨ ${formatValue(props.post.rawXp)} XP` 
    ];
    return [...dynamic, ...staticFeelings];
});

const activeStats = computed(() => {
    const list = [
        { key: 'duration', label: 'Temps', value: props.post.duration },
        { key: 'threshold', label: 'Palier', value: `${props.post.tier}` }
    ];
    if (props.post.showLoot) {
        let lootPower = 0;
        if (props.post.bestLootDamage) {
            const powerVal = calculateItemPower({ 
                index_damage: props.post.bestLootDamage, 
                level: props.post.bestLootLevel, 
                rarity: props.post.bestLootRarity 
            });
            lootPower = formatValue(powerVal);
        }

        list.push({ 
            key: 'bestLoot', 
            label: 'Loot', 
            value: props.post.bestLootName, 
            image: props.post.bestLootImage, 
            rarity: props.post.bestLootRarity, 
            power: lootPower 
        });
    }
    return list;
});

const closeMenuListener = () => { if (showMenu.value) showMenu.value = false; };

onMounted(() => {
    isLiked.value = props.post.hasLiked || false; 
    localLikes.value = props.post.likes || 0;
    window.addEventListener('click', closeMenuListener);
});

onUnmounted(() => { window.removeEventListener('click', closeMenuListener); });

const openEditModal = () => {
    editedShowLoot.value = props.post.showLoot !== false;
    editedTags.value = [...props.post.tags];
    showMenu.value = false;
    showEditModal.value = true;
};

const toggleEditedTag = (tag) => {
    if (editedTags.value.includes(tag)) {
        editedTags.value = editedTags.value.filter(t => t !== tag);
    } else {
        if (editedTags.value.length < 5) editedTags.value.push(tag);
        else { editedTags.value.shift(); editedTags.value.push(tag); }
    }
};

const handleUpdate = async () => {
    isUpdating.value = true;
    try {
        await client(`/posts/${props.post.id}`, {
            method: 'PUT',
            body: {
                data: {
                    show_loot: editedShowLoot.value,
                    tags: editedTags.value,
                    best_loot: props.post.bestLootId || null
                }
            }
        });
        showEditModal.value = false;
        emit('refresh');
    } catch (error) {
        alert("Erreur lors de la mise à jour.");
    } finally {
        isUpdating.value = false;
    }
};

const openDeleteModal = () => { showMenu.value = false; showDeleteModal.value = true; };

const handleDelete = async () => {
    try {
        await client(`/posts/${props.post.id}`, { method: 'DELETE' });
        showDeleteModal.value = false;
        emit('refresh');
    } catch (error) {
        alert("Erreur lors de la suppression.");
    }
};

const toggleLike = async () => {
    const prev = isLiked.value; const prevL = localLikes.value;
    isLiked.value = !isLiked.value;
    if (isLiked.value) { localLikes.value++; triggerAnimation(); } else { localLikes.value--; }
    try {
        const res = await client(`/posts/${props.post.id}/toggle-like`, { method: 'POST' });
        if (res && typeof res.likes === 'number') { localLikes.value = res.likes; isLiked.value = res.liked; }
    } catch (error) { isLiked.value = prev; localLikes.value = prevL; }
};

const triggerAnimation = () => { animateHeart.value = true; setTimeout(() => animateHeart.value = false, 300); };

const rarityColor = (r) => {
    switch (r?.toLowerCase()) {
        case 'legendary': return 'bg-gradient-to-b from-yellow-300 to-amber-500';
        case 'epic': return 'bg-gradient-to-b from-fuchsia-400 to-purple-600'; 
        case 'rare': return 'bg-gradient-to-b from-sky-400 to-blue-600';
        case 'common': return 'bg-gradient-to-b from-green-400 to-emerald-600';
        case 'basic': return 'bg-gradient-to-b from-gray-300 to-gray-500';
        default: return 'bg-gray-100';
    }
};
</script>

<style scoped>
.pixelated { image-rendering: pixelated; }
.font-pixel { font-family: 'Jersey 10', sans-serif; }
.font-power { font-family: 'Montserrat', sans-serif; }
.text-shadow-outline { text-shadow: -1px 0 #000, 0 1px #000, 1px 0 #000, 0 -1px #000, 1px 1px #000, -1px -1px #000; }
@keyframes heartbeat { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
.animate-heartbeat { animation: heartbeat 0.3s ease-in-out; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>