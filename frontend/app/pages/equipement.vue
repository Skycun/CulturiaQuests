<template>
  <div class="min-h-screen bg-gray-100 font-sans">
    
    <AppHeader />

    <main class="px-4 pt-4 pb-24 w-full max-w-5xl mx-auto">
      <h1 class="text-2xl text-center mb-8 mt-4 font-power">Équipement</h1>

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
// 1. IMPORT DU COMPOSABLE DE DÉGÂTS
import { useDamageCalculator } from '~/composables/useDamageCalculator';

// --- CONFIGURATION ---
const characterStore = useCharacterStore();
const guildStore = useGuildStore();
const inventoryStore = useInventoryStore();
const config = useRuntimeConfig(); 
const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';

// 2. RÉCUPÉRATION DE LA FONCTION DE CALCUL
const { calculateItemPower } = useDamageCalculator();

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

// --- LOGIQUE D'ÉQUIPEMENT (SWAP + REFETCH) ---
const handleEquipItem = async (newItemMapped) => {
  // On active le chargement pour éviter les clics multiples
  isOverlayLoading.value = true;

  try {
      // 1. Récupération des IDs nécessaires
      const charIndex = characterStore.characters.findIndex(c => c.id === selectedCharacter.value.id);
      if (charIndex === -1) return;
      const characterRaw = characterStore.characters[charIndex];
      const charData = characterRaw.attributes || characterRaw;
      
      // Trouver l'item actuel sur le slot (pour le déséquiper)
      const currentItems = Array.isArray(charData.items) ? charData.items : (charData.items?.data || []);
      const categoryToSwap = newItemMapped.category.toLowerCase();
      
      const oldItemRaw = currentItems.find(i => {
         const iAttr = i.attributes || i;
         const iSlot = iAttr.slot || iAttr.category || '';
         return iSlot.toLowerCase() === categoryToSwap;
      });

      // IDs pour l'API
      const characterApiId = characterRaw.documentId || characterRaw.id;
      const newItemApiId = newItemMapped.documentId || newItemMapped.id;
      const oldItemApiId = oldItemRaw ? (oldItemRaw.documentId || oldItemRaw.id) : null;

      // 2. Appel API (Sauvegarde en BDD)
      await saveEquipmentChange(characterApiId, newItemApiId, oldItemApiId);

      // 3. REFETCH (C'est ici que ton problème se règle)
      // On recharge l'inventaire pour que Strapi nous dise : "Cet ancien item est maintenant libre"
      // On recharge aussi les persos pour voir le nouvel item équipé
      await Promise.all([
          inventoryStore.fetchItems(),       // Met à jour isEquipped pour l'overlay
          characterStore.fetchCharacters(true) // Met à jour le perso en dessous
      ]);

      // 4. Rafraîchir la sélection locale (pour que l'affichage se mette à jour)
      const updatedCharUI = formattedCharacters.value.find(c => c.id === selectedCharacter.value.id);
      if (updatedCharUI) {
        selectedCharacter.value = updatedCharUI;
      }

  } catch (error) {
      console.error("Erreur lors de l'équipement :", error);
  } finally {
      isOverlayLoading.value = false;
  }
};

// --- FONCTION API (Utilisation de useStrapiClient) ---
const saveEquipmentChange = async (characterId, newItemId, oldItemId) => {
  // Le client Strapi gère automatiquement l'URL API et le Token d'auth
  const client = useStrapiClient();

  try {
    console.log(`💾 Sauvegarde équipement en cours...`);

    // 1. DÉSÉQUIPER l'ancien objet (si il existe)
    if (oldItemId) {
      await client(`/items/${oldItemId}`, {
        method: 'PUT',
        body: { data: { character: null } }
      });
    }

    // 2. ÉQUIPER le nouvel objet
    await client(`/items/${newItemId}`, {
      method: 'PUT',
      body: { data: { character: characterId } }
    });

    console.log("✅ Équipement sauvegardé avec succès !");

  } catch (error) {
    console.error("❌ Erreur API Strapi :", error);
    if (error.error) console.error("Détail Strapi :", error.error);
    throw error; // On relance l'erreur pour qu'elle soit attrapée par handleEquipItem
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

   // 3. UTILISATION DU COMPOSABLE pour calculer la puissance
   // Utile pour afficher "Puissance: 450" ou pour le tri
   const calculatedPower = calculateItemPower({
       index_damage: item.index_damage,
       level: item.level,
       rarity: rarityVal
   });

   return {
     id: item.id,
     documentId: item.documentId, 
     level: item.level || 1,
     index_damage: item.index_damage || 0,
     rarity: String(rarityVal).toLowerCase(),
     category: item.slot || 'weapon',
     image: getImageUrl(item.icon),
     types: tagList,
     isScrapped: item.isScrapped || false,
     power: calculatedPower // Ajout de la puissance calculée
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
      documentId: c.documentId,
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