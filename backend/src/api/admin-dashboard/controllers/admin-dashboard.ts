/**
 * admin-dashboard controller
 * All endpoints require the "admin" role
 */

export default {
  /**
   * GET /admin-dashboard/check
   * Lightweight endpoint to verify admin access.
   * If the user reaches this handler, they have the admin permission.
   */
  async check(ctx) {
    return ctx.send({ isAdmin: true });
  },

  /**
   * GET /admin-dashboard/overview
   * Returns global KPIs for the dashboard home
   */
  async getOverview(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    try {
      const overview = await strapi.service('api::admin-dashboard.admin-dashboard').getOverview();
      return ctx.send(overview);
    } catch (error) {
      strapi.log.error('Admin dashboard - getOverview failed:', error);
      return ctx.internalServerError('Failed to fetch dashboard overview');
    }
  },

  /**
   * GET /admin-dashboard/players
   * Returns paginated player list with guild info
   */
  async getPlayers(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { page = 1, pageSize = 25, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = ctx.query;

    try {
      const players = await strapi.service('api::admin-dashboard.admin-dashboard').getPlayers({
        page: Number(page),
        pageSize: Math.min(Number(pageSize), 100),
        search: String(search),
        sortBy: String(sortBy),
        sortOrder: String(sortOrder),
      });
      return ctx.send(players);
    } catch (error) {
      strapi.log.error('Admin dashboard - getPlayers failed:', error);
      return ctx.internalServerError('Failed to fetch players');
    }
  },

  /**
   * GET /admin-dashboard/players/:id
   * Returns detailed player info
   */
  async getPlayerDetail(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { id } = ctx.params;
    if (!id || isNaN(Number(id))) {
      return ctx.badRequest('Invalid player ID');
    }

    try {
      const player = await strapi.service('api::admin-dashboard.admin-dashboard').getPlayerDetail(Number(id));
      if (!player) {
        return ctx.notFound('Player not found');
      }
      return ctx.send(player);
    } catch (error) {
      strapi.log.error('Admin dashboard - getPlayerDetail failed:', error);
      return ctx.internalServerError('Failed to fetch player detail');
    }
  },

  /**
   * PUT /admin-dashboard/players/:id/toggle-block
   * Toggles block status for a user
   */
  async toggleBlockPlayer(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { id } = ctx.params;
    if (!id || isNaN(Number(id))) {
      return ctx.badRequest('Invalid player ID');
    }

    // Prevent self-blocking
    if (Number(id) === user.id) {
      return ctx.badRequest('You cannot block yourself');
    }

    try {
      const result = await strapi.service('api::admin-dashboard.admin-dashboard').toggleBlockUser(Number(id));
      if (!result) {
        return ctx.notFound('Player not found');
      }
      return ctx.send(result);
    } catch (error) {
      strapi.log.error('Admin dashboard - toggleBlockPlayer failed:', error);
      return ctx.internalServerError('Failed to toggle block status');
    }
  },

  /**
   * PUT /admin-dashboard/players/:id/role
   * Changes user role
   */
  async changePlayerRole(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { id } = ctx.params;
    const { role } = ctx.request.body;

    if (!id || isNaN(Number(id))) {
      return ctx.badRequest('Invalid player ID');
    }

    if (!role || !['authenticated', 'admin'].includes(role)) {
      return ctx.badRequest('Invalid role. Must be "authenticated" or "admin"');
    }

    // Prevent self-demotion
    if (Number(id) === user.id && role !== 'admin') {
      return ctx.badRequest('You cannot remove your own admin role');
    }

    try {
      const result = await strapi.service('api::admin-dashboard.admin-dashboard').changeUserRole(Number(id), role);
      if (!result) {
        return ctx.notFound('Player or role not found');
      }
      return ctx.send(result);
    } catch (error) {
      strapi.log.error('Admin dashboard - changePlayerRole failed:', error);
      return ctx.internalServerError('Failed to change player role');
    }
  },
};
