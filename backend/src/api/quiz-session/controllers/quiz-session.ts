import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz-session.quiz-session', ({ strapi }) => ({
  /**
   * POST /api/quiz-sessions/generate
   * Endpoint pour déclencher manuellement la génération du quiz quotidien (admin uniquement)
   */
  async generate(ctx) {
    try {
      const generator = strapi.service('api::quiz-session.quiz-generator');
      await generator.generateDailyQuiz();

      const today = new Date().toISOString().split('T')[0];
      const session = await strapi.db.query('api::quiz-session.quiz-session').findOne({
        where: { date: today },
        populate: {
          questions: {
            orderBy: { order: 'asc' },
            populate: ['tag'],
          },
        },
      });

      ctx.body = {
        message: 'Quiz généré',
        session: session ? {
          date: session.date,
          status: session.generation_status,
          error: session.generation_error,
          questionsCount: session.questions?.length || 0,
          questions: session.questions?.map((q) => ({
            order: q.order,
            type: q.question_type,
            tag: q.tag?.name || null,
            question: q.question_text,
            correctAnswer: q.correct_answer,
            options: q.options,
            timelineRange: q.timeline_range,
            explanation: q.explanation,
          })),
        } : null,
      };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },
}));
