import { factories } from '@strapi/strapi';

/**
 * Masque correct_answer et explanation sur les endpoints CRUD publics.
 * Ces champs ne sont retournés qu'après soumission via POST /quiz-attempts/submit.
 */
function stripSensitiveFields(question: any) {
  if (!question) return question;
  const { correct_answer, explanation, ...safe } = question;
  return safe;
}

export default factories.createCoreController('api::quiz-question.quiz-question', ({ strapi }) => ({
  async find(ctx) {
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const results = await strapi.documents('api::quiz-question.quiz-question').findMany(sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(results, ctx);
    const response = this.transformResponse(sanitizedEntity) as any;

    if (response.data) {
      response.data = Array.isArray(response.data)
        ? response.data.map(stripSensitiveFields)
        : stripSensitiveFields(response.data);
    }

    return response;
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const document = await strapi.documents('api::quiz-question.quiz-question').findOne({
      documentId: id,
      ...sanitizedQuery,
    });

    if (!document) {
      return ctx.notFound('Question not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(document, ctx);
    const response = this.transformResponse(sanitizedEntity) as any;

    if (response.data) {
      response.data = stripSensitiveFields(response.data);
    }

    return response;
  },
}));
