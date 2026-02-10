import type { Core } from '@strapi/strapi';

/**
 * Helper: grants a list of permission actions to a role (idempotent)
 */
async function grantPermissions(strapi: Core.Strapi, roleId: number, actions: string[], roleName: string) {
  for (const action of actions) {
    const permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
      where: {
        action,
        role: roleId,
      },
    });

    if (!permission) {
      await strapi.db.query('plugin::users-permissions.permission').create({
        data: {
          action,
          role: roleId,
        },
      });
      strapi.log.info(`Granted ${action} permission to ${roleName} role`);
    }
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Grant permissions to Public role (unauthenticated users)
    const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });

    if (publicRole) {
      await grantPermissions(strapi, publicRole.id, [
        'plugin::users-permissions.auth.register',
        'api::character.character.getCharacterIcons',
      ], 'Public');
    }

    // Grant custom permissions to Authenticated role
    const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    if (authenticatedRole) {
      await grantPermissions(strapi, authenticatedRole.id, [
        'api::guild.guild.setup',
        'api::item.item.getItemIcons',
        'api::museum.museum.find',
        'api::museum.museum.findOne',
        'api::poi.poi.find',
        'api::poi.poi.findOne',
        'api::tag.tag.find',
        'api::tag.tag.findOne',
        'api::statistic.statistic.getSummary',
        'api::visit.visit.openChest',
        'api::run.run.startExpedition',
        'api::run.run.endExpedition',
        'api::run.run.getActiveRun',
        // Player friendship permissions
        'api::player-friendship.player-friendship.find',
        'api::player-friendship.player-friendship.searchUser',
        'api::player-friendship.player-friendship.sendRequest',
        'api::player-friendship.player-friendship.acceptRequest',
        'api::player-friendship.player-friendship.rejectRequest',
        'api::player-friendship.player-friendship.removeFriend',
        'api::player-friendship.player-friendship.toggleFriendRequests',
        // Upload plugin — nécessaire pour POST /api/upload
        'plugin::upload.file.create',
        // User settings permissions
        'api::user-settings.user-settings.getSettings',
        'api::user-settings.user-settings.updateSettings',
        'api::user-settings.user-settings.uploadAvatar',
        'api::user-settings.user-settings.removeAvatar',
        // Quiz permissions
        'api::quiz-session.quiz-session.find',
        'api::quiz-session.quiz-session.findOne',
        'api::quiz-question.quiz-question.find',
        'api::quiz-question.quiz-question.findOne',
        'api::quiz-attempt.quiz-attempt.find',
        'api::quiz-attempt.quiz-attempt.findOne',
        'api::quiz-attempt.quiz-attempt.create',
        'api::quiz-attempt.quiz-attempt.getTodayQuiz',
        'api::quiz-attempt.quiz-attempt.submitQuiz',
        'api::quiz-attempt.quiz-attempt.getTodayLeaderboard',
        'api::quiz-attempt.quiz-attempt.getMyHistory',
      ], 'Authenticated');
    }

    // Create and configure the Admin role
    let adminRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'admin' },
    });

    if (!adminRole) {
      adminRole = await strapi.db.query('plugin::users-permissions.role').create({
        data: {
          name: 'Admin',
          description: 'Administrator role with access to the admin dashboard',
          type: 'admin',
        },
      });
      strapi.log.info('Created Admin role for users-permissions');
    }

    if (adminRole && authenticatedRole) {
      // Copy ALL permissions from authenticated role to admin role
      // This includes both bootstrap-defined and admin-panel-configured permissions
      const authPermissions = await strapi.db.query('plugin::users-permissions.permission').findMany({
        where: { role: authenticatedRole.id },
        select: ['action'],
      });

      const authActions = authPermissions.map((p) => p.action);

      // Admin dashboard specific endpoints
      const adminOnlyActions = [
        'api::admin-dashboard.admin-dashboard.check',
        'api::admin-dashboard.admin-dashboard.getOverview',
        'api::admin-dashboard.admin-dashboard.getPlayers',
        'api::admin-dashboard.admin-dashboard.getPlayerDetail',
        'api::admin-dashboard.admin-dashboard.toggleBlockPlayer',
        'api::admin-dashboard.admin-dashboard.changePlayerRole',
        'api::admin-dashboard.admin-dashboard.getMapData',
        'api::admin-dashboard.admin-dashboard.getEconomy',
        'api::admin-dashboard.admin-dashboard.getExpeditions',
        'api::admin-dashboard.admin-dashboard.getQuizAnalytics',
        'api::admin-dashboard.admin-dashboard.getSocialStats',
      ];

      // Merge: all authenticated permissions + admin-only permissions
      const allAdminActions = [...new Set([...authActions, ...adminOnlyActions])];

      await grantPermissions(strapi, adminRole.id, allAdminActions, 'Admin');
    }
  },
};
