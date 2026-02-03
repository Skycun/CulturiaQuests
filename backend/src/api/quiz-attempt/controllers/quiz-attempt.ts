import { factories } from '@strapi/strapi';

/**
 * Update the guild's quiz_streak based on consecutive days
 */
async function updateQuizStreak(
  strapi: any,
  guild: { id: number; documentId: string; quiz_streak: number | null },
  todayDate: string
) {
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
      newStreak = (guild.quiz_streak || 0) + 1;
    }
  }

  await strapi.documents('api::guild.guild').update({
    documentId: guild.documentId,
    data: { quiz_streak: newStreak },
  });

  strapi.log.info(`[QuizAttempt] Updated quiz_streak for guild ${guild.documentId}: ${newStreak}`);
  return newStreak;
}

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

    // Récupérer la guild de l'utilisateur
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['id', 'documentId'],
    });

    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    // Récupérer la session du jour
    const session = await strapi.service('api::quiz-session.quiz-session').getTodaySession();

    if (!session) {
      return ctx.notFound('No quiz available for today. Please try again later.');
    }

    // Vérifier si l'utilisateur a déjà tenté aujourd'hui
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

    // Validation des données
    if (!sessionId || !answers || !Array.isArray(answers)) {
      return ctx.badRequest('Invalid submission. sessionId and answers array required.');
    }

    // Récupérer la guild
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['id', 'documentId', 'gold', 'exp', 'quiz_streak'],
    });

    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    // Récupérer la session avec questions
    const session = await strapi.db.query('api::quiz-session.quiz-session').findOne({
      where: { documentId: sessionId },
      populate: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!session) {
      return ctx.notFound('Quiz session not found');
    }

    if (session.generation_status !== 'completed') {
      return ctx.badRequest('Quiz session is not ready yet');
    }

    // Vérifier si déjà tenté
    const existingAttempt = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
      where: {
        guild: { id: guild.id },
        session: { documentId: sessionId },
      },
    });

    if (existingAttempt) {
      return ctx.badRequest('You have already completed this quiz');
    }

    // Calculer le score
    const quizAttemptService = strapi.service('api::quiz-attempt.quiz-attempt');
    const result = quizAttemptService.calculateScore(session.questions, answers);

    // Générer les récompenses
    const rewards = await quizAttemptService.generateRewards(guild.documentId, result.totalScore);

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

    // Mettre à jour la guild: gold, exp
    await strapi.documents('api::guild.guild').update({
      documentId: guild.documentId,
      data: {
        gold: (guild.gold || 0) + rewards.gold,
        exp: String(BigInt(guild.exp || 0) + BigInt(rewards.exp)),
      },
    });

    // Mettre à jour le streak
    const newStreak = await updateQuizStreak(strapi, guild, session.date);

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

    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['id', 'documentId', 'name'],
    });

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

    // Extraire les documentIds des amis
    const friendGuildIds = friendships.map((f: any) =>
      f.requester.documentId === guild.documentId ? f.receiver.documentId : f.requester.documentId
    );

    // Ajouter soi-même pour être dans le leaderboard
    friendGuildIds.push(guild.documentId);

    // Récupérer les attempts du jour pour ces guilds
    const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: {
        session: { documentId: session.documentId },
        guild: { documentId: { $in: friendGuildIds } },
      },
      populate: {
        guild: {
          select: ['documentId', 'name', 'quiz_streak'],
          populate: {
            user: {
              select: ['username'],
            },
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    // Formater le leaderboard
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

    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['id', 'documentId'],
    });

    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
      where: { guild: { id: guild.id } },
      populate: {
        session: {
          select: ['documentId', 'date'],
        },
      },
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

  // Keep the default CRUD methods with user filtering
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

  async findOne(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be authenticated');
    }

    const { id } = ctx.params;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    sanitizedQuery.filters = {
      ...((sanitizedQuery.filters as any) || {}),
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
