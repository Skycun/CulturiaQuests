/**
 * admin-dashboard controller
 * All endpoints require the "admin" role
 */

const svc = () => strapi.service('api::admin-dashboard.admin-dashboard');

export default {
  async check(ctx) {
    return ctx.send({ isAdmin: true });
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
        page: Number(page), pageSize: Math.min(Number(pageSize), 100),
        search: String(search), sortBy: String(sortBy), sortOrder: String(sortOrder),
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
    try {
      const result = await svc().toggleBlockUser(Number(id));
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
    try {
      const result = await svc().changeUserRole(Number(id), role);
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
