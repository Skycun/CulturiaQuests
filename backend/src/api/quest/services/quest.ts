import { factories } from '@strapi/strapi';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default factories.createCoreService('api::quest.quest', ({ strapi }) => ({

  async getTodayQuestsForGuild(guildId: number) {
    const today = new Date().toISOString().split('T')[0];
    return strapi.db.query('api::quest.quest').findMany({
      where: {
        guild: { id: guildId },
        date_start: {
          $gte: `${today}T00:00:00.000Z`,
          $lte: `${today}T23:59:59.999Z`,
        },
      },
      populate: {
        npc: { populate: { dialogs: true } },
        poi_a: true,
        poi_b: true,
      },
    });
  },

  async selectNpcs(guildId: number, count: number) {
    const allNpcs = await strapi.db.query('api::npc.npc').findMany({
      populate: { dialogs: true },
    });

    const friendships = await strapi.db.query('api::friendship.friendship').findMany({
      where: { guild: { id: guildId } },
      populate: { npc: true },
    });
    const friendshipMap = new Map(
      friendships.map((f: any) => [f.npc?.id || f.npc, f])
    );

    const priority1: any[] = [];
    const priority2: any[] = [];

    for (const npc of allNpcs) {
      const hasQuestDialog = (npc as any).dialogs?.some(
        (d: any) => d.text_type === 'quest_description'
      );
      if (!hasQuestDialog) continue;

      const friendship = friendshipMap.get(npc.id);
      const unlocked = (friendship as any)?.quests_entry_unlocked || 0;
      const available = (npc as any).quests_entry_available || 0;

      if (unlocked < available) {
        priority1.push(npc);
      } else {
        priority2.push(npc);
      }
    }

    const shuffled1 = shuffleArray(priority1);
    const shuffled2 = shuffleArray(priority2);
    return [...shuffled1, ...shuffled2].slice(0, count);
  },

  async createDailyQuests(
    guildDocumentId: string,
    npcDocumentIds: string[],
    poiDocumentIds: string[]
  ) {
    const quests = [];
    for (let i = 0; i < npcDocumentIds.length; i++) {
      const quest = await strapi.documents('api::quest.quest').create({
        data: {
          date_start: new Date().toISOString(),
          guild: guildDocumentId,
          npc: npcDocumentIds[i],
          poi_a: poiDocumentIds[i * 2],
          poi_b: poiDocumentIds[i * 2 + 1],
          is_poi_a_completed: false,
          is_poi_b_completed: false,
          gold_earned: 0,
          xp_earned: 0,
        },
      });
      quests.push(quest);
    }
    return quests;
  },
}));
