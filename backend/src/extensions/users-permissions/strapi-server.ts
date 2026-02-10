/**
 * Extension of the users-permissions plugin.
 * Wraps the auth callback to log each successful login as a connection-log entry.
 */
export default (plugin) => {
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

  return plugin;
};
