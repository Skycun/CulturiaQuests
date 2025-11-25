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
    const tagNames = ['Histoire', 'Art', 'Sciences', 'Nature', 'Société', 'Savoir Faire'];
    await seedData('api::tag.tag', tagNames, 'tag');

    // Seed NPC data
    const npcData = [
      { firstname: 'Malori', lastname: 'Marnett', professions: 'Postière', pronouns: 'she', entry_count: 3 },
      { firstname: 'Garen', lastname: 'Fouldier', professions: 'Chasseur', pronouns: 'he', entry_count: 3 },
      { firstname: 'Toben', lastname: 'Montivert', professions: 'Meunier', pronouns: 'he', entry_count: 3 },
      { firstname: 'Denrick', lastname: 'Largent', professions: 'Forgeron', pronouns: 'he', entry_count: 3 },
      { firstname: 'Marn', lastname: 'Thobas', professions: 'Pécheur', pronouns: 'he', entry_count: 3 },
      { firstname: 'Bram', lastname: 'Thobas', professions: 'Boucher', pronouns: 'he', entry_count: 3 },
      { firstname: 'Toren', lastname: 'Brauvin', professions: 'Architecte', pronouns: 'he', entry_count: 3 },
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
  },
};
