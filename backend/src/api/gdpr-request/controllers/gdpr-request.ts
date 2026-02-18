export default {
  async requestData(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const existing = await strapi.db.query('api::gdpr-request.gdpr-request').findOne({
      where: { user: user.id, status: 'pending' },
    });

    if (existing) {
      return ctx.send({ message: 'Une demande est déjà en cours.' });
    }

    await strapi.db.query('api::gdpr-request.gdpr-request').create({
      data: { user: user.id, status: 'pending', ip_address: ctx.request.ip },
    });

    return ctx.send({ message: 'Demande enregistrée. Vous serez contacté par email.' });
  },
};
