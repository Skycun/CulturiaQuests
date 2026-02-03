import { factories } from '@strapi/strapi';

interface Question {
  documentId: string;
  question_text: string;
  question_type: 'qcm' | 'timeline';
  correct_answer: string;
  explanation?: string;
}

interface UserAnswer {
  questionId: string;
  answer: string;
}

interface DetailedAnswer {
  questionId: string;
  questionText: string;
  userAnswer: string | null;
  correctAnswer: string;
  score: number;
  isCorrect: boolean;
  explanation: string | null;
}

export default factories.createCoreService('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  /**
   * Calcule le score basé sur les réponses
   */
  calculateScore(questions: Question[], userAnswers: UserAnswer[]) {
    let totalScore = 0;
    const detailedAnswers: DetailedAnswer[] = [];

    for (const question of questions) {
      const userAnswer = userAnswers.find((a) => a.questionId === question.documentId);

      if (!userAnswer) {
        detailedAnswers.push({
          questionId: question.documentId,
          questionText: question.question_text,
          userAnswer: null,
          correctAnswer: question.correct_answer,
          score: 0,
          isCorrect: false,
          explanation: question.explanation || null,
        });
        continue;
      }

      let score = 0;
      let isCorrect = false;

      if (question.question_type === 'qcm') {
        // QCM: 200 points si correct, 0 sinon
        isCorrect = userAnswer.answer === question.correct_answer;
        score = isCorrect ? 200 : 0;
      } else if (question.question_type === 'timeline') {
        // Timeline: scoring proportionnel à la distance
        const correctYear = parseInt(question.correct_answer);
        const userYear = parseInt(userAnswer.answer);
        const distance = Math.abs(correctYear - userYear);

        if (distance === 0) {
          // Date exacte: 200 + 50 bonus
          score = 250;
          isCorrect = true;
        } else if (distance <= 5) {
          // ≤5 ans: 150-199 points
          score = 200 - distance * 10;
        } else if (distance <= 20) {
          // ≤20 ans: 50-140 points
          score = 150 - distance * 5;
        } else if (distance <= 50) {
          // ≤50 ans: 0-45 points
          score = 50 - distance;
        } else {
          // >50 ans: 0 points
          score = 0;
        }

        score = Math.max(0, score);
      }

      totalScore += score;

      detailedAnswers.push({
        questionId: question.documentId,
        questionText: question.question_text,
        userAnswer: userAnswer.answer,
        correctAnswer: question.correct_answer,
        score,
        isCorrect,
        explanation: question.explanation || null,
      });
    }

    return { totalScore, detailedAnswers };
  },

  /**
   * Génère des récompenses aléatoires basées sur le score
   */
  async generateRewards(guildDocumentId: string, score: number) {
    // Déterminer le tier basé sur le score
    let tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    if (score >= 1800) tier = 'platinum'; // 90%+
    else if (score >= 1400) tier = 'gold'; // 70-89%
    else if (score >= 1000) tier = 'silver'; // 50-69%
    else tier = 'bronze'; // <50%

    // Ranges de récompenses par tier
    const tierRewards = {
      bronze: { goldMin: 50, goldMax: 100, expMin: 100, expMax: 200 },
      silver: { goldMin: 100, goldMax: 200, expMin: 200, expMax: 400 },
      gold: { goldMin: 200, goldMax: 350, expMin: 400, expMax: 700 },
      platinum: { goldMin: 300, goldMax: 500, expMin: 600, expMax: 1000 },
    };

    const tierData = tierRewards[tier];

    // Générer gold aléatoire
    const gold = Math.floor(Math.random() * (tierData.goldMax - tierData.goldMin + 1)) + tierData.goldMin;

    // Générer XP aléatoire
    const exp = Math.floor(Math.random() * (tierData.expMax - tierData.expMin + 1)) + tierData.expMin;

    // Générer 1-2 items aléatoires
    const itemCount = Math.random() < 0.5 ? 1 : 2;
    const items: Array<{ documentId: string; name: string; rarity: string }> = [];

    // Récupérer le maxFloor pour la génération d'items
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { documentId: guildDocumentId },
      select: ['id'],
    });

    if (guild) {
      const runs = await strapi.db.query('api::run.run').findMany({
        where: { guild: { id: guild.id } },
        select: ['threshold_reached'],
      });
      const maxFloor = runs.reduce((max: number, run: { threshold_reached?: number }) => {
        return run.threshold_reached && run.threshold_reached > max ? run.threshold_reached : max;
      }, 1);

      // Générer items avec le service existant
      for (let i = 0; i < itemCount; i++) {
        try {
          const item = await strapi.service('api::item.item').generateRandomItem(guildDocumentId, maxFloor);

          items.push({
            documentId: item.documentId,
            name: item.name,
            rarity: item.rarity?.name || 'common',
          });
        } catch (err) {
          strapi.log.warn('[QuizRewards] Failed to generate item:', err);
        }
      }
    }

    return {
      tier,
      gold,
      exp,
      items,
    };
  },
}));
