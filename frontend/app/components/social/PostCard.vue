<template>
  <div class="bg-white p-5 rounded-[30px] shadow-sm mb-4">
    
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
            <img :src="post.authorAvatar || '/assets/default-avatar.png'" class="w-full h-full object-cover" />
        </div>
        <div>
          <h3 class="font-bold text-slate-800 leading-none">{{ post.authorName }}</h3>
          <p class="text-xs text-gray-400 font-bold mt-0.5 uppercase tracking-wide">{{ post.location }} • {{ post.timeAgo }}</p>
        </div>
      </div>
      <button class="text-gray-300 hover:text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
      </button>
    </div>

    <div class="bg-gray-50 rounded-2xl p-4 mb-4 flex items-center gap-4">
        <div class="w-16 h-16 bg-white rounded-xl shadow-sm p-1.5 shrink-0">
            <img :src="post.museumImage" class="w-full h-full object-contain pixelated" />
        </div>
        <div>
            <p class="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Lieu visité</p>
            <h4 class="font-power font-bold text-slate-800 leading-tight">{{ post.museumName }}</h4>
        </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
        <div class="bg-orange-50/50 rounded-2xl p-3 flex flex-col justify-center items-center text-center border border-orange-100">
            <div class="w-8 h-8 mb-1 relative">
                <img :src="post.bestLootImage" class="w-full h-full object-contain pixelated drop-shadow-sm" />
                <div class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white" :class="rarityColor(post.bestLootRarity)"></div>
            </div>
            <span class="text-[10px] font-bold text-orange-400 uppercase">Meilleur Loot</span>
            <span class="font-bold text-xs text-slate-700 truncate w-full px-1">{{ post.bestLootName }}</span>
        </div>

        <div class="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col justify-center items-center shadow-sm">
             <span class="text-[10px] font-bold text-gray-400 uppercase mb-1">Temps passé</span>
             <span class="font-pixel text-2xl text-slate-800">{{ post.duration }}</span>
        </div>

        <div class="bg-indigo-50 border border-indigo-100 rounded-full py-2 px-4 flex items-center justify-center gap-2">
            <div class="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">★</div>
            <span class="font-bold text-indigo-700 text-sm uppercase">Palier {{ post.tier }}</span>
        </div>

        <div class="bg-green-50 border border-green-100 rounded-full py-2 px-4 flex items-center justify-center gap-2">
            <span class="text-sm">{{ post.reactionIcon }}</span>
            <span class="font-bold text-green-700 text-xs">{{ post.reactionText }}</span>
        </div>
    </div>

    <div class="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3">
        <button 
            @click="toggleLike"
            class="flex items-center gap-1.5 transition-colors group"
            :class="isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'"
        >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                class="h-6 w-6 transition-transform group-active:scale-75" 
                :class="{ 'animate-heartbeat': animateHeart }"
                :fill="isLiked ? 'currentColor' : 'none'" 
                viewBox="0 0 24 24" 
                :stroke="isLiked ? 'currentColor' : 'currentColor'"
            >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span class="text-sm font-bold" :class="isLiked ? 'text-red-500' : 'text-gray-500'">{{ localLikes }}</span>
        </button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
});

// --- ÉTAT LOCAL DU LIKE ---
const isLiked = ref(false);
const localLikes = ref(0);
const animateHeart = ref(false);

// Initialiser avec les données du parent
onMounted(() => {
    // Si tu as un champ 'hasLiked' dans le futur, tu pourras l'utiliser ici
    isLiked.value = props.post.hasLiked || false; 
    localLikes.value = props.post.likes || 0;
});

const toggleLike = () => {
    isLiked.value = !isLiked.value;
    
    if (isLiked.value) {
        localLikes.value++;
        triggerAnimation();
        // Plus tard : await api.likePost(props.post.id)
    } else {
        localLikes.value--;
        // Plus tard : await api.unlikePost(props.post.id)
    }
};

const triggerAnimation = () => {
    animateHeart.value = true;
    setTimeout(() => {
        animateHeart.value = false;
    }, 300); // Durée de l'animation
};

const rarityColor = (rarity) => {
    switch(rarity) {
        case 'legendary': return 'bg-yellow-400';
        case 'epic': return 'bg-purple-400';
        case 'rare': return 'bg-blue-400';
        case 'common': return 'bg-green-400';
        default: return 'bg-gray-400';
    }
};
</script>

<style scoped>
.pixelated { image-rendering: pixelated; }
.font-pixel { font-family: 'Jersey 10', sans-serif; }
.font-power { font-family: 'Montserrat', sans-serif; }

/* Petite animation bonus pour le like */
@keyframes heartbeat {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
.animate-heartbeat {
  animation: heartbeat 0.3s ease-in-out;
}
</style>