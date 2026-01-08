import type { Core } from '@strapi/strapi';

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
      const actions = [
        'plugin::users-permissions.auth.register',
        'api::character.character.getCharacterIcons'
      ];

      for (const action of actions) {
        const permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
          where: {
            action,
            role: publicRole.id,
          },
        });

        if (!permission) {
          await strapi.db.query('plugin::users-permissions.permission').create({
            data: {
              action,
              role: publicRole.id,
            },
          });
          strapi.log.info(`Granted ${action} permission to Public role`);
        }
      }
    }

    // Grant custom permissions to Authenticated role
    const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    if (authenticatedRole) {
      const actions = [
        'api::guild.guild.setup',
        'api::item.item.getItemIcons',
        'api::museum.museum.find',
        'api::museum.museum.findOne',
        'api::poi.poi.find',
        'api::poi.poi.findOne',
        'api::tag.tag.find',
        'api::tag.tag.findOne'
      ];

      for (const action of actions) {
        const permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
          where: {
            action,
            role: authenticatedRole.id,
          },
        });

        if (!permission) {
          await strapi.db.query('plugin::users-permissions.permission').create({
            data: {
              action,
              role: authenticatedRole.id,
            },
          });
          strapi.log.info(`Granted ${action} permission to Authenticated role`);
        }
      }
    }
  },
};
