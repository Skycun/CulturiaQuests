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
    const publishedAt = new Date();

    // Helper function to seed data
    const seedData = async (contentType: string, names: string[], typeName: string) => {
      for (const name of names) {
        const existing = await strapi.db.query(contentType).findOne({
          where: { name },
        });

        if (!existing) {
          await strapi.db.query(contentType).create({
            data: {
              name,
              publishedAt,
            },
          });
          strapi.log.info(`Created ${typeName}: ${name}`);
        }
      }
    };

    // Seed rarity data
    const rarityNames = ['Commun', 'Rare', 'Epic', 'Legendaire'];
    await seedData('api::rarity.rarity', rarityNames, 'rarity');

    // Seed tag data
    const tagNames = ['Histoire', 'Art', 'Sciences', 'Nature', 'Société', 'Savoir Faire'];
    await seedData('api::tag.tag', tagNames, 'tag');

    strapi.log.info('Data seeding completed');
  },
};
