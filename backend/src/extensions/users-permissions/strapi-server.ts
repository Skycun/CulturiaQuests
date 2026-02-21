/**
 * Extension of the users-permissions plugin.
 * - Wraps the auth callback to log each successful login as a connection-log entry.
 * - Wraps auth register to validate date_of_birth (minimum age: 15).
 */
export default (plugin) => {
  // --- Login logging ---
  const originalCallback = plugin.controllers.auth.callback;

  plugin.controllers.auth.callback = async (ctx) => {
    await originalCallback(ctx);

    // After a successful login, ctx.body contains { jwt, user }
    if (ctx.body && ctx.body.jwt && ctx.body.user) {
      try {
        await strapi.db.query('api::connection-log.connection-log').create({
          data: {
            user: ctx.body.user.id,
            connected_at: new Date(),
          },
        });
      } catch (err) {
        strapi.log.warn('Failed to log connection event:', err.message);
      }
    }
  };

  // --- Register validation: date_of_birth (min 15 years old) ---
  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx) => {
    const { date_of_birth } = ctx.request.body;

    if (!date_of_birth) {
      return ctx.badRequest('La date de naissance est obligatoire.');
    }

    const birthDate = new Date(date_of_birth);
    if (isNaN(birthDate.getTime())) {
      return ctx.badRequest('La date de naissance est invalide.');
    }

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 15) {
      return ctx.badRequest('Vous devez avoir au moins 15 ans pour vous inscrire.');
    }

    return originalRegister(ctx);
  };

  return plugin;
};
