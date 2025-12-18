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
    // Helper function to seed data
    const seedData = async (contentType: string, names: string[], typeName: string) => {
      for (const name of names) {
        const existing = await strapi.db.query(contentType).findOne({
          where: { name },
        });

        if (!existing) {
          await (strapi.entityService as any).create(contentType, {
            data: {
              name,
              publishedAt: new Date(),
            },
          });
          strapi.log.info(`Created ${typeName}: ${name}`);
        }
      }
    };

    // Seed rarity data
    const rarityNames = ['Commun', 'Rare', 'Épique', 'Légendaire'];
    await seedData('api::rarity.rarity', rarityNames, 'rarity');

    // Seed tag data
    const tagNames = ['Histoire', 'Art', 'Sciences', 'Nature', 'Société', 'Savoir-Faire'];
    await seedData('api::tag.tag', tagNames, 'tag');

    // Seed NPC data
    const npcData = [
      { firstname: 'Malori', lastname: 'Marnett', pronouns: 'she', quests_entry_available: 2, expedition_entry_available: 2 },
      { firstname: 'Garen', lastname: 'Fouldier', pronouns: 'he', quests_entry_available: 2, expedition_entry_available: 2 },
      { firstname: 'Toben', lastname: 'Montivert', pronouns: 'he', quests_entry_available: 2, expedition_entry_available: 2 },
      { firstname: 'Denrick', lastname: 'Largent', pronouns: 'he', quests_entry_available: 2, expedition_entry_available: 2 },
      { firstname: 'Marn', lastname: 'Thobas', pronouns: 'he', quests_entry_available: 2, expedition_entry_available: 2 },
      { firstname: 'Bram', lastname: 'Thobas', pronouns: 'he', quests_entry_available: 2, expedition_entry_available: 2 },
      { firstname: 'Toren', lastname: 'Brauvin', pronouns: 'he', quests_entry_available: 2, expedition_entry_available: 2 },
    ];

    for (const npc of npcData) {
      const existing = await strapi.db.query('api::npc.npc').findOne({
        where: { firstname: npc.firstname, lastname: npc.lastname },
      });

      if (!existing) {
        await (strapi.entityService as any).create('api::npc.npc', {
          data: {
            ...npc,
            publishedAt: new Date(),
          },
        });
        strapi.log.info(`Created NPC: ${npc.firstname} ${npc.lastname}`);
      }
    }

    strapi.log.info('Data seeding completed');

    // Grant 'register' permission to Public role to allow sign-up
    const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });

    if (publicRole) {
      const action = 'plugin::users-permissions.auth.register';
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
        strapi.log.info('Granted register permission to Public role');
      }
    }

    // Grant custom permissions to Authenticated role
    const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    if (authenticatedRole) {
      const actions = [
        'api::guild.guild.setup',
        'api::item.item.getItemIcons'
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
