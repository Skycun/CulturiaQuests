export default {
  /**
   * Génération automatique du quiz quotidien à minuit (Europe/Paris)
   * - 7 QCM depuis OpenQuizzDB (fichiers locaux)
   * - 3 Timeline via Ollama (avec fallback si indisponible)
   */
  'generate-daily-quiz': {
    task: async ({ strapi }) => {
      try {
        const generator = strapi.service('api::quiz-session.quiz-generator');
        await generator.generateDailyQuiz();
      } catch (err) {
        strapi.log.error(`[cron] Erreur génération quiz : ${err instanceof Error ? err.message : err}`);
      }
    },
    options: {
      rule: '0 0 * * *',
      tz: 'Europe/Paris',
    },
  },
};
