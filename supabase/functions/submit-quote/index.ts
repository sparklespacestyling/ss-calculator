import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from 'npm:@notionhq/client'

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const notionToken = Deno.env.get('NOTION_TOKEN')
    const databaseId = Deno.env.get('NOTION_DATABASE_ID')

    if (!notionToken || !databaseId) {
      throw new Error('NOTION_TOKEN and NOTION_DATABASE_ID environment variables are required')
    }

    const notion = new Client({
      auth: notionToken,
    })

    const data: NotionQuoteData = await req.json()

    await notion.pages.create({
      parent: {
        database_id: databaseId,
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
    })

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      },
    )
  } catch (error) {
    console.error('Error submitting to Notion:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      },
    )
  }
})
