import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Nécessaire pour __dirname en module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis le fichier .env (remonter d'un niveau depuis src)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = {
  baseUrl: process.env.STRAPI_BASE_URL || 'http://localhost:1337',
  apiToken: process.env.STRAPI_API_TOKEN || '',
};

if (!config.apiToken) {
  console.error('Erreur: STRAPI_API_TOKEN est manquant dans le fichier .env');
  process.exit(1);
}

// Client Axios simple
const client = axios.create({
  baseURL: config.baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiToken}`,
  },
});

const npcUpdates = [
  { firstname: 'Toren', nickname: "l'Architecte" },
  { firstname: 'Bram', nickname: 'le Boucher' },
  { firstname: 'Marn', nickname: 'le Pécheur' },
  { firstname: 'Denrick', nickname: 'le Forgeron' },
  { firstname: 'Toben', nickname: 'le Meunier' },
  { firstname: 'Malori', nickname: 'la Postière' },
  { firstname: 'Garen', nickname: 'le Chasseur' },
];

async function updateNicknames() {
  console.log('Début de la mise à jour des surnoms des NPCs...');

  for (const update of npcUpdates) {
    try {
      // 1. Trouver le NPC par son prénom
      // Note: Strapi v5 utilise 'documentId' pour les updates, mais 'id' peut être retourné
      const searchUrl = `/api/npcs?filters[firstname][$eq]=${encodeURIComponent(update.firstname)}`;
      const response = await client.get(searchUrl);

      const npcs = response.data.data;

      if (!npcs || npcs.length === 0) {
        console.warn(`Attention: NPC nommé "${update.firstname}" introuvable.`);
        continue;
      }

      if (npcs.length > 1) {
        console.warn(`Attention: Plusieurs NPCs trouvés pour "${update.firstname}". Mise à jour du premier.`);
      }

      const npc = npcs[0];
      // Strapi v5 utilise documentId préférentiellement pour l'identification publique/API
      const npcId = npc.documentId || npc.id;

      // 2. Mettre à jour le NPC avec le nouveau surnom
      await client.put(`/api/npcs/${npcId}`, {
        data: {
            nickname: update.nickname,
        }
      });

      console.log(`Succès: "${update.firstname}" est maintenant "${update.firstname} ${update.nickname}"`);

    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        console.error(`Erreur lors de la mise à jour de "${update.firstname}": ${msg}`);
    }
  }

  console.log('Mise à jour terminée.');
}

updateNicknames();
