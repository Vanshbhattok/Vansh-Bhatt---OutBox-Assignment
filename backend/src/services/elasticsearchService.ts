import { Client } from '@elastic/elasticsearch';
import { config } from '../config';

class ElasticsearchService {
  private client: Client | null = null;
  private indexName = 'emails';
  private isAvailable = false;

  constructor() {
    try {
      this.client = new Client({ node: config.elasticsearchNode });
    } catch (err) {
      console.warn('Elasticsearch initialization warning:', err);
    }
  }

  public async initIndex(): Promise<void> {
    if (!this.client) return;

    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              campaignId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipient: { type: 'keyword' },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              etherealPreviewUrl: { type: 'keyword' },
              errorMessage: { type: 'text' },
            },
          },
        });
        console.log(`[Elasticsearch] Index '${this.indexName}' created successfully.`);
      }
      this.isAvailable = true;
    } catch (err) {
      console.warn('[Elasticsearch] Could not connect to cluster, fallback to DB search if needed:', (err as Error).message);
      this.isAvailable = false;
    }
  }

  public async indexEmail(email: {
    id: string;
    campaignId?: string | null;
    senderEmail: string;
    recipient: string;
    subject: string;
    body: string;
    status: string;
    scheduledAt: Date | string;
    sentAt?: Date | string | null;
    etherealPreviewUrl?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    if (!this.client || !this.isAvailable) return;

    try {
      await this.client.index({
        index: this.indexName,
        id: email.id,
        document: {
          id: email.id,
          campaignId: email.campaignId,
          senderEmail: email.senderEmail,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt,
          sentAt: email.sentAt,
          etherealPreviewUrl: email.etherealPreviewUrl,
          errorMessage: email.errorMessage,
        },
      });
    } catch (err) {
      console.error(`[Elasticsearch] Error indexing email ${email.id}:`, (err as Error).message);
    }
  }

  public async searchEmails(query: string, status?: string): Promise<any[]> {
    if (!this.client || !this.isAvailable) {
      return [];
    }

    try {
      const mustClauses: any[] = [];
      if (query && query.trim() !== '') {
        mustClauses.push({
          multi_match: {
            query: query.trim(),
            fields: ['subject^3', 'recipient^2', 'body', 'senderEmail'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (status) {
        mustClauses.push({ term: { status } });
      }

      const searchBody: any = mustClauses.length > 0
        ? { query: { bool: { must: mustClauses } } }
        : { query: { match_all: {} } };

      const response = await this.client.search({
        index: this.indexName,
        ...searchBody,
        size: 100,
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (err) {
      console.error('[Elasticsearch] Search query failed:', (err as Error).message);
      return [];
    }
  }

  public getIsAvailable(): boolean {
    return this.isAvailable;
  }
}

export const elasticsearchService = new ElasticsearchService();
