#!/usr/bin/env node
/**
 * Script de génération de fixtures pour simulation d'utilisateurs
 *
 * Usage:
 *   npx tsx generate-user-base.ts                # Mode interactif
 *   npx tsx generate-user-base.ts --users 50     # Générer 50 utilisateurs
 *   npx tsx generate-user-base.ts --check        # Vérifier les données de référence
 *   npx tsx generate-user-base.ts --cleanup      # Supprimer les fixtures
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { StrapiClient, type ReferenceData } from './lib/strapi-client.js';
import { UserPersona, assignPersona, getPersonaParams, getPersonaDisplayName } from './lib/user-persona.js';
import { distributeActivities, generateConnectionLogs } from './lib/activity-distributor.js';
import {
  generateUserData,
  generateItemData,
  selectActivityType,
  generateVisitData,
  generateRunData,
  generateQuestData,
  generateQuizAttemptData,
  selectFriendshipStatus,
  shuffle,
} from './lib/data-generator.js';
import {
  SIMULATION_DAYS,
  RATE_LIMITS,
  ITEM_SLOTS,
  ITEMS_PER_PERSONA,
  USERNAME_PREFIX,
} from './config/generation-config.js';

// Support ESM : recréer __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le .env depuis la racine du projet
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// ==========================================
// Types
// ==========================================

interface GeneratedUser {
  id: number;
  username: string;
  jwt: string;
  guildDocId: string;
  characterDocId: string;
  persona: UserPersona;
  totalGold: number;
  totalXp: number;
}

// ==========================================
// Configuration
// ==========================================

const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_TOKEN) {
  console.error(chalk.red('❌ STRAPI_API_TOKEN non trouvé dans le .env'));
  console.error(chalk.yellow('   Créez un token dans Strapi Admin: Settings > API Tokens (Full access)'));
  process.exit(1);
}

// ==========================================
// Main
// ==========================================

async function main() {
  console.log(chalk.bold.blue('\n🎮 CulturiaQuests - Générateur de Fixtures\n'));

  const args = process.argv.slice(2);

  const client = new StrapiClient(STRAPI_BASE_URL, STRAPI_API_TOKEN);

  // Mode check
  if (args.includes('--check')) {
    await checkReferenceData(client);
    return;
  }

  // Mode cleanup
  if (args.includes('--cleanup')) {
    await cleanup(client);
    return;
  }

  // Mode génération
  let userCount = 50;

  // Paramètre --users
  const usersIndex = args.indexOf('--users');
  if (usersIndex !== -1 && args[usersIndex + 1]) {
    userCount = parseInt(args[usersIndex + 1], 10);
    if (isNaN(userCount) || userCount < 1 || userCount > 1000) {
      console.error(chalk.red('❌ --users doit être entre 1 et 1000'));
      process.exit(1);
    }
  } else {
    // Mode interactif
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'userCount',
        message: "Nombre d'utilisateurs à générer ?",
        default: 50,
        validate: (input) => (input >= 1 && input <= 1000) || 'Entre 1 et 1000',
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: (ans: any) => `Créer ${ans.userCount} utilisateurs avec activité complète ?`,
      },
    ]);

    if (!answers.confirm) {
      console.log(chalk.yellow('❌ Annulé'));
      return;
    }

    userCount = answers.userCount;
  }

  await generateFixtures(client, userCount);
}

// ==========================================
// Check Reference Data
// ==========================================

async function checkReferenceData(client: StrapiClient) {
  console.log(chalk.bold('🔍 Vérification des données de référence...\n'));

  try {
    const refData = await client.fetchReferenceData(SIMULATION_DAYS);

    const checks = [
      { name: 'Tags', count: refData.tags.length, min: 5 },
      { name: 'Rarities', count: refData.rarities.length, min: 4 },
      { name: 'NPCs', count: refData.npcs.length, min: 5 },
      { name: 'POIs', count: refData.pois.length, min: 10 },
      { name: 'Museums', count: refData.museums.length, min: 3 },
      { name: 'Quiz Sessions (30d)', count: refData.quizSessions.length, min: 0 },
      { name: 'Character Icons', count: refData.characterIcons.length, min: 1 },
      { name: 'Weapon Icons', count: refData.weaponIcons.length, min: 1 },
      { name: 'Helmet Icons', count: refData.helmetIcons.length, min: 1 },
      { name: 'Charm Icons', count: refData.charmIcons.length, min: 1 },
    ];

    let allPassed = true;

    for (const check of checks) {
      const status = check.count >= check.min ? chalk.green('✅') : chalk.red('❌');
      const message = `${status} ${check.name}: ${check.count} found (min: ${check.min})`;
      console.log(message);

      if (check.count < check.min) {
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log(chalk.green('\n✅ Toutes les données de référence sont OK\n'));
    } else {
      console.log(chalk.red('\n❌ Certaines données de référence sont manquantes\n'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la vérification:'), error);
    process.exit(1);
  }
}

// ==========================================
// Generate Fixtures
// ==========================================

async function generateFixtures(client: StrapiClient, userCount: number) {
  console.log(chalk.bold(`\n📦 Génération de ${userCount} utilisateurs avec activités...\n`));

  const startTime = Date.now();

  try {
    // 1. Fetch reference data
    console.log(chalk.cyan('1️⃣  Chargement des données de référence...'));
    const refData = await client.fetchReferenceData(SIMULATION_DAYS);
    console.log(chalk.green(`   ✅ ${refData.pois.length} POIs, ${refData.museums.length} museums, ${refData.npcs.length} NPCs\n`));

    // 2. Create users
    console.log(chalk.cyan('2️⃣  Création des utilisateurs, guildes et personnages...'));
    const users = await createUsers(client, userCount, refData);
    console.log(chalk.green(`   ✅ ${users.length} utilisateurs créés\n`));

    // 3. Generate activities
    console.log(chalk.cyan('3️⃣  Génération des activités...'));
    await generateActivities(client, users, refData);
    console.log(chalk.green(`   ✅ Activités générées\n`));

    // 4. Update guild resources
    console.log(chalk.cyan('4️⃣  Mise à jour des ressources des guildes...'));
    await updateGuildResources(client, users);
    console.log(chalk.green(`   ✅ Ressources mises à jour\n`));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.bold.green(`\n✨ Génération terminée en ${elapsed}s!\n`));

    // Afficher résumé
    displaySummary(users);
  } catch (error) {
    console.error(chalk.red('\n❌ Erreur lors de la génération:'), error);
    console.error(chalk.yellow('\n⚠️  Les données partielles peuvent nécessiter un cleanup'));
    process.exit(1);
  }
}

// ==========================================
// Create Users
// ==========================================

async function createUsers(
  client: StrapiClient,
  userCount: number,
  refData: ReferenceData
): Promise<GeneratedUser[]> {
  const progressBar = new cliProgress.SingleBar({
    format: '   {bar} {percentage}% | {value}/{total} users | ETA: {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  });

  progressBar.start(userCount, 0);

  const users: GeneratedUser[] = [];
  const timestamp = Date.now(); // Unique timestamp for this batch

  for (let i = 0; i < userCount; i++) {
    const persona = assignPersona(i, userCount);
    const userData = generateUserData(i, timestamp);

    try {
      // Create user
      const user = await client.createUser(userData);

      // Create guild, character, and starter items in one call
      const iconId = refData.characterIcons[Math.floor(Math.random() * refData.characterIcons.length)];
      const { guild, character } = await client.setupGuildAndCharacter(
        userData.guildName,
        userData.characterFirstname,
        userData.characterLastname,
        iconId,
        user.jwt
      );

      users.push({
        id: user.id,
        username: user.username,
        jwt: user.jwt,
        guildDocId: guild.documentId,
        characterDocId: character.documentId,
        persona,
        totalGold: 0,
        totalXp: 0,
      });

      progressBar.increment();

      // Rate limiting
      await sleep(RATE_LIMITS.USER_CREATION_DELAY);
    } catch (error) {
      progressBar.stop();
      throw new Error(`Failed to create user ${i}: ${error}`);
    }
  }

  progressBar.stop();

  return users;
}

// ==========================================
// Generate Activities
// ==========================================

async function generateActivities(
  client: StrapiClient,
  users: GeneratedUser[],
  refData: ReferenceData
) {
  const progressBar = new cliProgress.SingleBar({
    format: '   {bar} {percentage}% | {value}/{total} users',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  });

  progressBar.start(users.length, 0);

  // Process users in batches
  const batchSize = RATE_LIMITS.ACTIVITY_BATCH_SIZE;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    await Promise.all(
      batch.map((user) => generateUserActivities(client, user, refData))
    );

    progressBar.update(Math.min(i + batchSize, users.length));
  }

  progressBar.stop();
}

async function generateUserActivities(
  client: StrapiClient,
  user: GeneratedUser,
  refData: ReferenceData
) {
  const timestamps = distributeActivities(user.persona, SIMULATION_DAYS);
  const params = getPersonaParams(user.persona);

  let totalGold = 0;
  let totalXp = 0;

  // Generate activities
  for (const timestamp of timestamps) {
    const activityType = selectActivityType(user.persona);

    try {
      switch (activityType) {
        case 'visit': {
          const poi = refData.pois[Math.floor(Math.random() * refData.pois.length)];
          const { data: visitData, rewards } = generateVisitData(user.guildDocId, poi.documentId, timestamp, user.persona);
          await client.createVisit(visitData, user.jwt);
          totalGold += rewards.gold;
          totalXp += rewards.xp;
          break;
        }

        case 'run': {
          const museum = refData.museums[Math.floor(Math.random() * refData.museums.length)];
          const npc = refData.npcs[Math.floor(Math.random() * refData.npcs.length)];
          const { data: runData, rewards } = generateRunData(user.guildDocId, museum.documentId, npc.documentId, timestamp, user.persona);
          await client.createRun(runData, user.jwt);
          totalGold += rewards.gold;
          totalXp += rewards.xp;
          break;
        }

        case 'quest': {
          const [poiA, poiB] = shuffle(refData.pois).slice(0, 2);
          const npc = refData.npcs[Math.floor(Math.random() * refData.npcs.length)];
          const { data: questData, rewards } = generateQuestData(user.guildDocId, npc.documentId, poiA.documentId, poiB.documentId, timestamp, user.persona);
          await client.createQuest(questData, user.jwt);
          totalGold += rewards.gold;
          totalXp += rewards.xp;
          break;
        }

        case 'quiz': {
          // Skip quiz attempts for now - they require the special /submit endpoint
          // and complex validation that doesn't work with admin token for historical data
          break;
        }
      }

      await sleep(RATE_LIMITS.API_REQUEST_DELAY);
    } catch (error) {
      // Log errors but continue
      console.error(chalk.yellow(`⚠️  Failed to create ${activityType} for ${user.username}:`, error.message || error));
    }
  }

  // Generate items
  const itemCount = randomInt(ITEMS_PER_PERSONA[user.persona].min, ITEMS_PER_PERSONA[user.persona].max);
  for (let i = 0; i < itemCount; i++) {
    const slot = ITEM_SLOTS[Math.floor(Math.random() * ITEM_SLOTS.length)];
    const iconIds = slot === 'weapon' ? refData.weaponIcons : slot === 'helmet' ? refData.helmetIcons : refData.charmIcons;
    const itemData = generateItemData(slot, iconIds, refData.tags.map((t) => t.id));

    try {
      await client.createItem(itemData, user.guildDocId, user.jwt);
      await sleep(RATE_LIMITS.API_REQUEST_DELAY);
    } catch (error) {
      console.error(chalk.yellow(`⚠️  Failed to create item for ${user.username}: ${error.message}`));
    }
  }

  // Generate NPC friendships
  const npcFriendshipCount = randomInt(params.npcFriendshipsCount.min, params.npcFriendshipsCount.max);
  const selectedNpcs = shuffle(refData.npcs).slice(0, npcFriendshipCount);

  for (const npc of selectedNpcs) {
    const questsCompleted = randomInt(0, 3);
    const expeditionsCompleted = randomInt(0, 5);

    try {
      await client.createNPCFriendship(user.guildDocId, npc.documentId, questsCompleted, expeditionsCompleted, user.jwt);
      await sleep(RATE_LIMITS.API_REQUEST_DELAY);
    } catch (error) {
      console.error(chalk.yellow(`⚠️  Failed to create NPC friendship for ${user.username}: ${error.message}`));
    }
  }

  user.totalGold = totalGold;
  user.totalXp = totalXp;
}

// ==========================================
// Update Guild Resources
// ==========================================

async function updateGuildResources(client: StrapiClient, users: GeneratedUser[]) {
  for (const user of users) {
    try {
      await client.updateGuild(
        user.guildDocId,
        {
          gold: user.totalGold,
          exp: user.totalXp.toString(),
        },
        user.jwt
      );
    } catch (error) {
      console.error(chalk.yellow(`⚠️  Failed to update guild for ${user.username}:`, error.message || error));
    }
  }
}

// ==========================================
// Generate Player Friendships
// ==========================================

async function generatePlayerFriendships(
  client: StrapiClient,
  users: GeneratedUser[]
) {
  // Create friendships between random users
  for (const user of users) {
    const params = getPersonaParams(user.persona);
    const friendshipCount = randomInt(params.friendshipsCount.min, params.friendshipsCount.max);

    const potentialFriends = users.filter((u) => u.id !== user.id);
    const selectedFriends = shuffle(potentialFriends).slice(0, friendshipCount);

    for (const friend of selectedFriends) {
      const status = selectFriendshipStatus();

      try {
        await client.createFriendship(user.characterDocId, friend.characterDocId, status, user.jwt);
        await sleep(RATE_LIMITS.API_REQUEST_DELAY);
      } catch (error) {
        // Friendship may already exist, ignore
      }
    }
  }
}

// ==========================================
// Cleanup
// ==========================================

async function cleanup(client: StrapiClient) {
  console.log(chalk.bold.yellow('\n⚠️  Cleanup des fixtures\n'));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Supprimer tous les utilisateurs avec le préfixe "${USERNAME_PREFIX}" ?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('❌ Annulé'));
    return;
  }

  try {
    const guilds = await client.findGuildsByUsernamePrefix(USERNAME_PREFIX);

    console.log(chalk.cyan(`🗑️  Suppression de ${guilds.length} guildes et utilisateurs...`));

    const progressBar = new cliProgress.SingleBar({
      format: '   {bar} {percentage}% | {value}/{total}',
    });

    progressBar.start(guilds.length, 0);

    for (const guild of guilds) {
      try {
        await client.deleteGuild(guild.documentId);
        await client.deleteUser(guild.userId);
        progressBar.increment();
      } catch (error) {
        console.error(chalk.yellow(`⚠️  Erreur lors de la suppression de guild ${guild.documentId}`));
      }
    }

    progressBar.stop();

    console.log(chalk.green('\n✅ Cleanup terminé\n'));
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors du cleanup:'), error);
    process.exit(1);
  }
}

// ==========================================
// Display Summary
// ==========================================

function displaySummary(users: GeneratedUser[]) {
  console.log(chalk.bold('📊 Résumé de la génération:\n'));

  const personaCounts = {
    [UserPersona.HARDCORE]: 0,
    [UserPersona.REGULAR]: 0,
    [UserPersona.CASUAL]: 0,
    [UserPersona.DORMANT]: 0,
  };

  let totalGold = 0;
  let totalXp = 0;

  for (const user of users) {
    personaCounts[user.persona]++;
    totalGold += user.totalGold;
    totalXp += user.totalXp;
  }

  console.log(chalk.cyan('Distribution des personas:'));
  for (const [persona, count] of Object.entries(personaCounts)) {
    const displayName = getPersonaDisplayName(persona as UserPersona);
    console.log(`   ${displayName}: ${count} (${((count / users.length) * 100).toFixed(1)}%)`);
  }

  console.log(chalk.cyan('\nRessources totales:'));
  console.log(`   💰 Gold: ${totalGold.toLocaleString()}`);
  console.log(`   ⭐ XP: ${totalXp.toLocaleString()}`);

  console.log(chalk.cyan('\nMoyennes par utilisateur:'));
  console.log(`   💰 Gold: ${Math.floor(totalGold / users.length).toLocaleString()}`);
  console.log(`   ⭐ XP: ${Math.floor(totalXp / users.length).toLocaleString()}`);

  console.log();
}

// ==========================================
// Utilities
// ==========================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==========================================
// Run
// ==========================================

main().catch((error) => {
  console.error(chalk.red('❌ Erreur fatale:'), error);
  process.exit(1);
});
