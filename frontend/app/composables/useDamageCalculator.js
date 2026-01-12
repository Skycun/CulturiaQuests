// composables/useDamageCalculator.js

export const useDamageCalculator = () => {

    // --- CONSTANTES ---
    // Centralisées ici : si tu changes l'équilibrage, ça change partout.
    const RARITY_MULTIPLIERS = {
        basic: 1,
        common: 1.5,
        rare: 2,
        epic: 3,
        legendary: 5 
    };

    // --- FONCTION DE CALCUL ---
    /**
     * Calcule les dégâts d'un objet unique
     * @param {Object} item - L'objet contenant { index_damage, level, rarity }
     * @returns {Number} Les dégâts calculés (entier)
     */
    const calculateItemPower = (item) => {
        if (!item) return 0;

        // 1. Sécurisation des données (pour éviter les crashs ou les "NaN")
        const base = Number(item.index_damage) || 0;
        const level = Number(item.level) || 1;
        
        // Gestion de la rareté (String ou Objet Strapi)
        let rarityKey = 'common';
        if (typeof item.rarity === 'string') {
            rarityKey = item.rarity.toLowerCase();
        } else if (item.rarity?.data?.attributes?.name) {
            rarityKey = item.rarity.data.attributes.name.toLowerCase();
        } else if (item.rarity?.name) {
            rarityKey = item.rarity.name.toLowerCase();
        }

        // 2. Récupération du multiplicateur
        const multiplier = RARITY_MULTIPLIERS[rarityKey] || 1;

        // 3. LA Formule
        return Math.floor(base * level * multiplier);
    };

    /**
     * Calcule la puissance totale d'une liste d'objets
     * @param {Array} items - Liste d'objets
     * @returns {Number} Somme totale
     */
    const calculateTotalPower = (items) => {
        if (!items || !Array.isArray(items)) return 0;
        return items.reduce((total, item) => total + calculateItemPower(item), 0);
    };

    return {
        RARITY_MULTIPLIERS,
        calculateItemPower,
        calculateTotalPower
    };
};