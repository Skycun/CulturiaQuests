// --- 1. CONFIGURATION ---
const BASE_URL = 'http://localhost:1337';
const UPLOAD_URL = `${BASE_URL}/api/upload/files`;
const API_URL = `${BASE_URL}/api/items`;

// 🔴 TON TOKEN
const STRAPI_TOKEN = '919c43d984c20aa2e434e2d78a586f92952a824328927c9d61cd4c735d1d80bdd0632952173486bd863b693576a2e206394e33a28ccb2221d9930434ef01a8fd5ed4b5370f486e32dcb5a65023a414d0c37d9f5a099aac6f8b636cc539f67f17d9b0c86cc3653328390e55be4e717b9b9dcc1753dde7688c545a4a2506749c4a'; 

const GUILD_ID = 11; 

const RARITY_MAPPING = {
    common: 1,
    rare: 3,
    epic: 5,
    legendary: 7
};

// 🔥 NOUVEAU : Tes IDs de Tags (récupérés depuis ton image)
const TAG_IDS = [1, 3, 5, 7, 9, 13]; // History(1), Art(3), Science(5), Nature(7), Society(9), Make(13)

const FILE_KEYWORDS = {
    weapon: 'weapon',
    helmet: 'helmet',
    charm: 'charm'
};

let DYNAMIC_ICON_IDS = {
    weapon: [],
    helmet: [],
    charm: []
};

// --- 2. DONNÉES TEXTUELLES ---
const NOUNS = {
    weapon: ['Glaive', 'Hache', 'Dague', 'Bâton', 'Arc', 'Marteau', 'Sceptre', 'Lame', 'Espadon', 'Fléau'],
    helmet: ['Casque', 'Heaume', 'Capuche', 'Couronne', 'Visière', 'Bonnet', 'Tiare', 'Masque', 'Bandeau'],
    charm: ['Anneau', 'Amulette', 'Collier', 'Joyau', 'Talisman', 'Médaillon', 'Pierre', 'Sceau', 'Broche']
};
const ADJECTIVES = ['Ancien', 'Rouillé', 'Brillant', 'Maudit', 'Divin', 'Sanglant', 'Etheré', 'Sombre', 'Royal', 'Perdu', 'Céleste', 'Infernal', 'Runique'];
const SUFFIXES = ['du Loup', 'de la Nuit', 'du Roi', 'des Ombres', 'de Feu', 'de Glace', 'du Titan', 'Oublié', 'de la Tempête', 'du Dragon', 'des Anciens'];

// --- 3. FONCTIONS ---

// Fonction qui pioche 'count' tags au hasard
function getRandomTags(count) {
    // Mélange le tableau des tags
    const shuffled = TAG_IDS.sort(() => 0.5 - Math.random());
    // Retourne les 'count' premiers
    return shuffled.slice(0, count);
}

async function fetchImagesByKeyword(categoryKey) {
    const keyword = FILE_KEYWORDS[categoryKey];
    console.log(`🔍 Recherche des images contenant : "${keyword}" (sans "basic")...`);

    const query = new URLSearchParams({
        'filters[name][$contains]': keyword,
        'filters[name][$notContains]': 'basic',
        'pagination[limit]': '100', 
        'fields[0]': 'id',
        'fields[1]': 'name'
    });

    try {
        const response = await fetch(`${UPLOAD_URL}?${query}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
        });

        if (!response.ok) {
            console.error(`❌ Erreur accès API Fichiers (${response.status})`);
            return [];
        }

        const json = await response.json();
        const files = Array.isArray(json) ? json : (json.results || json.data || []);
        
        const ids = files.map(f => f.id);
        
        if (ids.length === 0) {
            console.warn(`⚠️ Aucune image trouvée pour "${keyword}".`);
        } else {
            console.log(`✅ ${ids.length} images trouvées pour ${keyword}`);
        }
        
        return ids;

    } catch (e) {
        console.error("Erreur script:", e);
        return [];
    }
}

function generateName(category) {
    const noun = NOUNS[category][Math.floor(Math.random() * NOUNS[category].length)];
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    return `${noun} ${adj} ${suffix}`;
}

function getRandomIcon(category) {
    const ids = DYNAMIC_ICON_IDS[category];
    if (!ids || ids.length === 0) return null;
    return ids[Math.floor(Math.random() * ids.length)];
}

function getRarityAndDamage() {
    const roll = Math.random(); 
    let rarityKey;
    let minDmg, maxDmg;

    if (roll < 0.50) {
        rarityKey = 'common';
        minDmg = 1; maxDmg = 10;
    } else if (roll < 0.80) {
        rarityKey = 'rare';
        minDmg = 5; maxDmg = 15;
    } else if (roll < 0.95) {
        rarityKey = 'epic';
        minDmg = 10; maxDmg = 20;
    } else {
        rarityKey = 'legendary';
        minDmg = 10; maxDmg = 20;
    }

    const damage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
    
    return {
        rarityId: RARITY_MAPPING[rarityKey],
        damage: damage,
        name: rarityKey
    };
}

// --- 4. EXÉCUTION ---

async function createItem(category) {
    const name = generateName(category);
    const level = Math.floor(Math.random() * 50) + 1;
    const specs = getRarityAndDamage();
    const iconId = getRandomIcon(category);
    
    if (!iconId) {
        console.warn(`⚠️ [${name}] Pas d'image dispo, skip.`);
        return;
    }

    // 🔥 LOGIQUE TAGS : 2 si légendaire, 1 sinon
    const tagCount = (specs.name === 'legendary') ? 2 : 1;
    const selectedTags = getRandomTags(tagCount);

    const payload = {
        data: {
            name: name,
            level: level,
            slot: category,
            guild: GUILD_ID,
            rarity: specs.rarityId,
            index_damage: specs.damage,
            icon: iconId,
            isScrapped: false,
            character: null,
            tags: selectedTags // Ajout des tags ici
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STRAPI_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            console.error(`❌ Erreur [${name}]:`, JSON.stringify(err, null, 2));
        } else {
            console.log(`✅ [${category.toUpperCase()}] ${name} | ${specs.name} | Tags: ${selectedTags.length}`);
        }
    } catch (error) {
        console.error('Erreur réseau:', error);
    }
}

async function run() {
    console.log(`🚀 Démarrage du script (AVEC TAGS)...`);
    
    // ÉTAPE 1 : Récupérer les IDs des images
    DYNAMIC_ICON_IDS.weapon = await fetchImagesByKeyword('weapon');
    DYNAMIC_ICON_IDS.helmet = await fetchImagesByKeyword('helmet');
    DYNAMIC_ICON_IDS.charm = await fetchImagesByKeyword('charm');

    const totalImages = DYNAMIC_ICON_IDS.weapon.length + DYNAMIC_ICON_IDS.helmet.length + DYNAMIC_ICON_IDS.charm.length;
    if (totalImages === 0) {
        console.error("⛔ STOP : Aucune image trouvée.");
        return;
    }

    console.log("------------------------------------------------");

    // ÉTAPE 2 : Génération
    const categories = ['weapon', 'helmet', 'charm'];
    const ITEMS_PER_CAT = 20; 

    for (const cat of categories) {
        if (DYNAMIC_ICON_IDS[cat].length === 0) continue;

        console.log(`\n📦 Génération de ${ITEMS_PER_CAT} ${cat}s...`);
        for (let i = 0; i < ITEMS_PER_CAT; i++) {
            await createItem(cat);
            await new Promise(r => setTimeout(r, 50)); 
        }
    }

    console.log("\n✨ Terminé !");
}

run();