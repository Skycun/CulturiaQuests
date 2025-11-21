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
    // Seed rarity data
    const rarityNames = ['Commun', 'Rare', 'Epic', 'Legendaire'];
    
    for (const name of rarityNames) {
      const existingRarity = await strapi.db.query('api::rarity.rarity').findOne({
        where: { name },
      });

      if (!existingRarity) {
        await strapi.db.query('api::rarity.rarity').create({
          data: {
            name,
            publishedAt: new Date(),
          },
        });
        strapi.log.info(`Created rarity: ${name}`);
      }
    }

    // Seed tag data
    const tagNames = ['Histoire', 'Art', 'Sciences', 'Nature', 'Société', 'Savoir Faire'];
    
    for (const name of tagNames) {
      const existingTag = await strapi.db.query('api::tag.tag').findOne({
        where: { name },
      });

      if (!existingTag) {
        await strapi.db.query('api::tag.tag').create({
          data: {
            name,
            publishedAt: new Date(),
          },
        });
        strapi.log.info(`Created tag: ${name}`);
      }
    }

    strapi.log.info('Data seeding completed');
  },
};
