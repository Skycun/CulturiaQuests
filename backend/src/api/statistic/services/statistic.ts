/**
 * statistic service
 */

export default ({ strapi }) => ({
  async getSummary(userId) {
    // 1. Get Guild ID
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: userId } },
      select: ['id', 'exp']
    });

    if (!guild) {
      return {
        totalExpeditions: 0,
        totalTime: 0,
        maxFloor: 0,
        totalDamage: 0,
        totalPoiVisits: 0,
        totalDistinctPois: 0,
        totalItemsCollected: 0,
        totalItemsScrapped: 0,
        totalScrapAccumulated: 0,
        totalExp: 0,
        totalGold: 0,
        accountDays: 0,
      };
    }

    const guildId = guild.id;

    // --- Parallel Data Fetching (Optimized Selects) ---
    const [runs, visits, items, quests, user, mostVisitedPoi] = await Promise.all([
      // Runs: Need dates for time, dps for damage, threshold, gold
      strapi.db.query('api::run.run').findMany({
        where: { guild: guildId },
        select: ['date_start', 'date_end', 'dps', 'threshold_reached', 'gold_earned'],
      }),
      // Visits: Need open_count, gold
      strapi.db.query('api::visit.visit').findMany({
        where: { guild: guildId },
        select: ['open_count', 'total_gold_earned'],
      }),
      // Items: Need stats for scrap calculation
      strapi.db.query('api::item.item').findMany({
        where: { guild: guildId },
        select: ['isScrapped', 'level', 'index_damage'],
        populate: {
          rarity: {
            select: ['name']
          }
        }
      }),
      // Quests: Need gold
      strapi.db.query('api::quest.quest').findMany({
        where: { guild: guildId },
        select: ['gold_earned'],
      }),
      // User info for account age
      strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId },
        select: ['createdAt']
      }),
      // Most Visited POI
      strapi.db.query('api::visit.visit').findMany({
        where: { guild: guildId },
        orderBy: { open_count: 'desc' },
        limit: 1,
        populate: { poi: { select: ['name'] } }
      })
    ]);

    // --- Aggregation Logic ---

    // 1. Account Days
    let accountDays = 0;
    if (user && user.createdAt) {
      const created = new Date(user.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - created.getTime());
      accountDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // 2. Runs Stats
    let totalTime = 0;
    let totalDamage = 0;
    let maxFloor = 0;
    let totalGold = 0;

    for (const run of runs) {
      // Time & Damage
      if (run.date_start && run.date_end) {
        const start = new Date(run.date_start).getTime();
        const end = new Date(run.date_end).getTime();
        const duration = end - start;
        if (duration > 0) {
          totalTime += duration;
          if (run.dps) {
            totalDamage += run.dps * (duration / 1000);
          }
        }
      }

      // Floor
      if (run.threshold_reached && run.threshold_reached > maxFloor) {
        maxFloor = run.threshold_reached;
      }

      // Gold
      if (run.gold_earned) {
        totalGold += run.gold_earned;
      }
    }

    // 3. Visits Stats
    let totalPoiVisits = 0;
    for (const visit of visits) {
      if (visit.open_count) totalPoiVisits += visit.open_count;
      if (visit.total_gold_earned) totalGold += visit.total_gold_earned;
    }

    // 4. Quests Stats
    for (const quest of quests) {
      if (quest.gold_earned) totalGold += quest.gold_earned;
    }

    // 5. Items Stats
    let totalItemsScrapped = 0;
    let totalScrapAccumulated = 0;

    const rarityMultipliers: Record<string, number> = {
      basic: 1, common: 2, rare: 5, epic: 10, legendary: 20
    };

    for (const item of items) {
      if (item.isScrapped) {
        totalItemsScrapped++;
        
        const level = item.level || 1;
        const damage = item.index_damage || 0;
        const rarityName = (item.rarity?.name || 'basic').toLowerCase();
        const rarityMult = rarityMultipliers[rarityName] || 1;
        
        totalScrapAccumulated += Math.floor((level * rarityMult) + (damage / 2));
      }
    }

    // 6. Most Visited POI
    const mostVisitedPoiName = mostVisitedPoi[0]?.poi?.name || null;

    return {
      totalExpeditions: runs.length,
      totalTime,
      maxFloor,
      totalDamage,
      totalPoiVisits,
      totalDistinctPois: visits.length,
      mostVisitedPoiName,
      totalItemsCollected: items.length,
      totalItemsScrapped,
      totalScrapAccumulated,
      totalExp: guild.exp || 0,
      totalGold,
      accountDays
    };
  }
});
