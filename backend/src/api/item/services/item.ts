/**
 * item service
 * Service de generation d'items aleatoires
 */

import { factories } from '@strapi/strapi';

// --- CONSTANTES ---

// Taux de drop (meme que les coffres)
const DROP_RATES = {
  common: 60,     // 0-59
  rare: 30,       // 60-89
  epic: 9,        // 90-98
  legendary: 1    // 99+
};

// Range d'index_damage par rarete
const DAMAGE_RANGES = {
  common: { min: 5, max: 15 },
  rare: { min: 10, max: 20 },
  epic: { min: 15, max: 25 },
  legendary: { min: 15, max: 25 }
};

// Tables de noms par slot et tag
const NAME_PREFIXES = {
  weapon: {
    histoire: ['Lame', 'Epee', 'Glaive', 'Dague'],
    art: ['Pinceau', 'Plume', 'Burin', 'Ciseau'],
    science: ['Proto-Lame', 'Tech-Epee', 'Quantum', 'Laser'],
    nature: ['Racine', 'Epine', 'Griffe', 'Croc'],
    societe: ['Sceptre', 'Marteau', 'Faucille', 'Balance'],
    'savoir-faire': ['Forge', 'Outil', 'Enclume', 'Maillet']
  },
  helmet: {
    histoire: ['Heaume', 'Couronne', 'Diademe', 'Tiare'],
    art: ['Masque', 'Beret', 'Chapeau', 'Coiffe'],
    science: ['Casque-Tech', 'Neuro', 'Cyber', 'Proto'],
    nature: ['Corne', 'Bois', 'Feuillage', 'Ecorce'],
    societe: ['Coiffe', 'Bonnet', 'Capuche', 'Voile'],
    'savoir-faire': ['Casquette', 'Bandeau', 'Serre-tete', 'Calotte']
  },
  charm: {
    histoire: ['Relique', 'Vestige', 'Fragment', 'Medaillon'],
    art: ['Bijou', 'Ornement', 'Parure', 'Pendentif'],
    science: ['Module', 'Capteur', 'Nano', 'Puce'],
    nature: ['Amulette', 'Talisman', 'Graine', 'Cristal'],
    societe: ['Insigne', 'Embleme', 'Sceau', 'Blason'],
    'savoir-faire': ['Porte-bonheur', 'Breloque', 'Charme', 'Fetiche']
  }
};

const NAME_SUFFIXES = {
  histoire: ['du Passe', 'Ancestral', 'Antique', 'des Ages', 'Millenaire'],
  art: ['du Createur', 'Mystique', 'Sublime', 'Esthetique', 'Inspire'],
  science: ['Experimental', 'Avance', 'Prototype', 'Ameliore', 'Optimise'],
  nature: ['Sauvage', 'Primordial', 'Sylvestre', 'Naturel', 'Organique'],
  societe: ['Social', 'Communal', 'Civique', 'Urbain', 'Populaire'],
  'savoir-faire': ['Artisanal', 'Manufacture', 'de Maitre', 'Expert', 'Ouvre']
};

// Mapping des noms de tags en base vers les cles
const TAG_KEY_MAP: Record<string, string> = {
  'Histoire': 'histoire',
  'Art': 'art',
  'Sciences': 'science',
  'Nature': 'nature',
  'Societe': 'societe',
  'Société': 'societe',
  'Savoir Faire': 'savoir-faire',
  'Savoir-Faire': 'savoir-faire'
};

export default factories.createCoreService('api::item.item', ({ strapi }) => ({

  /**
   * Genere un item aleatoire complet
   * @param guildDocumentId - DocumentId de la guilde
   * @param maxFloor - Palier maximum du joueur (pour le level)
   * @param visitDocumentId - DocumentId de la visite (optionnel, pour lier l'item)
   * @returns L'item cree
   */
  async generateRandomItem(guildDocumentId: string, maxFloor: number, visitDocumentId?: string) {
    // 1. Tirer la rarete
    const { rarity, rarityName } = await this.rollRarity();

    // 2. Calculer le level
    const level = this.calculateItemLevel(maxFloor);

    // 3. Calculer l'index_damage
    const indexDamage = this.calculateIndexDamage(rarityName);

    // 4. Tirer le slot
    const slot = this.selectRandomSlot();

    // 5. Selectionner les tags
    const tagDocumentIds = await this.selectRandomTags(rarityName);

    // 6. Recuperer les tags complets pour le nom
    const tags = await this.getTagsByDocumentIds(tagDocumentIds);

    // 7. Generer le nom
    const name = this.generateItemName(slot, tags, rarityName);

    // 8. Trouver une icone aleatoire (excluant "basic")
    const iconId = await this.findRandomIconExcludingBasic(slot);

    // 9. Creer l'item
    const itemData = {
      name,
      slot,
      level,
      index_damage: indexDamage,
      isScrapped: false,
      guild: guildDocumentId,
      rarity: rarity.documentId,
      tags: tagDocumentIds,
      icon: iconId,
      publishedAt: new Date(),
      visits: visitDocumentId ? [visitDocumentId] : undefined
    };

    const item = await strapi.documents('api::item.item').create({
      data: itemData as any,
      populate: ['rarity', 'tags', 'icon']
    });

    strapi.log.info(`[ItemGenerator] Created ${rarityName} ${slot}: "${name}" (Level ${level}, Damage ${indexDamage})`);

    return item;
  },

  /**
   * Tire une rarete selon les taux de drop
   * Common: 60%, Rare: 30%, Epic: 9%, Legendary: 1%
   */
  async rollRarity(): Promise<{ rarity: { id: number; documentId: string; name: string }; rarityName: string }> {
    const roll = Math.random() * 100;
    let rarityName: string;

    if (roll < DROP_RATES.common) {
      rarityName = 'common';
    } else if (roll < DROP_RATES.common + DROP_RATES.rare) {
      rarityName = 'rare';
    } else if (roll < DROP_RATES.common + DROP_RATES.rare + DROP_RATES.epic) {
      rarityName = 'epic';
    } else {
      rarityName = 'legendary';
    }

    const rarity = await strapi.db.query('api::rarity.rarity').findOne({
      where: { name: rarityName },
      select: ['id', 'documentId', 'name']
    });

    if (!rarity) {
      strapi.log.warn(`[ItemGenerator] Rarity "${rarityName}" not found, falling back to common`);
      const fallback = await strapi.db.query('api::rarity.rarity').findOne({
        where: { name: 'common' },
        select: ['id', 'documentId', 'name']
      });
      return { rarity: fallback, rarityName: 'common' };
    }

    return { rarity, rarityName };
  },

  /**
   * Calcule le level de l'item base sur le palier du joueur
   * Level = maxFloor +/- 5 (minimum 1)
   */
  calculateItemLevel(maxFloor: number): number {
    const variation = Math.floor(Math.random() * 11) - 5; // -5 a +5
    const level = Math.max(1, maxFloor + variation);
    return level;
  },

  /**
   * Calcule l'index_damage selon la rarete
   * Common: 5-15, Rare: 10-20, Epic/Legendary: 15-25
   */
  calculateIndexDamage(rarityName: string): number {
    const range = DAMAGE_RANGES[rarityName as keyof typeof DAMAGE_RANGES] || DAMAGE_RANGES.common;
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  },

  /**
   * Selectionne un slot aleatoire
   */
  selectRandomSlot(): 'weapon' | 'helmet' | 'charm' {
    const slots: ('weapon' | 'helmet' | 'charm')[] = ['weapon', 'helmet', 'charm'];
    return slots[Math.floor(Math.random() * slots.length)];
  },

  /**
   * Selectionne des tags aleatoires
   * Legendary: 2 tags, Autres: 1 tag
   */
  async selectRandomTags(rarityName: string): Promise<string[]> {
    const tagCount = rarityName === 'legendary' ? 2 : 1;

    const allTags = await strapi.db.query('api::tag.tag').findMany({
      select: ['id', 'documentId', 'name']
    });

    if (allTags.length === 0) {
      strapi.log.warn('[ItemGenerator] No tags found in database');
      return [];
    }

    // Melanger et prendre les premiers
    const shuffled = [...allTags].sort(() => Math.random() - 0.5);
    const selectedTags = shuffled.slice(0, Math.min(tagCount, shuffled.length));

    return selectedTags.map(tag => tag.documentId);
  },

  /**
   * Recupere les tags complets par leurs documentIds
   */
  async getTagsByDocumentIds(documentIds: string[]): Promise<{ name: string }[]> {
    if (documentIds.length === 0) return [];

    const tags = await strapi.db.query('api::tag.tag').findMany({
      where: { documentId: { $in: documentIds } },
      select: ['name']
    });

    return tags;
  },

  /**
   * Genere un nom d'item base sur le slot et les tags
   * Format: [Prefixe du tag] + [Suffixe du tag]
   */
  generateItemName(slot: string, tags: { name: string }[], rarityName: string): string {
    if (tags.length === 0) {
      // Nom par defaut si pas de tags
      const defaultNames = {
        weapon: 'Arme Mysterieuse',
        helmet: 'Casque Inconnu',
        charm: 'Amulette Etrange'
      };
      return defaultNames[slot as keyof typeof defaultNames] || 'Objet Mysterieux';
    }

    // Utiliser le premier tag pour le prefixe
    const primaryTag = tags[0];
    const tagKey = TAG_KEY_MAP[primaryTag.name] || primaryTag.name.toLowerCase();

    // Obtenir les prefixes pour ce slot et tag
    const prefixes = NAME_PREFIXES[slot as keyof typeof NAME_PREFIXES]?.[tagKey as keyof typeof NAME_SUFFIXES];
    const suffixes = NAME_SUFFIXES[tagKey as keyof typeof NAME_SUFFIXES];

    if (!prefixes || !suffixes) {
      return `${slot.charAt(0).toUpperCase() + slot.slice(1)} ${primaryTag.name}`;
    }

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    // Pour les legendaires avec 2 tags, ajouter une mention du second tag
    if (rarityName === 'legendary' && tags.length > 1) {
      const secondTag = tags[1];
      const secondTagKey = TAG_KEY_MAP[secondTag.name] || secondTag.name.toLowerCase();
      const secondSuffixes = NAME_SUFFIXES[secondTagKey as keyof typeof NAME_SUFFIXES];
      if (secondSuffixes) {
        const secondSuffix = secondSuffixes[Math.floor(Math.random() * secondSuffixes.length)];
        return `${prefix} ${suffix} et ${secondSuffix}`;
      }
    }

    return `${prefix} ${suffix}`;
  },

  /**
   * Trouve une icone aleatoire depuis la media library
   * Exclut les icones contenant "basic" dans le nom
   */
  async findRandomIconExcludingBasic(slot: string): Promise<number | null> {
    const folderMap: Record<string, string> = {
      weapon: 'weapons',
      helmet: 'helmets',
      charm: 'charms'
    };
    const folderName = folderMap[slot];

    const folder = await strapi.db.query('plugin::upload.folder').findOne({
      where: { name: folderName },
      select: ['id']
    });

    if (!folder) {
      strapi.log.warn(`[ItemGenerator] Folder "${folderName}" not found`);
      return null;
    }

    // Recuperer toutes les images du dossier
    const files = await strapi.db.query('plugin::upload.file').findMany({
      where: {
        folder: { id: folder.id },
        mime: { $startsWith: 'image/' }
      },
      select: ['id', 'name']
    });

    // Filtrer pour exclure les icones "basic"
    const filteredFiles = files.filter(file =>
      !file.name.toLowerCase().includes('basic')
    );

    if (filteredFiles.length === 0) {
      strapi.log.warn(`[ItemGenerator] No non-basic icons found in "${folderName}"`);
      // Fallback: utiliser n'importe quelle icone
      if (files.length > 0) {
        return files[Math.floor(Math.random() * files.length)].id;
      }
      return null;
    }

    return filteredFiles[Math.floor(Math.random() * filteredFiles.length)].id;
  }
}));
