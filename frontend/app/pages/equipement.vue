<template>
  <div class="min-h-screen bg-gray-100 font-sans">
    
    <AppHeader />

    <main class="px-4 pt-4 pb-24 w-full max-w-5xl mx-auto">
      
      <h1 class="text-3xl font-bold text-center mb-8 mt-4 font-pixel">Équipement</h1>

      <div v-if="characterStore.loading" class="text-center py-10 font-pixel text-xl text-gray-500">
        Chargement de vos héros...
      </div>

      <div v-else-if="characterStore.error" class="text-center py-10 text-red-500 font-bold">
        {{ characterStore.error }}
      </div>

      <div v-else>
        <CharacterRow 
          v-for="perso in formattedCharacters" 
          :key="perso.id"
          :characterName="perso.name"
          :characterImage="perso.avatar"
          :items="perso.equippedItems"
        />
        
        <div v-if="formattedCharacters.length === 0" class="text-center text-gray-400 mt-10">
          Aucun personnage trouvé.
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { useCharacterStore } from '~/stores/character';
import { useGuildStore } from '~/stores/guild'; // Import du guild store

// Initialisation des stores
const characterStore = useCharacterStore();
const guildStore = useGuildStore();

// Configuration
const config = useRuntimeConfig(); 
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';

onMounted(() => {
  // 1. Charger les personnages avec leurs items (via character.ts)
  if (!characterStore.hasCharacters) {
    characterStore.fetchCharacters();
  }

  // 2. Charger les infos de la guilde (Or, Exp...) pour le Header (via guild.ts)
  // On utilise fetchGuild() (léger) ou fetchAll() selon tes besoins
  if (!guildStore.hasGuild) {
    guildStore.fetchGuild(); 
  }
});

// --- Transformation des données (Mapping) ---
const formattedCharacters = computed(() => {
  return characterStore.characters.map(char => {
    const c = char.attributes || char;
    
    return {
      id: char.id,
      name: c.name,
      avatar: getImageUrl(c.avatar),
      items: c.items, // On passe l'objet brut à la fonction mapItems
      equippedItems: mapItems(c.items)
    }
  });
});

const mapItems = (itemsData) => {
  const rawItems = itemsData?.data || itemsData || [];
  
  return rawItems.map(itemObj => {
    const item = itemObj.attributes || itemObj;
    
    const rawTags = item.tags?.data || item.tags || [];
    const tagList = rawTags.map(t => (t.attributes?.name || t.name || '').toLowerCase());
    
    // Sécurisation de la rareté
    let rarityVal = 'common';
    if (item.rarity) {
       // Gère cas: relation peuplée ou objet simple
       rarityVal = item.rarity.data?.attributes?.name || item.rarity.name || item.rarity;
    }

    return {
      level: item.level || 1,
      rarity: String(rarityVal).toLowerCase(), // Force string
      category: item.category || 'Weapon',
      image: getImageUrl(item.image),
      types: tagList
    }
  });
};

const getImageUrl = (imgData) => {
  if (!imgData) return '/assets/default-avatar.png';
  const data = imgData.data?.attributes || imgData.attributes || imgData;
  const url = data?.url;
  
  if (!url) return '/assets/default-avatar.png';
  if (url.startsWith('/')) return `${strapiUrl}${url}`;
  return url;
};
</script>

<style scoped>
.font-pixel {
  font-family: 'Jersey 10', sans-serif;
}
</style>