import axios, { AxiosInstance, AxiosError } from 'axios';
import type { StrapiResponse, StrapiEntity, StrapiClientConfig } from './types.js';

export class StrapiClient {
  private client: AxiosInstance;

  constructor(config: StrapiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
      },
    });
  }

  /**
   * Find entries with optional filters
   */
  async find<T>(
    contentType: string,
    params?: Record<string, unknown>
  ): Promise<StrapiResponse<StrapiEntity<T>[]>> {
    try {
      const response = await this.client.get(`/api/${contentType}`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, `GET /api/${contentType}`);
    }
  }

  /**
   * Find a single entry by ID
   */
  async findOne<T>(
    contentType: string,
    id: number,
    params?: Record<string, unknown>
  ): Promise<StrapiResponse<StrapiEntity<T>>> {
    try {
      const response = await this.client.get(`/api/${contentType}/${id}`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, `GET /api/${contentType}/${id}`);
    }
  }

  /**
   * Create a new entry
   */
  async create<T, P>(
    contentType: string,
    payload: P
  ): Promise<StrapiResponse<StrapiEntity<T>>> {
    try {
      const response = await this.client.post(`/api/${contentType}`, payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `POST /api/${contentType}`);
    }
  }

  /**
   * Update an existing entry
   */
  async update<T, P>(
    contentType: string,
    id: number,
    payload: P
  ): Promise<StrapiResponse<StrapiEntity<T>>> {
    try {
      const response = await this.client.put(`/api/${contentType}/${id}`, payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `PUT /api/${contentType}/${id}`);
    }
  }

  /**
   * Delete an entry
   */
  async delete(contentType: string, id: number): Promise<void> {
    try {
      await this.client.delete(`/api/${contentType}/${id}`);
    } catch (error) {
      throw this.handleError(error, `DELETE /api/${contentType}/${id}`);
    }
  }

  private handleError(error: unknown, endpoint: string): Error {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;

      if (status === 401) {
        return new Error(`Authentication failed at ${endpoint}. Check your API token.`);
      }
      if (status === 403) {
        return new Error(`Forbidden: ${endpoint}. Check API token permissions.`);
      }
      if (status === 404) {
        return new Error(`Not found: ${endpoint}`);
      }

      return new Error(`Strapi API error at ${endpoint}: ${status} - ${message}`);
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}
