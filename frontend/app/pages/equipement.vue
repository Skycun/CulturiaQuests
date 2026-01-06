<template>
  <div class="min-h-screen bg-gray-100 font-sans">
    
    <AppHeader />

    <main class="px-4 pt-4 pb-24 w-full max-w-5xl mx-auto">
      <h1 class="text-2xl font-bold text-center mb-8 mt-4 font-power">Équipement</h1>

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
          @click-item="(item) => openOverlay(perso, item)" 
        />
        
        <div v-if="formattedCharacters.length === 0" class="text-center text-gray-400 mt-10">
          Aucun personnage trouvé.
        </div>
      </div>
    </main>

    <EquipmentOverlay 
      :is-open="showOverlay"
      :character="selectedCharacter"
      :initial-slot="selectedSlot"
      :all-inventory="formattedInventory" 
      :loading="isOverlayLoading"
      @close="showOverlay = false"
      @equip="handleEquipItem" 
    />

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useCharacterStore } from '~/stores/character';
import { useGuildStore } from '~/stores/guild';
import { useInventoryStore } from '~/stores/inventory';

// --- CONFIGURATION ---
const characterStore = useCharacterStore();
const guildStore = useGuildStore();
const inventoryStore = useInventoryStore();
const config = useRuntimeConfig(); 
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';

// --- ÉTAT LOCAL ---
const showOverlay = ref(false);
const isOverlayLoading = ref(false);
const selectedCharacter = ref(null);
const selectedSlot = ref('weapon'); 

// --- LIFECYCLE ---
onMounted(async () => {
  await characterStore.fetchCharacters(true);
  if (!guildStore.hasGuild) guildStore.fetchGuild();
});

// --- GESTION OVERLAY ---
const openOverlay = async (character, item) => {
  selectedCharacter.value = character;
  selectedSlot.value = item.category || 'weapon'; 
  showOverlay.value = true;
  
  // On lance un fetch frais pour être sûr d'avoir le bon inventaire
  isOverlayLoading.value = true;
  try {
    await inventoryStore.fetchItems();
  } catch (e) {
    console.error("Erreur inventaire :", e);
  } finally {
    isOverlayLoading.value = false;
  }
};

// --- LOGIQUE D'ÉQUIPEMENT (SWAP + API) ---
const handleEquipItem = async (newItemMapped) => {
  // 1. Trouver l'item NEUF dans le store (Données brutes)
  const newItemIndex = inventoryStore.items.findIndex(i => i.id === newItemMapped.id);
  if (newItemIndex === -1) return;
  const newItemRaw = inventoryStore.items[newItemIndex];

  // 2. Trouver le PERSONNAGE dans le store
  const charIndex = characterStore.characters.findIndex(c => c.id === selectedCharacter.value.id);
  if (charIndex === -1) return;
  const characterRaw = characterStore.characters[charIndex];
  
  // Gestion de la structure Strapi (attributes vs racine)
  const charData = characterRaw.attributes || characterRaw;
  let charItemsArray = Array.isArray(charData.items) ? charData.items : (charData.items?.data || []);

  // 3. Identifier l'ANCIEN item (celui à déséquiper)
  const categoryToSwap = newItemMapped.category.toLowerCase();
  const oldItemIndex = charItemsArray.findIndex(i => {
     const iAttr = i.attributes || i;
     const iSlot = iAttr.slot || iAttr.category || '';
     return iSlot.toLowerCase() === categoryToSwap;
  });
  
  let oldItemRaw = null;
  if (oldItemIndex !== -1) {
    oldItemRaw = charItemsArray[oldItemIndex];
  }

  // --- MISE À JOUR VISUELLE IMMÉDIATE (Store Local) ---
  
  // A. Retirer le nouvel item de l'inventaire global
  inventoryStore.items.splice(newItemIndex, 1);

  // B. Gestion de l'ancien item
  if (oldItemRaw) {
    // Note: On ne le push PAS dans inventoryStore.items ici pour éviter les doublons visuels,
    // car le fetchItems ou la logique backend s'en chargera (ou au prochain reload).
    
    // On le retire du personnage localement
    charItemsArray.splice(oldItemIndex, 1);
  }

  // C. Ajouter le nouvel item au personnage localement
  charItemsArray.push(newItemRaw);
  
  // D. Appliquer les changements à la structure Pinia (pour la réactivité)
  if (characterRaw.attributes) {
      if (characterRaw.attributes.items && characterRaw.attributes.items.data) {
          characterRaw.attributes.items.data = charItemsArray;
      } else {
          characterRaw.attributes.items = charItemsArray;
      }
  } else {
      characterRaw.items = charItemsArray;
  }

  // E. Mettre à jour `selectedCharacter` pour que l'overlay se rafraîchisse
  const updatedCharUI = formattedCharacters.value.find(c => c.id === selectedCharacter.value.id);
  if (updatedCharUI) {
    selectedCharacter.value = updatedCharUI;
  }

  // --- SAUVEGARDE EN BASE DE DONNÉES (API) ---
  await saveEquipmentChange(characterRaw.id, newItemRaw.id, oldItemRaw?.id);
};

// Fonction pour envoyer les requêtes PUT à Strapi
const saveEquipmentChange = async (characterId, newItemId, oldItemId) => {
  try {
    // 1. Récupération du Token (Gestion compatible Cookie ou Module Strapi)
    let token = useCookie('strapi_jwt').value; 
    // Si tu utilises le module @nuxtjs/strapi, décommente la ligne suivante :
    // const { token: moduleToken } = useStrapiToken() || {}; if(moduleToken) token = moduleToken;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    console.log(`💾 Sauvegarde équipement... Token: ${!!token}`);

    // 2. DÉSÉQUIPER l'ancien objet (si il existe) -> character: null
    if (oldItemId) {
      const resOld = await fetch(`${strapiUrl}/api/items/${oldItemId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: { character: null } })
      });
      if (!resOld.ok) console.error("Erreur déséquipement", await resOld.json());
    }

    // 3. ÉQUIPER le nouvel objet -> character: ID du perso
    const resNew = await fetch(`${strapiUrl}/api/items/${newItemId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ data: { character: characterId } })
    });
    
    if (!resNew.ok) {
        const err = await resNew.json();
        console.error("❌ Erreur API (403 probable) :", err);
        // alert("Erreur de sauvegarde : Vérifie tes permissions Strapi");
    } else {
        console.log("✅ Équipement sauvegardé en BDD !");
    }

  } catch (error) {
    console.error("💥 Erreur réseau sauvegarde :", error);
  }
};

// --- MAPPERS & COMPUTED ---

const getImageUrl = (imgData) => {
  if (!imgData) return '/assets/default-avatar.png';
  const data = imgData.data?.attributes || imgData.attributes || imgData;
  const url = data?.url;
  if (!url) return '/assets/default-avatar.png';
  if (url.startsWith('/')) return `${strapiUrl}${url}`;
  return url;
};

const mapSingleItem = (itemObj) => {
   if (!itemObj) return null;
   const item = itemObj.attributes || itemObj;
   const rawTags = item.tags?.data || item.tags || [];
   const tagList = rawTags.map(t => (t.attributes?.name || t.name || '').toLowerCase());

   let rarityVal = 'common';
   if (item.rarity) {
      rarityVal = item.rarity.data?.attributes?.name || item.rarity.name || item.rarity;
   }

   return {
     id: item.id,
     level: item.level || 1,
     // 🔥 CORRECTION ICI : Ajout du mapping des dégâts
     index_damage: item.index_damage || 0,
     rarity: String(rarityVal).toLowerCase(),
     category: item.slot || 'weapon',
     image: getImageUrl(item.icon),
     types: tagList
   };
};

const formattedInventory = computed(() => {
  const allItems = inventoryStore.items || [];
  return allItems.map(mapSingleItem).filter(i => i !== null);
});

const formattedCharacters = computed(() => {
  return characterStore.characters.map(char => {
    const c = char.attributes || char;
    return {
      id: char.id,
      name: `${c.firstname || ''} ${c.lastname || ''}`.trim(),
      avatar: getImageUrl(c.icon),
      equippedItems: mapItems(c.items)
    };
  });
});

const mapItems = (itemsData) => {
  const rawItems = (itemsData?.data) ? itemsData.data : (itemsData || []);
  return rawItems.map(mapSingleItem).filter(i => i !== null);
};
</script>

<style scoped>
.font-pixel { font-family: 'Jersey 10', sans-serif; }
.font-power { font-family: 'Montserrat', sans-serif; }
</style>