import { factories } from '@strapi/strapi';

// ============================================================================
// Types
// ============================================================================

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

interface GuildBasic {
  id: number;
  documentId: string;
}

interface GuildWithStats extends GuildBasic {
  gold?: number;
  exp?: string | number;
  quiz_streak?: number | null;
}

// ============================================================================
// Constants (R3)
// ============================================================================

const TIER_THRESHOLDS = {
  platinum: 1800, // 90%+
  gold: 1400, // 70-89%
  silver: 1000, // 50-69%
  // bronze: < 1000
} as const;

const TIER_REWARDS = {
  bronze: { goldMin: 50, goldMax: 100, expMin: 100, expMax: 200 },
  silver: { goldMin: 100, goldMax: 200, expMin: 200, expMax: 400 },
  gold: { goldMin: 200, goldMax: 350, expMin: 400, expMax: 700 },
  platinum: { goldMin: 300, goldMax: 500, expMin: 600, expMax: 1000 },
} as const;

const QCM_POINTS = 200;
const TIMELINE_EXACT_BONUS = 50;

// ============================================================================
// Helpers
// ============================================================================

function calculateTimelineScore(correctYear: number, userYear: number): { score: number; isCorrect: boolean } {
  const distance = Math.abs(correctYear - userYear);

  if (distance === 0) {
    return { score: QCM_POINTS + TIMELINE_EXACT_BONUS, isCorrect: true };
  } else if (distance <= 5) {
    return { score: 200 - distance * 10, isCorrect: false };
  } else if (distance <= 20) {
    return { score: 150 - distance * 5, isCorrect: false };
  } else if (distance <= 50) {
    return { score: Math.max(0, 50 - distance), isCorrect: false };
  }
  return { score: 0, isCorrect: false };
}

function determineTier(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (score >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (score >= TIER_THRESHOLDS.gold) return 'gold';
  if (score >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// Service
// ============================================================================

export default factories.createCoreService('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  /**
   * R1 — Récupère la guild d'un utilisateur (helper réutilisable)
   */
  async getUserGuild(userId: number, select: string[] = ['id', 'documentId']): Promise<GuildBasic | null> {
    return strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: userId } },
      select,
    });
  },

  /**
   * Vérifie si un attempt existe déjà pour une guild/session
   */
  async hasExistingAttempt(guildId: number, sessionDocumentId: string): Promise<boolean> {
    const existing = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
      where: {
        guild: { id: guildId },
        session: { documentId: sessionDocumentId },
      },
      select: ['id'],
    });
    return !!existing;
  },

  /**
   * Récupère le maxFloor atteint par une guild (pour item scaling)
   */
  async getGuildMaxFloor(guildId: number): Promise<number> {
    const runs = await strapi.db.query('api::run.run').findMany({
      where: { guild: { id: guildId } },
      select: ['threshold_reached'],
    });
    return runs.reduce((max: number, run: { threshold_reached?: number }) => {
      return run.threshold_reached && run.threshold_reached > max ? run.threshold_reached : max;
    }, 1);
  },

  /**
   * R2 — Met à jour le quiz_streak de la guild (déplacé du controller)
   */
  async updateQuizStreak(
    guild: { id: number; documentId: string; quiz_streak?: number | null },
    todayDate: string
  ): Promise<number> {
    const previousAttempt = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
      where: {
        guild: { id: guild.id },
        session: { date: { $ne: todayDate } },
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
  },

  /**
   * Applique les récompenses à la guild (gold + exp)
   */
  async applyRewardsToGuild(
    guildDocumentId: string,
    currentGold: number,
    currentExp: string | number,
    rewards: { gold: number; exp: number }
  ): Promise<void> {
    // Valider et nettoyer currentExp
    let expValue: bigint;
    try {
      expValue = BigInt(currentExp || 0);
    } catch (err) {
      strapi.log.warn(`[QuizAttempt] Invalid exp value for guild ${guildDocumentId}, resetting to 0`);
      expValue = BigInt(0);
    }

    await strapi.documents('api::guild.guild').update({
      documentId: guildDocumentId,
      data: {
        gold: (currentGold || 0) + rewards.gold,
        exp: String(expValue + BigInt(rewards.exp)),
      },
    });
  },

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
        isCorrect = userAnswer.answer === question.correct_answer;
        score = isCorrect ? QCM_POINTS : 0;
      } else if (question.question_type === 'timeline') {
        const correctYear = parseInt(question.correct_answer);
        const userYear = parseInt(userAnswer.answer);

        if (isNaN(correctYear) || isNaN(userYear)) {
          strapi.log.warn(`[QuizAttempt] Invalid timeline answer for question ${question.documentId}`);
          score = 0;
          isCorrect = false;
        } else {
          const result = calculateTimelineScore(correctYear, userYear);
          score = result.score;
          isCorrect = result.isCorrect;
        }
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
    const tier = determineTier(score);
    const tierData = TIER_REWARDS[tier];

    const gold = randomInRange(tierData.goldMin, tierData.goldMax);
    const exp = randomInRange(tierData.expMin, tierData.expMax);

    const itemCount = Math.random() < 0.5 ? 1 : 2;
    const items: Array<{
      documentId: string;
      name: string;
      rarity: string;
      level: number;
      index_damage: number;
      icon?: { url: string };
      tags?: Array<{ name: string }>;
    }> = [];

    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { documentId: guildDocumentId },
      select: ['id'],
    });

    if (guild) {
      const maxFloor = await this.getGuildMaxFloor(guild.id);

      for (let i = 0; i < itemCount; i++) {
        try {
          const item = await strapi.service('api::item.item').generateRandomItem(guildDocumentId, maxFloor);

          // Récupérer l'item complet avec les relations pour avoir toutes les données
          const fullItem = await strapi.db.query('api::item.item').findOne({
            where: { documentId: item.documentId },
            populate: {
              icon: { select: ['url'] },
              tags: { select: ['name'] },
            },
          });

          items.push({
            documentId: item.documentId,
            name: item.name,
            rarity: item.rarity?.name || 'common',
            level: fullItem?.level || 1,
            index_damage: fullItem?.index_damage || 0,
            icon: fullItem?.icon,
            tags: fullItem?.tags || [],
          });
        } catch (err) {
          strapi.log.warn('[QuizRewards] Failed to generate item:', err);
        }
      }
    }

    return { tier, gold, exp, items };
  },
}));
