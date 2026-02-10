/**
 * admin-dashboard controller
 * All endpoints require the "admin" role
 */

const svc = () => strapi.service('api::admin-dashboard.admin-dashboard');

/**
 * Helper: Verify that the current user has the admin role
 * Returns true if admin, false otherwise
 */
async function verifyAdminRole(ctx): Promise<boolean> {
  if (!ctx.state.user) return false;

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: ctx.state.user.id },
    populate: { role: { select: ['type'] } },
  });

  return user?.role?.type === 'admin';
}

/**
 * Helper: Log admin action to audit trail
 */
async function logAdminAction(ctx, action: string, targetUserId: number, details?: any) {
  try {
    await strapi.db.query('api::admin-action-log.admin-action-log').create({
      data: {
        admin: ctx.state.user.id,
        action,
        target_user: targetUserId,
        details: details || null,
        ip_address: ctx.request.ip,
      },
    });
  } catch (err) {
    strapi.log.warn('Failed to log admin action:', err.message);
  }
}

export default {
  async check(ctx) {
    const isAdmin = await verifyAdminRole(ctx);
    return ctx.send({ isAdmin });
  },

  async getOverview(ctx) {
    try {
      return ctx.send(await svc().getOverview());
    } catch (error) {
      strapi.log.error('Admin dashboard - getOverview failed:', error);
      return ctx.internalServerError('Failed to fetch dashboard overview');
    }
  },

  async getPlayers(ctx) {
    const { page = 1, pageSize = 25, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = ctx.query;
    try {
      return ctx.send(await svc().getPlayers({
        page: Math.max(1, Number(page)),
        pageSize: Math.max(1, Math.min(Number(pageSize), 100)),
        search: String(search),
        sortBy: String(sortBy),
        sortOrder: String(sortOrder),
      }));
    } catch (error) {
      strapi.log.error('Admin dashboard - getPlayers failed:', error);
      return ctx.internalServerError('Failed to fetch players');
    }
  },

  async getPlayerDetail(ctx) {
    const { id } = ctx.params;
    if (!id || isNaN(Number(id))) return ctx.badRequest('Invalid player ID');
    try {
      const player = await svc().getPlayerDetail(Number(id));
      return player ? ctx.send(player) : ctx.notFound('Player not found');
    } catch (error) {
      strapi.log.error('Admin dashboard - getPlayerDetail failed:', error);
      return ctx.internalServerError('Failed to fetch player detail');
    }
  },

  async toggleBlockPlayer(ctx) {
    const { id } = ctx.params;
    if (!id || isNaN(Number(id))) return ctx.badRequest('Invalid player ID');
    if (Number(id) === ctx.state.user.id) return ctx.badRequest('You cannot block yourself');

    // Explicit admin role verification
    const isAdmin = await verifyAdminRole(ctx);
    if (!isAdmin) return ctx.forbidden('Admin role required');

    try {
      // Get user before toggle to know the action
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: Number(id) },
        select: ['blocked'],
      });

      if (!user) return ctx.notFound('Player not found');

      const result = await svc().toggleBlockUser(Number(id));

      // Log the action
      const action = user.blocked ? 'UNBLOCK_USER' : 'BLOCK_USER';
      await logAdminAction(ctx, action, Number(id), {
        previous_status: user.blocked,
        new_status: !user.blocked,
      });

      return result ? ctx.send(result) : ctx.notFound('Player not found');
    } catch (error) {
      strapi.log.error('Admin dashboard - toggleBlockPlayer failed:', error);
      return ctx.internalServerError('Failed to toggle block status');
    }
  },

  async changePlayerRole(ctx) {
    const { id } = ctx.params;
    const { role } = ctx.request.body;
    if (!id || isNaN(Number(id))) return ctx.badRequest('Invalid player ID');
    if (!role || !['authenticated', 'admin'].includes(role)) return ctx.badRequest('Invalid role');
    if (Number(id) === ctx.state.user.id && role !== 'admin') return ctx.badRequest('You cannot remove your own admin role');

    // Explicit admin role verification
    const isAdmin = await verifyAdminRole(ctx);
    if (!isAdmin) return ctx.forbidden('Admin role required');

    try {
      // Get user before change to know the previous role
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: Number(id) },
        populate: { role: { select: ['type'] } },
      });

      if (!user) return ctx.notFound('Player not found');

      const previousRole = user.role?.type || 'authenticated';
      const result = await svc().changeUserRole(Number(id), role);

      // Log the action
      const action = role === 'admin' ? 'CHANGE_ROLE_TO_ADMIN' : 'CHANGE_ROLE_TO_AUTHENTICATED';
      await logAdminAction(ctx, action, Number(id), {
        previous_role: previousRole,
        new_role: role,
      });

      return result ? ctx.send(result) : ctx.notFound('Player or role not found');
    } catch (error) {
      strapi.log.error('Admin dashboard - changePlayerRole failed:', error);
      return ctx.internalServerError('Failed to change player role');
    }
  },

  async getMapData(ctx) {
    try {
      return ctx.send(await svc().getMapData());
    } catch (error) {
      strapi.log.error('Admin dashboard - getMapData failed:', error);
      return ctx.internalServerError('Failed to fetch map data');
    }
  },

  async getEconomy(ctx) {
    try {
      return ctx.send(await svc().getEconomy());
    } catch (error) {
      strapi.log.error('Admin dashboard - getEconomy failed:', error);
      return ctx.internalServerError('Failed to fetch economy data');
    }
  },

  async getExpeditions(ctx) {
    try {
      return ctx.send(await svc().getExpeditions());
    } catch (error) {
      strapi.log.error('Admin dashboard - getExpeditions failed:', error);
      return ctx.internalServerError('Failed to fetch expeditions data');
    }
  },

  async getQuizAnalytics(ctx) {
    try {
      return ctx.send(await svc().getQuizAnalytics());
    } catch (error) {
      strapi.log.error('Admin dashboard - getQuizAnalytics failed:', error);
      return ctx.internalServerError('Failed to fetch quiz analytics');
    }
  },

  async getSocialStats(ctx) {
    try {
      return ctx.send(await svc().getSocialStats());
    } catch (error) {
      strapi.log.error('Admin dashboard - getSocialStats failed:', error);
      return ctx.internalServerError('Failed to fetch social stats');
    }
  },

  async getConnectionAnalytics(ctx) {
    try {
      return ctx.send(await svc().getConnectionAnalytics());
    } catch (error) {
      strapi.log.error('Admin dashboard - getConnectionAnalytics failed:', error);
      return ctx.internalServerError('Failed to fetch connection analytics');
    }
  },
};
