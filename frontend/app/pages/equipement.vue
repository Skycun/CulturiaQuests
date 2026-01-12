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
          v-for="perso in formattedCharacters" :key="perso.id" :characterName="perso.name"
          :characterImage="perso.avatar" :items="perso.equippedItems"
          @click-item="(item) => openOverlay(perso, item)" />

        <div v-if="formattedCharacters.length === 0" class="text-center text-gray-400 mt-10">
          Aucun personnage trouvé.
        </div>
      </div>
    </main>

    <EquipmentOverlay
      :is-open="showOverlay" :character="selectedCharacter" :initial-slot="selectedSlot"
      :all-inventory="formattedInventory" :loading="isOverlayLoading" @close="showOverlay = false"
      @equip="handleEquipItem" />

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

  // 3. Identifier l'ANCIEN item sur le personnage
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

  // --- MISE À JOUR VISUELLE (Store Local) ---

  // A. Mise à jour du PERSONNAGE (C'est le plus important)
  // On retire l'ancien item du perso et on met le nouveau.
  if (oldItemIndex !== -1) {
    charItemsArray.splice(oldItemIndex, 1);
  }
  charItemsArray.push(newItemRaw);

  // B. IMPORTANT : On ne touche PAS à inventoryStore.items !
  // L'inventaire contient TOUS les items. C'est le computed 'filteredItems' dans l'overlay
  // qui décide d'afficher ou masquer un item selon s'il est équipé par le perso sélectionné.
  // En mettant à jour le perso (étape A), le filtre va automatiquement :
  // - Masquer le nouvel item (car désormais équipé)
  // - Afficher l'ancien item (car désormais libre)

  // C. Appliquer les changements à la structure Pinia (Réactivité)
  if (characterRaw.attributes) {
    if (characterRaw.attributes.items && characterRaw.attributes.items.data) {
      characterRaw.attributes.items.data = charItemsArray;
    } else {
      characterRaw.attributes.items = charItemsArray;
    }
  } else {
    characterRaw.items = charItemsArray;
  }

  // D. Rafraîchir l'overlay
  const updatedCharUI = formattedCharacters.value.find(c => c.id === selectedCharacter.value.id);
  if (updatedCharUI) {
    selectedCharacter.value = updatedCharUI;
  }

  // --- SAUVEGARDE EN BASE DE DONNÉES (API) ---
  const characterApiId = characterRaw.documentId || characterRaw.id;
  const newItemApiId = newItemRaw.documentId || newItemRaw.id;
  const oldItemApiId = oldItemRaw ? (oldItemRaw.documentId || oldItemRaw.id) : null;

  await saveEquipmentChange(characterApiId, newItemApiId, oldItemApiId);
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
    documentId: item.documentId,
    level: item.level || 1,
    index_damage: item.index_damage || 0,
    rarity: String(rarityVal).toLowerCase(),
    category: item.slot || 'weapon',
    image: getImageUrl(item.icon),
    types: tagList,
    // IMPORTANT POUR LE RECYCLAGE
    isScrapped: item.isScrapped || false
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

<style scoped>
.font-pixel {
  font-family: 'Jersey 10', sans-serif;
}

.font-power {
  font-family: 'Montserrat', sans-serif;
}
</style>