<template>
  <transition name="slide-up">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex flex-col">
      
      <div class="absolute inset-0 bg-gray-100/95 backdrop-blur-sm" @click="closeModal"></div>

      <div class="relative flex flex-col h-full w-full max-w-lg mx-auto pointer-events-none">
        
        <OverlayHeader :title="headerTitle" @close="closeModal" />

        <div class="pointer-events-auto px-4 py-2">
          <TopPanelEquip 
            v-if="currentMode === 'normal'"
            :character="character"
            :activeSlot="activeSlot"
            @change-slot="changeSlot"
          />

          <TopPanelRecycle 
            v-else-if="currentMode === 'recycle'"
            :count="itemsToRecycle.size"
            :gain="totalScrapGain"
          />

          <TopPanelUpgrade 
            v-else-if="currentMode === 'upgrade'"
            :item="selectedItemObject"
            :userGold="guildStore.gold"
            :userScrap="guildStore.scrap"
            :cost="upgradeCost"
            :stats="projectedStats"
            :increment="upgradeIncrement"
            :canAfford="canAffordUpgrade"
            @set-increment="setUpgradeIncrement"
            @set-max="setMaxUpgrade"
          />
        </div>

        <InventoryGrid
          v-model:sortBy="sortBy"
          :items="filteredItems"
          :loading="loading"
          :activeTag="activeTag"
          :availableTags="availableTags"
          :isRecycleMode="currentMode === 'recycle'"
          :selectedId="selectedItemId"
          :selectedRecycleIds="itemsToRecycle"
          @toggle-tag="toggleTag"
          @item-click="handleItemClick"
        />

        <ActionFooter 
          :mode="currentMode"
          :hasSelection="!!selectedItemId"
          :canRecycle="itemsToRecycle.size > 0"
          :canAffordUpgrade="canAffordUpgrade"
          :newLevel="projectedStats.newLevel"
          @equip="handleEquip"
          @toggle-recycle="toggleRecycleMode"
          @confirm-recycle="confirmRecycle"
          @toggle-upgrade="toggleUpgradeMode"
          @confirm-upgrade="confirmUpgrade"
        />

      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGuildStore } from '~/stores/guild'
import { useInventoryStore } from '~/stores/inventory'
import { useDamageCalculator } from '~/composables/useDamageCalculator'
import { useFooterVisibility } from '~/composables/useFooterVisibility'

import OverlayHeader from './equipment/OverlayHeader.vue'
import InventoryGrid from './equipment/InventoryGrid.vue'
import ActionFooter from './equipment/ActionFooter.vue'
import TopPanelEquip from './equipment/TopPanelEquip.vue'
import TopPanelRecycle from './equipment/TopPanelRecycle.vue'
import TopPanelUpgrade from './equipment/TopPanelUpgrade.vue'

const props = defineProps({
  isOpen: Boolean,
  character: Object,
  initialSlot: String,
  allInventory: Array,
  loading: Boolean
})
const emit = defineEmits(['close', 'equip'])

const guildStore = useGuildStore()
const inventoryStore = useInventoryStore()
const client = useStrapiClient()
const { calculateItemPower } = useDamageCalculator()
const { hideFooter, showFooter } = useFooterVisibility()

const activeSlot = ref('weapon');
const selectedItemId = ref(null);
const sortBy = ref('rarity');
const activeTag = ref(null);
const isRecycleMode = ref(false);
const itemsToRecycle = ref(new Set()); 
const isUpgradeMode = ref(false);
const upgradeIncrement = ref(1);

const availableTags = ['nature', 'history', 'science', 'art', 'make', 'society'];
const rarityWeight = { legendary: 4, epic: 3, rare: 2, common: 1, basic: 0 };

const currentMode = computed(() => {
    if (isRecycleMode.value) return 'recycle';
    if (isUpgradeMode.value) return 'upgrade';
    return 'normal';
});

const headerTitle = computed(() => {
    if (currentMode.value === 'recycle') return 'Recyclage';
    if (currentMode.value === 'upgrade') return 'Amélioration';
    return 'Équipement';
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.initialSlot) activeSlot.value = props.initialSlot
    resetAllModes()
    hideFooter() // Masquer le footer quand l'overlay s'ouvre
  } else {
    showFooter() // Réafficher le footer quand l'overlay se ferme
  }
})

const closeModal = () => { 
  resetAllModes()
  showFooter() // Réafficher le footer à la fermeture
  emit('close')
}
const resetAllModes = () => {
    selectedItemId.value = null;
    isRecycleMode.value = false;
    isUpgradeMode.value = false;
    itemsToRecycle.value.clear();
    upgradeIncrement.value = 1;
};
const changeSlot = (slot) => {
  if (currentMode.value !== 'normal') return; 
  activeSlot.value = slot;
  activeTag.value = null;
  selectedItemId.value = null;
};
const toggleTag = (tag) => { activeTag.value = activeTag.value === tag ? null : tag; };

const handleItemClick = (item) => {
    if (isRecycleMode.value) {
        if (itemsToRecycle.value.has(item.id)) itemsToRecycle.value.delete(item.id);
        else itemsToRecycle.value.add(item.id);
        return;
    }
    selectNewItem(item);
};
const selectNewItem = (item) => {
  selectedItemId.value = selectedItemId.value === item.id ? null : item.id;
  if(isUpgradeMode.value) upgradeIncrement.value = 1;
};
const toggleRecycleMode = () => {
    isRecycleMode.value = !isRecycleMode.value;
    isUpgradeMode.value = false; 
    itemsToRecycle.value.clear();
    selectedItemId.value = null;
};
const toggleUpgradeMode = () => {
    isUpgradeMode.value = !isUpgradeMode.value;
    isRecycleMode.value = false; 
    selectedItemId.value = null;
    upgradeIncrement.value = 1;
};

// --- LOGIQUE RECYCLAGE ---
const calculateScrapForOneItem = (item) => {
    const level = item.level || 1;
    const damage = item.index_damage || 0;
    let rarityMult = 1;
    switch(item.rarity?.toLowerCase()) {
        case 'basic': rarityMult = 1; break; case 'common': rarityMult = 2; break; case 'rare': rarityMult = 5; break; case 'epic': rarityMult = 10; break; case 'legendary': rarityMult = 20; break;
    }
    return Math.floor((level * rarityMult) + (damage / 2));
};
const totalScrapGain = computed(() => {
    let total = 0;
    itemsToRecycle.value.forEach(id => {
        const item = props.allInventory.find(i => i.id === id);
        if (item) total += calculateScrapForOneItem(item);
    });
    return total;
});
const confirmRecycle = async () => {
    if (itemsToRecycle.value.size === 0) return;
    try {
        const scrapAmount = totalScrapGain.value;
        const idsToUpdate = Array.from(itemsToRecycle.value);
        for (const id of idsToUpdate) {
            const item = props.allInventory.find(i => i.id === id);
            if (!item) continue;
            const apiId = item.documentId || item.id;
            await client(`/items/${apiId}`, { method: 'PUT', body: { data: { isScrapped: true, character: null } } });
        }
        if (guildStore.guild) {
            const currentScrap = guildStore.scrap || 0;
            const guildApiId = guildStore.guild.documentId || guildStore.guild.id;
            await client(`/guilds/${guildApiId}`, { method: 'PUT', body: { data: { scrap: currentScrap + scrapAmount } } });
            await guildStore.refetchStats();
        }
        inventoryStore.items.forEach(item => {
            if (itemsToRecycle.value.has(item.id)) item.isScrapped = true; 
        });
        resetAllModes();
    } catch (e) { console.error("Erreur recyclage", e); }
};

// --- LOGIQUE AMÉLIORATION ---
const selectedItemObject = computed(() => {
    if (!selectedItemId.value) return null;
    return props.allInventory.find(i => i.id === selectedItemId.value);
});
const getLevelCost = (level, rarity) => {
    let rarityMult = 1;
    switch(rarity?.toLowerCase()) {
        case 'common': rarityMult = 1.5; break; case 'rare': rarityMult = 3; break; case 'epic': rarityMult = 6; break; case 'legendary': rarityMult = 10; break;
    }
    return { scrap: Math.floor(5 * level * rarityMult), gold: Math.floor(50 * level * rarityMult) };
};
const upgradeCost = computed(() => {
    if (!selectedItemObject.value) return { scrap: 0, gold: 0 };
    const currentLevel = selectedItemObject.value.level || 1;
    const rarity = selectedItemObject.value.rarity;
    let totalScrap = 0, totalGold = 0;
    for (let i = 0; i < upgradeIncrement.value; i++) {
        const lvlCost = getLevelCost(currentLevel + i, rarity);
        totalScrap += lvlCost.scrap; totalGold += lvlCost.gold;
    }
    return { scrap: totalScrap, gold: totalGold };
});
const projectedStats = computed(() => {
    if (!selectedItemObject.value) return { newLevel: 0, damageGain: 0 };
    const item = selectedItemObject.value;
    const currentDmg = calculateItemPower(item);
    const futureDmg = calculateItemPower({ ...item, level: item.level + upgradeIncrement.value });
    return { newLevel: item.level + upgradeIncrement.value, damageGain: futureDmg - currentDmg };
});
const canAffordUpgrade = computed(() => {
    return (guildStore.gold || 0) >= upgradeCost.value.gold && (guildStore.scrap || 0) >= upgradeCost.value.scrap;
});
const setUpgradeIncrement = (val) => { upgradeIncrement.value = val; };
const setMaxUpgrade = () => {
    if (!selectedItemObject.value) return;
    const userGold = guildStore.gold || 0, userScrap = guildStore.scrap || 0;
    const currentLevel = selectedItemObject.value.level || 1, rarity = selectedItemObject.value.rarity;
    let possibleLevels = 0, currentCostScrap = 0, currentCostGold = 0;
    for (let i = 0; i < 1000; i++) {
        const nextLvlCost = getLevelCost(currentLevel + i, rarity);
        if (currentCostScrap + nextLvlCost.scrap <= userScrap && currentCostGold + nextLvlCost.gold <= userGold) {
            currentCostScrap += nextLvlCost.scrap; currentCostGold += nextLvlCost.gold; possibleLevels++;
        } else break;
    }
    upgradeIncrement.value = possibleLevels > 0 ? possibleLevels : 1; 
};
const confirmUpgrade = async () => {
    if (!selectedItemObject.value || !canAffordUpgrade.value) return;
    try {
        const item = selectedItemObject.value;
        const apiId = item.documentId || item.id;
        const cost = upgradeCost.value;
        const newLevel = projectedStats.value.newLevel;
        if (guildStore.guild) {
            const guildApiId = guildStore.guild.documentId || guildStore.guild.id;
            await client(`/guilds/${guildApiId}`, { method: 'PUT', body: { data: { gold: guildStore.gold - cost.gold, scrap: guildStore.scrap - cost.scrap } } });
            await guildStore.refetchStats();
        }
        await client(`/items/${apiId}`, { method: 'PUT', body: { data: { level: newLevel } } });
        const localItem = inventoryStore.items.find(i => i.id === item.id);
        if (localItem) { localItem.level = newLevel; if (localItem.attributes) localItem.attributes.level = newLevel; }
        upgradeIncrement.value = 1;
    } catch (e) { console.error("Erreur upgrade", e); }
};

// --- LOGIQUE STANDARD ---
const handleEquip = () => {
  if (!selectedItemId.value) return;
  const itemToEquip = props.allInventory.find(i => i.id === selectedItemId.value);
  if (itemToEquip) { emit('equip', itemToEquip); selectedItemId.value = null; }
};

// Dans components/EquipmentOverlay.vue

// --- FILTRAGE ET TRI ---
const filteredItems = computed(() => {
  if (!props.allInventory) return [];
  
  let items = props.allInventory.filter(item => {
    // 1. Filtrer les items recyclés
    const isNotScrapped = !item.isScrapped;

    // 2. Filtrer par slot (Arme, Armure...)
    const isCategoryMatch = (item.category || item.slot || '').toLowerCase() === activeSlot.value.toLowerCase();

    // 3. NOUVEAU : Vérifier si l'objet est déjà équipé par QUICONQUE
    // On doit regarder dans l'inventoryStore car 'item' (formatted) n'a pas l'info du propriétaire
    const rawItem = inventoryStore.items.find(i => i.id === item.id);
    let isEquipped = false;
    
    if (rawItem) {
        const attrs = rawItem.attributes || rawItem;
        
        // Strapi renvoie soit un ID (si non populé), soit un objet { data: ... } (si populé)
        // S'il y a une donnée dans 'character', c'est que l'item est pris
        if (attrs.character) {
             // Cas Strapi v4 populated
             if (attrs.character.data) isEquipped = true;
             // Cas Strapi v4 ID simple ou Strapi v5
             else if (typeof attrs.character === 'number' || attrs.character.id) isEquipped = true;
        }
    }
    
    // On garde l'item seulement si :
    // - C'est la bonne catégorie
    // - Il n'est PAS équipé (ni par moi, ni par les autres)
    // - Il n'est pas recyclé
    return isCategoryMatch && !isEquipped && isNotScrapped;
  });

  // Filtrage par Tag (Nature, Art...)
  if (activeTag.value) {
      items = items.filter(item => item.types && item.types.includes(activeTag.value.toLowerCase()));
  }
  
  // Tri
  return items.sort((a, b) => {
    if (sortBy.value === 'damage') {
        const dmgA = calculateItemPower(a);
        const dmgB = calculateItemPower(b);
        if (dmgA === dmgB) return b.level - a.level; return dmgB - dmgA;
    }
    if (sortBy.value === 'level') return b.level - a.level;
    const weightA = rarityWeight[a.rarity?.toLowerCase()] || 0, weightB = rarityWeight[b.rarity?.toLowerCase()] || 0;
    if (weightB === weightA) return b.level - a.level; return weightB - weightA;
  });
});
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(20px); }
</style>