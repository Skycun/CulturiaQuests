/**
 * run controller
 */

import { factories } from '@strapi/strapi';

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371e3; // Radius of the earth in m
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in m
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default factories.createCoreController('api::run.run', ({ strapi }) => ({
  /**
   * Find runs - restricts to user's guild
   */
  async find(ctx) {
    const user = ctx.state.user;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
      sanitizedQuery.filters = {
        ...(sanitizedQuery.filters as any || {}),
        guild: {
          user: {
            id: user.id
          }
        }
      };
    }

    const results = await strapi.documents('api::run.run').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Find one run - restricts to user's guild
   */
  async findOne(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    if (user) {
      sanitizedQuery.filters = {
        ...(sanitizedQuery.filters as any || {}),
        guild: {
          user: {
            id: user.id
          }
        }
      };
    }

    const document = await strapi.documents('api::run.run').findOne({
      documentId: id,
      ...sanitizedQuery,
    });

    if (!document) {
      return ctx.notFound('Run not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async startExpedition(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { museumDocumentId, userLat, userLng } = ctx.request.body;
    if (!museumDocumentId || !userLat || !userLng) {
      return ctx.badRequest('Missing parameters');
    }

    // 1. Get Guild
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: user.id },
      select: ['documentId']
    });
    if (!guild) return ctx.badRequest('User has no guild');

    // 2. Fetch Museum (removed NPC check/populate)
    const museum = await strapi.documents('api::museum.museum').findOne({
      documentId: museumDocumentId
    });

    if (!museum) return ctx.notFound('Museum not found');

    // 3. Validate Distance
    const dist = getDistanceFromLatLonInM(userLat, userLng, museum.lat, museum.lng);
    if (dist > (museum.radius || 50)) { // default radius 50m if null
      return ctx.badRequest('Too far from museum', { distance: dist, radius: museum.radius });
    }

    // 4. Check active run
    const activeRuns = await strapi.documents('api::run.run').findMany({
      filters: {
        guild: { documentId: guild.documentId },
        date_end: { $null: true }
      },
      limit: 1
    });
    
    if (activeRuns.length > 0) return ctx.badRequest('An expedition is already active');

    // 5. Calculate DPS
    const runService = strapi.service('api::run.run');
    const dps = await runService.calculateGuildDPS(guild.documentId);

    // 6. Roll NPC Chance (1/6)
    const roll = Math.floor(Math.random() * 6) + 1; // 1 to 6
    const hasNpc = roll === 1; // 1/6 chance

    let assignedNpc = null;
    let targetThreshold = null;
    let dialogLines = [];

    if (hasNpc) {
        // Fetch all NPCs to pick one randomly
        // Optimization: Could count first or just fetch IDs
        const allNpcs = await strapi.documents('api::npc.npc').findMany({
            populate: ['dialogs']
        });
        
        if (allNpcs && allNpcs.length > 0) {
            const randomIndex = Math.floor(Math.random() * allNpcs.length);
            assignedNpc = allNpcs[randomIndex];
            
            // Set target threshold (Quest logic linked to NPC appearance)
            targetThreshold = Math.floor(Math.random() * 11) + 5; // 5 to 15
            
            // Get Dialog
            const dialogObj = assignedNpc.dialogs?.find((d: any) => d.text_type === 'expedition_appear');
            dialogLines = dialogObj ? dialogObj.dialogues : ["Un aventurier approche..."];
        }
    }

    // 7. Create Run
    const run = await strapi.documents('api::run.run').create({
      data: {
        date_start: new Date(),
        dps: dps,
        museum: museumDocumentId,
        npc: assignedNpc ? assignedNpc.documentId : null,
        guild: guild.documentId,
        target_threshold: targetThreshold,
        threshold_reached: 0,
        gold_earned: 0,
        xp_earned: 0,
        entry_unlocked: false
      }
    });

    return {
      run,
      questRolled: hasNpc,
      dialog: dialogLines
    };
  },

  async endExpedition(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { runDocumentId } = ctx.request.body;
    if (!runDocumentId) return ctx.badRequest('Missing runDocumentId');

    // 1. Fetch Run & Validate
    const run = await strapi.documents('api::run.run').findOne({
      documentId: runDocumentId,
      populate: ['guild', 'npc']
    });

    if (!run) return ctx.notFound('Run not found');

    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: user.id },
      select: ['documentId']
    });
    if (!guild || run.guild.documentId !== guild.documentId) {
      return ctx.forbidden('You do not own this run');
    }

    if (run.date_end) return ctx.badRequest('Run already finished');

    // 2. Calculate Stats
    const now = new Date();
    const start = new Date(run.date_start as string);
    const elapsedSeconds = (now.getTime() - start.getTime()) / 1000;
    const totalDamage = Math.floor(elapsedSeconds * run.dps);

    const runService = strapi.service('api::run.run');
    const tier = runService.calculateTierFromDamage(totalDamage);
    const { gold, xp, itemCount } = runService.calculateRewards(tier, totalDamage, elapsedSeconds);

    // 3. Generate Loot
    const itemService = strapi.service('api::item.item');
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      // Assuming maxFloor 1 for now
      const item = await itemService.generateRandomItem(guild.documentId, 1);
      items.push(item);
    }

    const itemIds = items.map(i => i.documentId);

    // 4. Quest Logic
    let entryUnlocked = false;
    if (run.target_threshold && tier >= run.target_threshold && run.npc) {
      // Vérifier si on peut encore débloquer des entrées pour ce NPC
      const npcData = run.npc as any;
      const npcDocumentId: string = typeof npcData === 'string' ? npcData : npcData.documentId;

      const npc = await strapi.documents('api::npc.npc').findOne({
        documentId: npcDocumentId,
      });

      if (npc) {
        // Chercher ou créer la relation friendship
        let friendship = await strapi.db.query('api::friendship.friendship').findOne({
          where: {
            guild: { documentId: guild.documentId },
            npc: { documentId: npcDocumentId },
          },
        });

        const currentUnlocked = friendship?.expedition_entry_unlocked || 0;
        const maxAvailable = npc.expedition_entry_available || 0;

        if (currentUnlocked < maxAvailable) {
          entryUnlocked = true;

          if (friendship) {
            // Mettre à jour la friendship existante
            await strapi.db.query('api::friendship.friendship').update({
              where: { id: friendship.id },
              data: { expedition_entry_unlocked: currentUnlocked + 1 },
            });
          } else {
            // Créer une nouvelle friendship
            await strapi.documents('api::friendship.friendship').create({
              data: {
                guild: guild.documentId,
                npc: npcDocumentId,
                expedition_entry_unlocked: 1,
                quests_entry_unlocked: 0,
              },
            });
          }
        }
      }
    }

    // 5. Update Run
    const updatedRun = await strapi.documents('api::run.run').update({
      documentId: runDocumentId,
      data: {
        date_end: now,
        threshold_reached: tier,
        gold_earned: gold,
        xp_earned: xp,
        entry_unlocked: entryUnlocked,
        items: itemIds
      }
    });

    // 6. Update Guild
    const fullGuild = await strapi.documents('api::guild.guild').findOne({
      documentId: guild.documentId
    });

    await strapi.documents('api::guild.guild').update({
      documentId: guild.documentId,
      data: {
        gold: (fullGuild.gold || 0) + gold,
        exp: (fullGuild.exp || 0) + xp
      }
    });

    return {
      run: updatedRun,
      rewards: { gold, xp, items },
      questSuccess: entryUnlocked
    };
  },

  async getActiveRun(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: user.id },
      select: ['documentId']
    });

    if (!guild) return null;

    const activeRuns = await strapi.documents('api::run.run').findMany({
      filters: {
        guild: { documentId: guild.documentId },
        date_end: { $null: true }
      },
      limit: 1,
      populate: ['museum', 'npc']
    });

    return activeRuns.length > 0 ? activeRuns[0] : null;
  }
}));
