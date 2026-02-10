/**
 * Client API Strapi réutilisable
 * Adapté de scripts/generate-quiz-questions.ts
 */

import axios, { AxiosError } from 'axios';
import type { UserData, ItemData } from './data-generator.js';

// ==========================================
// Types de Retour
// ==========================================

export interface StrapiUser {
  id: number;
  username: string;
  email: string;
  jwt: string;
}

export interface StrapiGuild {
  documentId: string;
  id: number;
  name: string;
  gold: number;
  exp: string;
  scrap: number;
}

export interface StrapiCharacter {
  documentId: string;
  id: number;
  firstname: string;
  lastname: string;
}

export interface StrapiDocument {
  documentId: string;
  id: number;
}

export interface ReferenceData {
  tags: StrapiDocument[];
  rarities: StrapiDocument[];
  npcs: StrapiDocument[];
  pois: StrapiDocument[];
  museums: StrapiDocument[];
  quizSessions: Array<{ documentId: string; date: string }>;
  weaponIcons: number[];
  helmetIcons: number[];
  charmIcons: number[];
  characterIcons: number[];
}

// ==========================================
// Client Strapi
// ==========================================

export class StrapiClient {
  private baseUrl: string;
  private adminToken: string;

  constructor(baseUrl: string, adminToken: string) {
    this.baseUrl = baseUrl;
    this.adminToken = adminToken;
  }

  // ==========================================
  // Méthodes HTTP Génériques
  // ==========================================

  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    data?: unknown,
    token?: string
  ): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}/api/${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || this.adminToken}`,
        },
        data,
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Strapi API error [${method.toUpperCase()} ${endpoint}]: ${error.response?.status} - ${message}`);
      }
      throw error;
    }
  }

  // ==========================================
  // Fetch Reference Data
  // ==========================================

  /**
   * Récupère toutes les données de référence nécessaires
   */
  async fetchReferenceData(simulationDays: number): Promise<ReferenceData> {
    const [tags, rarities, npcs, pois, museums, quizSessions, allIcons] =
      await Promise.all([
        this.getTags(),
        this.getRarities(),
        this.getNPCs(),
        this.getPOIs(),
        this.getMuseums(),
        this.getRecentQuizSessions(simulationDays),
        this.getAllIcons(),
      ]);

    // Use the same icon pool for all item types
    return {
      tags,
      rarities,
      npcs,
      pois,
      museums,
      quizSessions,
      weaponIcons: allIcons,
      helmetIcons: allIcons,
      charmIcons: allIcons,
      characterIcons: allIcons,
    };
  }

  private async getTags(): Promise<StrapiDocument[]> {
    const response = await this.request<{ data: Array<{ documentId: string; id: number }> }>('get', 'tags?pagination[limit]=100');
    return response.data.map((t) => ({ documentId: t.documentId, id: t.id }));
  }

  private async getRarities(): Promise<StrapiDocument[]> {
    const response = await this.request<{ data: Array<{ documentId: string; id: number }> }>('get', 'rarities?pagination[limit]=100');
    return response.data.map((r) => ({ documentId: r.documentId, id: r.id }));
  }

  private async getNPCs(): Promise<StrapiDocument[]> {
    const response = await this.request<{ data: Array<{ documentId: string; id: number }> }>('get', 'npcs?pagination[limit]=100');
    return response.data.map((n) => ({ documentId: n.documentId, id: n.id }));
  }

  private async getPOIs(): Promise<StrapiDocument[]> {
    const response = await this.request<{ data: Array<{ documentId: string; id: number }> }>('get', 'pois?pagination[limit]=100');
    return response.data.map((p) => ({ documentId: p.documentId, id: p.id }));
  }

  private async getMuseums(): Promise<StrapiDocument[]> {
    const response = await this.request<{ data: Array<{ documentId: string; id: number }> }>('get', 'museums?pagination[limit]=100');
    return response.data.map((m) => ({ documentId: m.documentId, id: m.id }));
  }

  private async getRecentQuizSessions(days: number): Promise<Array<{ documentId: string; date: string }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const dateStr = startDate.toISOString().split('T')[0];

    const response = await this.request<{ data: Array<{ documentId: string; date: string }> }>(
      'get',
      `quiz-sessions?filters[date][$gte]=${dateStr}&pagination[limit]=100`
    );
    return response.data.map((s) => ({ documentId: s.documentId, date: s.date }));
  }

  private async getAllIcons(): Promise<number[]> {
    const response = await this.request<any>(
      'get',
      `upload/files?pagination[limit]=500`
    );
    // Handle both array and object response formats
    const files = Array.isArray(response) ? response : (response.data || []);
    const iconIds = files
      .filter((f: any) => f.mime && f.mime.startsWith('image/'))
      .map((f: any) => f.id);

    return iconIds.length > 0 ? iconIds : [1]; // Fallback to ID 1 if no images found
  }

  // ==========================================
  // User & Guild Creation
  // ==========================================

  /**
   * Crée un utilisateur via l'endpoint d'authentification
   */
  async createUser(userData: UserData): Promise<StrapiUser> {
    const response = await this.request<{ user: { id: number; username: string; email: string }; jwt: string }>(
      'post',
      'auth/local/register',
      {
        username: userData.username,
        email: userData.email,
        password: userData.password,
      }
    );

    return {
      id: response.user.id,
      username: response.user.username,
      email: response.user.email,
      jwt: response.jwt,
    };
  }

  /**
   * Crée une guilde avec le token user
   */
  async createGuild(userId: number, name: string, userToken: string): Promise<StrapiGuild> {
    const response = await this.request<{ data: StrapiGuild }>(
      'post',
      'guilds',
      {
        data: {
          name,
          user: userId,
          gold: 0,
          exp: '0',
          scrap: 0,
          publishedAt: new Date(),
        },
      },
      userToken
    );

    return response.data;
  }

  /**
   * Crée un personnage avec le token user
   */
  async createCharacter(
    firstname: string,
    lastname: string,
    guildDocId: string,
    iconId: number,
    userToken: string
  ): Promise<StrapiCharacter> {
    const response = await this.request<{ data: StrapiCharacter }>(
      'post',
      'characters',
      {
        data: {
          firstname,
          lastname,
          guild: guildDocId,
          icon: iconId,
          publishedAt: new Date(),
        },
      },
      userToken
    );

    return response.data;
  }

  /**
   * Crée les items starter pour un character
   */
  async createStarterItems(
    characterDocId: string,
    guildDocId: string,
    iconIds: { weapon: number; helmet: number; charm: number },
    userToken: string
  ): Promise<void> {
    const starterItems = [
      {
        name: 'Épée de Départ',
        slot: 'weapon',
        level: 1,
        rarity: 1, // basic
        index_damage: 5,
        icon: iconIds.weapon,
        character: characterDocId,
        guild: guildDocId,
      },
      {
        name: 'Casque de Départ',
        slot: 'helmet',
        level: 1,
        rarity: 1,
        index_damage: 3,
        icon: iconIds.helmet,
        character: characterDocId,
        guild: guildDocId,
      },
      {
        name: 'Amulette de Départ',
        slot: 'charm',
        level: 1,
        rarity: 1,
        index_damage: 2,
        icon: iconIds.charm,
        character: characterDocId,
        guild: guildDocId,
      },
    ];

    await Promise.all(
      starterItems.map((item) =>
        this.request('post', 'items', { data: { ...item, publishedAt: new Date() } }, userToken)
      )
    );
  }

  // ==========================================
  // Activity Creation
  // ==========================================

  async createVisit(data: any, userToken: string): Promise<StrapiDocument> {
    const response = await this.request<{ data: StrapiDocument }>(
      'post',
      'visits',
      { data: { ...data, publishedAt: new Date() } },
      userToken
    );
    return response.data;
  }

  async createRun(data: any, userToken: string): Promise<StrapiDocument> {
    const response = await this.request<{ data: StrapiDocument }>(
      'post',
      'runs',
      { data: { ...data, publishedAt: new Date() } },
      userToken
    );
    return response.data;
  }

  async createQuest(data: any, userToken: string): Promise<StrapiDocument> {
    const response = await this.request<{ data: StrapiDocument }>(
      'post',
      'quests',
      { data: { ...data, publishedAt: new Date() } },
      userToken
    );
    return response.data;
  }

  async createQuizAttempt(data: any, userToken: string): Promise<StrapiDocument> {
    const response = await this.request<{ data: StrapiDocument }>(
      'post',
      'quiz-attempts',
      { data: { ...data, publishedAt: new Date() } },
      userToken
    );
    return response.data;
  }

  async createItem(data: ItemData, guildDocId: string, userToken: string): Promise<StrapiDocument> {
    const response = await this.request<{ data: StrapiDocument }>(
      'post',
      'items',
      {
        data: {
          name: data.name,
          slot: data.slot,
          level: data.level,
          rarity: data.rarityId,
          index_damage: data.damage,
          icon: data.iconId,
          tags: data.tags,
          guild: guildDocId,
          character: null,
          isScrapped: false,
          publishedAt: new Date(),
        },
      },
      userToken
    );
    return response.data;
  }

  async createFriendship(characterADocId: string, characterBDocId: string, status: string, userToken: string): Promise<StrapiDocument> {
    const response = await this.request<{ data: StrapiDocument }>(
      'post',
      'friendships',
      {
        data: {
          characterA: characterADocId,
          characterB: characterBDocId,
          status,
          publishedAt: new Date(),
        },
      },
      userToken
    );
    return response.data;
  }

  async createNPCFriendship(
    characterDocId: string,
    npcDocId: string,
    questsCompleted: number,
    expeditionsCompleted: number,
    userToken: string
  ): Promise<StrapiDocument> {
    const response = await this.request<{ data: StrapiDocument }>(
      'post',
      'npc-friendships',
      {
        data: {
          character: characterDocId,
          npc: npcDocId,
          questsCompleted,
          expeditionsCompleted,
          publishedAt: new Date(),
        },
      },
      userToken
    );
    return response.data;
  }

  // ==========================================
  // Guild Update
  // ==========================================

  async updateGuild(guildDocId: string, data: Partial<{ gold: number; exp: string; quiz_streak: number }>, userToken: string): Promise<void> {
    await this.request('put', `guilds/${guildDocId}`, { data }, userToken);
  }

  // ==========================================
  // Cleanup
  // ==========================================

  async deleteGuild(guildDocId: string): Promise<void> {
    await this.request('delete', `guilds/${guildDocId}`);
  }

  async deleteUser(userId: number): Promise<void> {
    // Strapi admin endpoint
    await this.request('delete', `users/${userId}`);
  }

  async findGuildsByUsernamePrefix(prefix: string): Promise<Array<{ documentId: string; userId: number }>> {
    const response = await this.request<{ data: Array<{ documentId: string; user: { id: number } }> }>(
      'get',
      `guilds?filters[user][username][$startsWith]=${prefix}&pagination[limit]=1000`
    );

    return response.data.map((g) => ({
      documentId: g.documentId,
      userId: g.user.id,
    }));
  }
}
