/**
 * admin-dashboard service
 * Aggregates data for the admin dashboard
 */

export default ({ strapi }) => ({
  /**
   * Get global KPIs for the dashboard home page
   */
  async getOverview() {
    const [
      totalUsers,
      totalGuilds,
      totalCharacters,
      totalItems,
      totalRuns,
      totalVisits,
      totalQuests,
      totalQuizAttempts,
      recentUsers,
      recentGuilds,
    ] = await Promise.all([
      strapi.db.query('plugin::users-permissions.user').count(),
      strapi.db.query('api::guild.guild').count(),
      strapi.db.query('api::character.character').count(),
      strapi.db.query('api::item.item').count(),
      strapi.db.query('api::run.run').count(),
      strapi.db.query('api::visit.visit').count(),
      strapi.db.query('api::quest.quest').count(),
      strapi.db.query('api::quiz-attempt.quiz-attempt').count(),
      // Users created in the last 7 days
      strapi.db.query('plugin::users-permissions.user').count({
        where: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      // Guilds created in the last 7 days
      strapi.db.query('api::guild.guild').count({
        where: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Activity stats for last 24h, 7d, 30d
    const now = Date.now();
    const periods = {
      last24h: new Date(now - 24 * 60 * 60 * 1000),
      last7d: new Date(now - 7 * 24 * 60 * 60 * 1000),
      last30d: new Date(now - 30 * 24 * 60 * 60 * 1000),
    };

    const [
      runs24h, runs7d, runs30d,
      visits24h, visits7d, visits30d,
      quizAttempts24h, quizAttempts7d, quizAttempts30d,
    ] = await Promise.all([
      strapi.db.query('api::run.run').count({ where: { createdAt: { $gte: periods.last24h } } }),
      strapi.db.query('api::run.run').count({ where: { createdAt: { $gte: periods.last7d } } }),
      strapi.db.query('api::run.run').count({ where: { createdAt: { $gte: periods.last30d } } }),
      strapi.db.query('api::visit.visit').count({ where: { createdAt: { $gte: periods.last24h } } }),
      strapi.db.query('api::visit.visit').count({ where: { createdAt: { $gte: periods.last7d } } }),
      strapi.db.query('api::visit.visit').count({ where: { createdAt: { $gte: periods.last30d } } }),
      strapi.db.query('api::quiz-attempt.quiz-attempt').count({ where: { createdAt: { $gte: periods.last24h } } }),
      strapi.db.query('api::quiz-attempt.quiz-attempt').count({ where: { createdAt: { $gte: periods.last7d } } }),
      strapi.db.query('api::quiz-attempt.quiz-attempt').count({ where: { createdAt: { $gte: periods.last30d } } }),
    ]);

    // Item distribution by rarity
    const rarities = await strapi.db.query('api::rarity.rarity').findMany({
      select: ['id', 'name'],
    });

    const itemsByRarity = {};
    for (const rarity of rarities) {
      const count = await strapi.db.query('api::item.item').count({
        where: { rarity: rarity.id },
      });
      itemsByRarity[rarity.name] = count;
    }

    // Gold & XP in circulation
    const guilds = await strapi.db.query('api::guild.guild').findMany({
      select: ['gold', 'exp'],
    });

    let totalGoldInCirculation = 0;
    let totalExpInCirculation = 0;
    for (const g of guilds) {
      totalGoldInCirculation += g.gold || 0;
      totalExpInCirculation += Number(g.exp) || 0;
    }

    return {
      totals: {
        users: totalUsers,
        guilds: totalGuilds,
        characters: totalCharacters,
        items: totalItems,
        runs: totalRuns,
        visits: totalVisits,
        quests: totalQuests,
        quizAttempts: totalQuizAttempts,
      },
      recent: {
        newUsers7d: recentUsers,
        newGuilds7d: recentGuilds,
      },
      activity: {
        expeditions: { last24h: runs24h, last7d: runs7d, last30d: runs30d },
        chestOpened: { last24h: visits24h, last7d: visits7d, last30d: visits30d },
        quizAttempts: { last24h: quizAttempts24h, last7d: quizAttempts7d, last30d: quizAttempts30d },
      },
      economy: {
        totalGoldInCirculation,
        totalExpInCirculation,
        itemsByRarity,
      },
    };
  },

  /**
   * Get paginated player list with guild info
   */
  async getPlayers({ page = 1, pageSize = 25, search = '', sortBy = 'createdAt', sortOrder = 'desc' }) {
    const where: any = {};

    if (search) {
      where.$or = [
        { username: { $containsi: search } },
        { email: { $containsi: search } },
      ];
    }

    const [users, total] = await Promise.all([
      strapi.db.query('plugin::users-permissions.user').findMany({
        where,
        select: ['id', 'username', 'email', 'blocked', 'createdAt'],
        orderBy: { [sortBy]: sortOrder },
        limit: pageSize,
        offset: (page - 1) * pageSize,
        populate: {
          role: { select: ['id', 'name', 'type'] },
        },
      }),
      strapi.db.query('plugin::users-permissions.user').count({ where }),
    ]);

    // Fetch guild data for each user
    const usersWithGuilds = await Promise.all(
      users.map(async (user) => {
        const guild = await strapi.db.query('api::guild.guild').findOne({
          where: { user: { id: user.id } },
          select: ['id', 'documentId', 'name', 'gold', 'exp', 'scrap', 'debug_mode'],
        });

        const characterCount = guild
          ? await strapi.db.query('api::character.character').count({
              where: { guild: guild.id },
            })
          : 0;

        const itemCount = guild
          ? await strapi.db.query('api::item.item').count({
              where: { guild: guild.id },
            })
          : 0;

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          blocked: user.blocked,
          createdAt: user.createdAt,
          role: user.role,
          guild: guild
            ? {
                id: guild.id,
                documentId: guild.documentId,
                name: guild.name,
                gold: guild.gold,
                exp: guild.exp,
                scrap: guild.scrap,
                debug_mode: guild.debug_mode,
                level: Math.floor(Math.sqrt(Number(guild.exp) / 75)) + 1,
                characterCount,
                itemCount,
              }
            : null,
        };
      })
    );

    return {
      data: usersWithGuilds,
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    };
  },

  /**
   * Get detailed player info for the player detail view
   */
  async getPlayerDetail(userId: number) {
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      select: ['id', 'username', 'email', 'blocked', 'createdAt'],
      populate: {
        role: { select: ['id', 'name', 'type'] },
      },
    });

    if (!user) return null;

    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: userId } },
      select: ['id', 'documentId', 'name', 'gold', 'exp', 'scrap', 'debug_mode', 'quiz_streak'],
    });

    if (!guild) {
      return {
        ...user,
        guild: null,
        characters: [],
        stats: null,
      };
    }

    // Fetch characters with items
    const characters = await strapi.db.query('api::character.character').findMany({
      where: { guild: guild.id },
      select: ['id', 'documentId', 'firstname', 'lastname'],
      populate: {
        icon: { select: ['url'] },
      },
    });

    // Fetch stats using the existing statistic service
    const stats = await strapi.service('api::statistic.statistic').getSummary(userId);

    // Recent activity
    const [recentRuns, recentVisits, recentQuizAttempts] = await Promise.all([
      strapi.db.query('api::run.run').findMany({
        where: { guild: guild.id },
        select: ['id', 'date_start', 'date_end', 'gold_earned', 'xp_earned', 'threshold_reached'],
        orderBy: { createdAt: 'desc' },
        limit: 10,
        populate: {
          museum: { select: ['name'] },
        },
      }),
      strapi.db.query('api::visit.visit').findMany({
        where: { guild: guild.id },
        select: ['id', 'open_count', 'last_opened_at', 'total_gold_earned', 'total_exp_earned'],
        orderBy: { last_opened_at: 'desc' },
        limit: 10,
        populate: {
          poi: { select: ['name'] },
        },
      }),
      strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
        where: { guild: guild.id },
        select: ['id', 'score', 'completed_at', 'time_spent_seconds'],
        orderBy: { createdAt: 'desc' },
        limit: 10,
      }),
    ]);

    return {
      ...user,
      guild: {
        ...guild,
        level: Math.floor(Math.sqrt(Number(guild.exp) / 75)) + 1,
      },
      characters,
      stats,
      recentActivity: {
        runs: recentRuns,
        visits: recentVisits,
        quizAttempts: recentQuizAttempts,
      },
    };
  },

  /**
   * Toggle block status for a user
   */
  async toggleBlockUser(userId: number) {
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      select: ['id', 'blocked'],
    });

    if (!user) return null;

    const updated = await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { blocked: !user.blocked },
      select: ['id', 'username', 'blocked'],
    });

    return updated;
  },

  /**
   * Change user role (e.g. promote to admin)
   */
  async changeUserRole(userId: number, roleType: string) {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: roleType },
      select: ['id', 'name', 'type'],
    });

    if (!role) return null;

    const updated = await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { role: role.id },
      select: ['id', 'username'],
      populate: { role: { select: ['id', 'name', 'type'] } },
    });

    return updated;
  },
});
