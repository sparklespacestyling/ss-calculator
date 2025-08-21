import { Client } from '@notionhq/client';

interface RoomData {
  [key: string]: {
    count: number;
    percentage: number;
    weight: number;
  };
}

interface CalculatorFormData {
  propertyType: string;
  styling: string;
  propertyAddress: string;
  distanceFromWarehouse: number;
  listingPrice: number;
  accessDifficulty: string;
  roomRate: number;
  rooms: RoomData;
}

interface QuoteCalculations {
  equivalentRooms: number;
  baseQuote: number;
  variation: number;
  finalQuote: number;
}

interface NotionQuoteData {
  formData: CalculatorFormData;
  calculations: QuoteCalculations;
}

export class NotionService {
  private notion: Client;
  private databaseId: string;

  constructor() {
    const notionToken = import.meta.env.VITE_NOTION_TOKEN;
    const databaseId = import.meta.env.VITE_NOTION_DATABASE_ID;

    if (!notionToken) {
      throw new Error('VITE_NOTION_TOKEN environment variable is required');
    }

    if (!databaseId) {
      throw new Error('VITE_NOTION_DATABASE_ID environment variable is required');
    }

    this.notion = new Client({
      auth: notionToken,
    });
    this.databaseId = databaseId;
  }

  async submitQuote(data: NotionQuoteData): Promise<void> {
    try {
      await this.notion.pages.create({
        parent: {
          database_id: this.databaseId,
        },
        properties: {
          'Date Sent': {
            date: {
              start: new Date().toISOString(),
            },
          },
          'Property Address': {
            rich_text: [
              {
                text: {
                  content: data.formData.propertyAddress || 'Not provided',
                },
              },
            ],
          },
          'Amount (+GST)': {
            number: data.calculations.finalQuote,
          },
        },
      });
    } catch (error) {
      console.error('Error submitting to Notion:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to submit to Notion: ${error.message}`
          : 'Failed to submit to Notion: Unknown error'
      );
    }
  }

  // Method to test the connection
  async testConnection(): Promise<boolean> {
    try {
      await this.notion.databases.retrieve({
        database_id: this.databaseId,
      });
      return true;
    } catch (error) {
      console.error('Notion connection test failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const notionService = new NotionService();