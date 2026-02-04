<template>
  <div class="min-h-screen bg-gray-100 font-sans pb-24">
    
    <header class="sticky top-0 z-50 p-4 bg-gray-100/90 backdrop-blur-sm">
      <div class="bg-white rounded-[30px] shadow-sm p-4 pl-6 flex justify-between items-center">
        
        <h1 class="text-2xl font-bold text-slate-800">Social</h1>

        <button 
          v-if="!isQuizDone" 
          @click="goToQuiz" 
          class="flex items-center gap-3 cursor-pointer group hover:bg-orange-50 px-3 py-1.5 rounded-full transition-all"
        >
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 text-orange-500 drop-shadow-sm group-hover:scale-110 transition-transform">
              <path fill-rule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clip-rule="evenodd" />
            </svg>
            <span class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
          </div>
          <span class="font-bold text-slate-700 group-hover:text-orange-600 transition">Quiz du jour</span>
        </button>

        <div 
          v-else 
          class="flex items-center gap-3 px-3 py-1.5 rounded-full bg-yellow-50/50"
        >
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 text-yellow-500 drop-shadow-sm">
              <path fill-rule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clip-rule="evenodd" />
            </svg>
            <div class="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-yellow-600">
                <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <span class="font-bold text-yellow-700">Série en cours !</span>
        </div>
      </div>
    </header>
    <main class="px-4 space-y-4 pt-2">
        <PostCard 
            v-for="post in posts" 
            :key="post.id" 
            :post="post" 
        />
        
        <div v-if="posts.length === 0" class="text-center py-10 text-gray-400">
            <p>Aucun post pour le moment...</p>
            <p class="text-sm mt-1">Soyez le premier à partager une aventure !</p>
        </div>
    </main>

    <div class="fixed bottom-24 right-4 z-40">
        <button 
            @click="router.push('/createpost')"
            class="w-14 h-14 bg-[#4D4DFF] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#3d3ddb] transition-transform hover:scale-105 active:scale-95 group"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
        </button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
// Import du composant PostCard (Assure-toi de l'avoir créé dans components/social/)
import PostCard from '~/components/social/PostCard.vue'; 

const router = useRouter();

// --- ÉTAT DU QUIZ ---
const isQuizDone = ref(false); 

onMounted(() => {
    // Simulation : on peut imaginer récupérer ça du store
    console.log("État du quiz du jour :", isQuizDone.value ? "Fait ✅" : "À faire 🔥");
});

const goToQuiz = () => {
    // Redirection vers la page quiz (à créer si elle n'existe pas)
    // router.push('/quiz');
    
    // Pour la démo, on le passe à 'fait' au clic
    isQuizDone.value = true; 
};

// --- DONNÉES DES POSTS (Simulées) ---
// À terme, tu récupéreras ça de ton API / Store Social
const posts = ref([
    {
        id: 1,
        authorName: "Utilisateur Random",
        authorAvatar: "/assets/default-avatar.png",
        location: "Saint-Lô",
        timeAgo: "2h",
        museumName: "Musée d'art et d'histoire de Saint-Lô",
        museumImage: "/assets/musee.png",
        bestLootName: "Anneau de Valognes",
        bestLootImage: "/assets/charm2.png",
        bestLootRarity: "legendary",
        duration: "13:12",
        tier: 18,
        reactionIcon: "⚡",
        reactionText: "Vitesse +12%",
        likes: 12
    },
    {
        id: 2,
        authorName: "Jeanne d'Arcade",
        authorAvatar: "/assets/default-avatar.png",
        location: "Caen",
        timeAgo: "5h",
        museumName: "Abbaye aux Hommes",
        museumImage: "/assets/musee.png", // Image placeholder
        bestLootName: "Sceptre de Guillaume",
        bestLootImage: "/assets/weapon2.png",
        bestLootRarity: "epic",
        duration: "04:45",
        tier: 22,
        reactionIcon: "❤️",
        reactionText: "Coup de cœur",
        likes: 45
    }
]);
</script>

<style scoped>
.shadow-sm {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
</style>