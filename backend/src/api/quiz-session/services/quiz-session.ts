import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::quiz-session.quiz-session', ({ strapi }) => ({
  /**
   * Récupère la session du jour avec ses questions
   */
  async getTodaySession() {
    const today = new Date().toISOString().split('T')[0];

    const session = await strapi.db.query('api::quiz-session.quiz-session').findOne({
      where: { date: today, generation_status: 'completed' },
      populate: {
        questions: {
          orderBy: { order: 'asc' },
          populate: ['tag'],
        },
      },
    });

    return session;
  },
}));
