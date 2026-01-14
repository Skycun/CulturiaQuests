/**
 * visit controller
 */

import { factories } from '@strapi/strapi';

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Arrondi 2 décimales
}

export default factories.createCoreController('api::visit.visit', ({ strapi }) => ({
  /**
   * Find visits - restricts to user's guild
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

    const results = await strapi.documents('api::visit.visit').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Find one visit - restricts to user's guild
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

    const document = await strapi.documents('api::visit.visit').findOne({
      documentId: id,
      ...sanitizedQuery,
    });

    if (!document) {
      return ctx.notFound('Visit not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Open a chest at a POI
   * Validates distance and cooldown, generates loot, updates visit and guild
   */
  async openChest(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    const { poiId, userLat, userLng } = ctx.request.body;

    // Validation des paramètres
    if (!poiId || userLat === undefined || userLng === undefined) {
      return ctx.badRequest('Missing required fields: poiId, userLat, userLng');
    }

    // 1. Récupérer guild de l'utilisateur
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['id', 'documentId', 'gold', 'exp']
    });

    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    // 2. Récupérer POI
    const poi = await strapi.documents('api::poi.poi').findOne({
      documentId: poiId,
      fields: ['lat', 'lng', 'name']
    });

    if (!poi) {
      return ctx.notFound('POI not found');
    }

    // 3. Valider distance (<= 50m = 0.05 km)
    const distance = calculateDistance(userLat, userLng, poi.lat, poi.lng);
    if (distance > 0.05) {
      return ctx.badRequest(`You are too far from this chest (${(distance * 1000).toFixed(0)}m). Maximum: 50m.`);
    }

    // 4. Récupérer ou créer visit
    let visit = await strapi.db.query('api::visit.visit').findOne({
      where: {
        guild: { id: guild.id },
        poi: { documentId: poiId }
      },
      select: ['id', 'documentId', 'open_count', 'last_opened_at', 'total_gold_earned', 'total_exp_earned']
    });

    if (!visit) {
      // Première visite - créer
      visit = await strapi.documents('api::visit.visit').create({
        data: {
          guild: guild.documentId,
          poi: poiId,
          open_count: 0,
          total_gold_earned: 0,
          total_exp_earned: 0,
          publishedAt: new Date()
        }
      });
    }

    // 5. Vérifier cooldown (24h)
    if (visit.last_opened_at) {
      const lastOpenedTime = new Date(visit.last_opened_at).getTime();
      const now = Date.now();
      const cooldownMs = 24 * 60 * 60 * 1000;
      const elapsed = now - lastOpenedTime;

      if (elapsed < cooldownMs) {
        const remainingMs = cooldownMs - elapsed;
        const hours = Math.floor(remainingMs / (60 * 60 * 1000));
        const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        return ctx.badRequest(`Chest is on cooldown. Try again in ${hours}h ${minutes}m.`);
      }
    }

    // 6. Récupérer le maxFloor du joueur (palier maximum atteint)
    const runs = await strapi.db.query('api::run.run').findMany({
      where: { guild: { id: guild.id } },
      select: ['threshold_reached']
    });
    const maxFloor = runs.reduce((max, run) => {
      return run.threshold_reached && run.threshold_reached > max ? run.threshold_reached : max;
    }, 1);

    // 7. Générer loot (avec maxFloor pour le level des items)
    const { items, gold, exp } = await strapi
      .service('api::visit.visit')
      .generateChestLoot(guild.documentId, visit.documentId, maxFloor);

    // 8. Mettre à jour guild (gold et exp)
    await strapi.documents('api::guild.guild').update({
      documentId: guild.documentId,
      data: {
        gold: guild.gold + gold,
        exp: String(BigInt(guild.exp || 0) + BigInt(exp))
      }
    });

    // 9. Mettre à jour visit
    const updatedVisit = await strapi.documents('api::visit.visit').update({
      documentId: visit.documentId,
      data: {
        open_count: visit.open_count + 1,
        last_opened_at: new Date(),
        total_gold_earned: visit.total_gold_earned + gold,
        total_exp_earned: visit.total_exp_earned + exp
      },
      populate: ['items', 'poi']
    });

    return ctx.send({
      data: {
        visit: updatedVisit,
        loot: { items, gold, exp }
      }
    });
  },
}));
