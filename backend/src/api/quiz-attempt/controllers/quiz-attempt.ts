import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  /**
   * GET /api/quiz-attempts/today
   * Récupère le quiz du jour (sans les réponses correctes)
   */
  async getTodayQuiz(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const service = strapi.service('api::quiz-attempt.quiz-attempt');

    // R1 — Utilise le helper du service
    const guild = await service.getUserGuild(user.id);
    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    const session = await strapi.service('api::quiz-session.quiz-session').getTodaySession();
    if (!session) {
      return ctx.notFound('No quiz available for today. Please try again later.');
    }

    // Vérifier si déjà tenté
    const existingAttempt = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
      where: {
        guild: { id: guild.id },
        session: { documentId: session.documentId },
      },
      select: ['id', 'documentId', 'score', 'completed_at', 'time_spent_seconds'],
    });

    if (existingAttempt) {
      return ctx.send({
        data: {
          alreadyCompleted: true,
          attempt: existingAttempt,
        },
      });
    }

    // Retirer les réponses correctes et explications
    const safeQuestions = session.questions.map((q: any) => ({
      documentId: q.documentId,
      question_text: q.question_text,
      question_type: q.question_type,
      order: q.order,
      options: q.options,
      timeline_range: q.timeline_range,
      tag: q.tag ? { documentId: q.tag.documentId, name: q.tag.name } : null,
    }));

    return ctx.send({
      data: {
        alreadyCompleted: false,
        sessionId: session.documentId,
        date: session.date,
        questions: safeQuestions,
      },
    });
  },

  /**
   * POST /api/quiz-attempts/submit
   * Soumet les réponses du quiz
   */
  async submitQuiz(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { sessionId, answers, timeSpentSeconds } = ctx.request.body;

    if (!sessionId || !answers || !Array.isArray(answers)) {
      return ctx.badRequest('Invalid submission. sessionId and answers array required.');
    }

    const service = strapi.service('api::quiz-attempt.quiz-attempt');

    // R1 — Utilise le helper du service
    const guild = await service.getUserGuild(user.id, ['id', 'documentId', 'gold', 'exp', 'quiz_streak']);
    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    const session = await strapi.db.query('api::quiz-session.quiz-session').findOne({
      where: { documentId: sessionId },
      populate: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!session) {
      return ctx.notFound('Quiz session not found');
    }

    if (session.generation_status !== 'completed') {
      return ctx.badRequest('Quiz session is not ready yet');
    }

    // Vérifier si déjà tenté
    const alreadyAttempted = await service.hasExistingAttempt(guild.id, sessionId);
    if (alreadyAttempted) {
      return ctx.badRequest('You have already completed this quiz');
    }

    // Calculer score et générer récompenses
    const result = service.calculateScore(session.questions, answers);
    const rewards = await service.generateRewards(guild.documentId, result.totalScore);

    // Créer l'attempt
    const attempt = await strapi.documents('api::quiz-attempt.quiz-attempt').create({
      data: {
        guild: guild.documentId,
        session: sessionId,
        score: result.totalScore,
        answers: result.detailedAnswers,
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpentSeconds || null,
        rewards: rewards,
      },
    });

    // R2 — Utilise les méthodes du service pour appliquer rewards et streak
    await service.applyRewardsToGuild(guild.documentId, guild.gold, guild.exp, rewards);
    const newStreak = await service.updateQuizStreak(guild, session.date);

    return ctx.send({
      data: {
        attempt: {
          documentId: attempt.documentId,
          score: result.totalScore,
          completed_at: attempt.completed_at,
        },
        score: result.totalScore,
        rewards,
        detailedAnswers: result.detailedAnswers,
        newStreak,
      },
    });
  },

  /**
   * GET /api/quiz-attempts/leaderboard
   * Récupère le leaderboard du quiz d'aujourd'hui (amis uniquement)
   */
  async getTodayLeaderboard(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const service = strapi.service('api::quiz-attempt.quiz-attempt');

    // R1 — Utilise le helper du service
    const guild = await service.getUserGuild(user.id, ['id', 'documentId', 'name']);
    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    const session = await strapi.service('api::quiz-session.quiz-session').getTodaySession();
    if (!session) {
      return ctx.send({ data: [] });
    }

    // Récupérer les amitiés acceptées
    const friendships = await strapi.db.query('api::player-friendship.player-friendship').findMany({
      where: {
        status: 'accepted',
        $or: [{ requester: { documentId: guild.documentId } }, { receiver: { documentId: guild.documentId } }],
      },
      populate: {
        requester: { select: ['documentId'] },
        receiver: { select: ['documentId'] },
      },
    });

    const friendGuildIds = friendships.map((f: any) =>
      f.requester.documentId === guild.documentId ? f.receiver.documentId : f.requester.documentId
    );
    friendGuildIds.push(guild.documentId);

    const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: {
        session: { documentId: session.documentId },
        guild: { documentId: { $in: friendGuildIds } },
      },
      populate: {
        guild: {
          select: ['documentId', 'name', 'quiz_streak'],
          populate: { user: { select: ['username'] } },
        },
      },
      orderBy: { score: 'desc' },
    });

    const leaderboard = attempts.map((attempt: any, index: number) => ({
      rank: index + 1,
      username: attempt.guild.user?.username || 'Unknown',
      guildName: attempt.guild.name,
      score: attempt.score,
      streak: attempt.guild.quiz_streak || 0,
      isMe: attempt.guild.documentId === guild.documentId,
    }));

    return ctx.send({ data: leaderboard });
  },

  /**
   * GET /api/quiz-attempts/history
   * Récupère l'historique des tentatives de l'utilisateur
   */
  async getMyHistory(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { limit = 30 } = ctx.query;
    const sanitizedLimit = Math.min(Math.max(parseInt(limit as string) || 30, 1), 100);

    const service = strapi.service('api::quiz-attempt.quiz-attempt');

    // R1 — Utilise le helper du service
    const guild = await service.getUserGuild(user.id);
    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: { guild: { id: guild.id } },
      populate: { session: { select: ['documentId', 'date'] } },
      orderBy: { completed_at: 'desc' },
      limit: sanitizedLimit,
    });

    const history = attempts.map((attempt: any) => ({
      documentId: attempt.documentId,
      date: attempt.session?.date,
      score: attempt.score,
      rewards: attempt.rewards,
      completed_at: attempt.completed_at,
      time_spent_seconds: attempt.time_spent_seconds,
    }));

    return ctx.send({ data: history });
  },

  // CRUD overrides avec filtrage utilisateur
  async create(ctx) {
    return ctx.badRequest('Use POST /api/quiz-attempts/submit instead');
  },

  async find(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    const sanitizedQuery = await this.sanitizeQuery(ctx);
    sanitizedQuery.filters = {
      ...((sanitizedQuery.filters as any) || {}),
      guild: { user: { id: user.id } },
    };

    const results = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    const { id } = ctx.params;
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    sanitizedQuery.filters = {
      ...((sanitizedQuery.filters as any) || {}),
      guild: { user: { id: user.id } },
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
