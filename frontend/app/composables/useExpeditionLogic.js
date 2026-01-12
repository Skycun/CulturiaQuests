// composables/useExpeditionLogic.js
import { computed } from 'vue';

export function useExpeditionLogic(characters, currentExpedition) {
    
    // --- CONSTANTS ---
    const BASE_DIFFICULTY = 500; 
    const SCALING_FACTOR = 1.5; 
    const SYNERGY_BONUS = [1.0, 1.1, 1.2, 1.3, 1.5, 1.75, 2.0];

    // --- HELPERS ---
    const formatNumber = (num) => {
        if(!num) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return Math.floor(num).toString();
    };

    const calculateItemRawDamage = (item) => {
        if (!item) return 0;
        const base = item.index_damage || 0;
        const lvl = item.level || 1;
        let multiplier = 1;
        
        const rarityStr = typeof item.rarity === 'string' ? item.rarity : (item.rarity?.name || 'common');
        
        switch (rarityStr.toLowerCase()) {
            case 'basic': multiplier = 1; break;
            case 'common': multiplier = 1.5; break;
            case 'rare': multiplier = 2; break;
            case 'epic': multiplier = 3; break;
            case 'legendary': multiplier = 3; break;
        }
        return Math.floor(base * lvl * multiplier);
    };

    // --- COMPUTED LOGIC ---

    // 1. Raw Damage (Sum of all items on all characters)
    const rawTotalDamage = computed(() => {
        let total = 0;
        if (!characters.value) return 0;
        
        characters.value.forEach(char => {
            // Check if items are already mapped or raw from store
            const items = char.equippedItems || []; 
            items.forEach(item => {
                total += calculateItemRawDamage(item);
            });
        });
        return total;
    });

    // 2. Synergy Count
    const matchingCount = computed(() => {
        let count = 0;
        if (!characters.value || !currentExpedition.value) return 0;
        
        const typeExp = currentExpedition.value.type.toLowerCase();
        
        characters.value.forEach(char => {
            const items = char.equippedItems || [];
            items.forEach(item => {
                if (item.types && item.types.includes(typeExp)) {
                    count++;
                }
            });
        });
        return count;
    });

    // 3. Global Multiplier
    const globalMultiplier = computed(() => {
        const index = Math.min(matchingCount.value, SYNERGY_BONUS.length - 1);
        return SYNERGY_BONUS[index];
    });

    // 4. Final Score
    const finalScore = computed(() => {
        return Math.floor(rawTotalDamage.value * globalMultiplier.value);
    });

    // 5. Infinite Tier Calculation
    const infiniteTierInfo = computed(() => {
        const score = finalScore.value;

        if (score < BASE_DIFFICULTY) {
            return {
                tier: 1,
                nextThreshold: BASE_DIFFICULTY,
                progress: (score / BASE_DIFFICULTY) * 100
            };
        }

        const ratio = score / BASE_DIFFICULTY;
        const tierIndex = Math.floor(Math.log(ratio) / Math.log(SCALING_FACTOR));
        const currentTier = tierIndex + 2; 

        const currentThreshold = Math.floor(BASE_DIFFICULTY * Math.pow(SCALING_FACTOR, tierIndex));
        const nextThreshold = Math.floor(BASE_DIFFICULTY * Math.pow(SCALING_FACTOR, tierIndex + 1));

        const range = nextThreshold - currentThreshold;
        const valueInRange = score - currentThreshold;
        const progress = Math.max(0, Math.min((valueInRange / range) * 100, 100));

        return {
            tier: currentTier,
            nextThreshold: nextThreshold,
            progress: progress
        };
    });

    return {
        rawTotalDamage,
        matchingCount,
        globalMultiplier,
        finalScore,
        infiniteTierInfo,
        formatNumber
    };
}