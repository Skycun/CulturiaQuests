import { factories } from '@strapi/strapi';

/**
 * Update the guild's quiz_streak based on consecutive days
 */
async function updateQuizStreak(
  strapi: any,
  guild: { id: number; documentId: string; quiz_streak: number | null },
  todayDate: string
) {
  // Get the most recent attempt before today for this guild
  const previousAttempt = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
    where: {
      guild: { id: guild.id },
      session: {
        date: { $ne: todayDate },
      },
    },
    orderBy: { completed_at: 'desc' },
    populate: ['session'],
  });

  let newStreak = 1;

  if (previousAttempt?.session?.date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (previousAttempt.session.date === yesterdayStr) {
      // Consecutive day - increment streak
      newStreak = (guild.quiz_streak || 0) + 1;
    }
    // Otherwise reset to 1 (already set)
  }

  // Update guild
  await strapi.documents('api::guild.guild').update({
    documentId: guild.documentId,
    data: { quiz_streak: newStreak },
  });

  strapi.log.info(`[QuizAttempt] Updated quiz_streak for guild ${guild.documentId}: ${newStreak}`);
}

export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  /**
   * Create a quiz attempt - validates one attempt per day per guild
   */
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    // Get the guild for this user
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['id', 'documentId', 'quiz_streak'],
    });

    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    // Get session from request body
    const { data } = ctx.request.body;
    if (!data?.session) {
      return ctx.badRequest('Session is required');
    }

    const sessionDocumentId = data.session;

    // Check if the session exists and is completed
    const session = await strapi.db.query('api::quiz-session.quiz-session').findOne({
      where: { documentId: sessionDocumentId },
      select: ['id', 'documentId', 'generation_status', 'date'],
    });

    if (!session) {
      return ctx.notFound('Quiz session not found');
    }

    if (session.generation_status !== 'completed') {
      return ctx.badRequest('Quiz session is not ready yet');
    }

    // Check if an attempt already exists for this guild + session
    const existingAttempt = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
      where: {
        guild: { id: guild.id },
        session: { documentId: sessionDocumentId },
      },
      select: ['id'],
    });

    if (existingAttempt) {
      return ctx.badRequest('You have already submitted an attempt for this quiz session');
    }

    // Force the guild to be the authenticated user's guild (prevent spoofing)
    ctx.request.body.data.guild = guild.documentId;

    // Set completed_at if not provided
    if (!ctx.request.body.data.completed_at) {
      ctx.request.body.data.completed_at = new Date().toISOString();
    }

    // Proceed with creation
    const result = await super.create(ctx);

    // Update quiz_streak
    await updateQuizStreak(strapi, guild, session.date);

    return result;
  },

  /**
   * Find attempts - restricts to user's guild
   */
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    const sanitizedQuery = await this.sanitizeQuery(ctx);

    // Filter to only show the user's guild attempts
    sanitizedQuery.filters = {
      ...(sanitizedQuery.filters as any || {}),
      guild: {
        user: {
          id: user.id,
        },
      },
    };

    const results = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Find one attempt - restricts to user's guild
   */
  async findOne(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    const { id } = ctx.params;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    sanitizedQuery.filters = {
      ...(sanitizedQuery.filters as any || {}),
      guild: {
        user: {
          id: user.id,
        },
      },
    };

    const document = await strapi.documents('api::quiz-attempt.quiz-attempt').findOne({
      documentId: id,
      ...sanitizedQuery,
    });

    if (!document) {
      return ctx.notFound('Attempt not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
