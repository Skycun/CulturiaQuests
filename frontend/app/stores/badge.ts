// stores/badge.ts
import { defineStore } from 'pinia'

export const useBadgeStore = defineStore('badge', {
  state: () => ({
    // Simulation des données (à remplacer par ton API Strapi plus tard)
    badges: [
      { id: 1, name: "Explorateur Normand", image: "/assets/badges/normandy.png", category: 'region', unlocked: true, equipped: true },
      { id: 2, name: "Roi de Saint-Lô", image: "/assets/badges/stlo.png", category: 'comcom', unlocked: true, equipped: true },
      { id: 3, name: "Collectionneur", image: "/assets/badges/collector.png", category: 'region', unlocked: true, equipped: false },
      { id: 4, name: "Vétéran", image: "/assets/badges/veteran.png", category: 'departement', unlocked: true, equipped: false },
      { id: 5, name: "Historien", image: "/assets/badges/history.png", category: 'comcom', unlocked: true, equipped: false },
      { id: 6, name: "Randonneur", image: "/assets/badges/hiker.png", category: 'departement', unlocked: false, equipped: false },
      // ... ajoute d'autres badges ici
    ]
  }),

  getters: {
    // Récupère uniquement les badges équipés (max 4)
    equippedBadges: (state) => state.badges.filter(b => b.equipped),
    
    // Compte
    equippedCount: (state) => state.badges.filter(b => b.equipped).length,

    // Filtres
    badgesByCategory: (state) => (category) => {
        if (category === 'all') return state.badges;
        return state.badges.filter(b => b.category === category);
    }
  },

  actions: {
    toggleEquip(badgeId: number) {
      const badgeIndex = this.badges.findIndex(b => b.id === badgeId);
      if (badgeIndex === -1) return;

      const badge = this.badges[badgeIndex];

      // Si déjà équipé, on déséquipe
      if (badge.equipped) {
        badge.equipped = false;
        return;
      }

      // Si on veut équiper, on vérifie la limite de 4
      if (this.equippedCount < 4) {
        badge.equipped = true;
      } else {
        // Optionnel : Tu pourrais déclencher une notification "Max 4 badges" ici
        console.warn("Maximum 4 badges équipés !");
        // Petite astuce UX : On remplace le premier par le nouveau ? 
        // Pour l'instant on bloque juste.
      }
    }
  }
})