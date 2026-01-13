import { computed } from 'vue';
import { useDamageCalculator } from './useDamageCalculator'; // Assure-toi que le chemin est correct

export function useExpeditionLogic(characters, currentExpedition) {
    
    // --- IMPORT DU CALCULATEUR ---
    const { calculateItemPower } = useDamageCalculator();

    // --- CONSTANTS ---
    const BASE_DIFFICULTY = 500; 
    const SCALING_FACTOR = 1.5; 
    
    // Tableau étendu jusqu'à 24 objets (4 équipes complètes)
    const SYNERGY_BONUS = [
        1.0, 1.1, 1.2, 1.3, 1.5, 1.75, 2.0, 
        2.25, 2.5, 2.75, 3.0, 3.5, 4.0, 
        4.5, 5.0, 5.5, 6.0, 7.0, 8.0, 
        9.0, 10.0, 11.0, 12.0, 13.5, 15.0 
    ];

    // --- HELPERS ---
    const formatNumber = (num) => {
        if(!num) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return Math.floor(num).toString();
    };

    // --- COMPUTED LOGIC ---

    // 1. Raw Damage (On utilise calculateItemPower du composable)
    const rawTotalDamage = computed(() => {
        let total = 0;
        if (!characters.value) return 0;
        
        characters.value.forEach(char => {
            const items = char.equippedItems || []; 
            items.forEach(item => {
                // Utilisation du composable centralisé
                total += calculateItemPower(item);
            });
        });
        return total;
    });

    // 2. Synergy Count (Reste identique, compte les types correspondants)
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

    // 4. Final Score (C'est en réalité le DPS Final)
    const finalScore = computed(() => {
        return Math.floor(rawTotalDamage.value * globalMultiplier.value);
    });

    // 5. Infinite Tier Calculation (Basé sur le Score/DPS instantané)
    // NOTE: Si tu utilises la logique "Idle" (totalDamageDealt qui monte avec le temps),
    // cette partie sert juste à calculer le "potentiel" ou le palier théorique instantané.
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