import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from 'npm:@notionhq/client'

interface QuotientAddress {
  type: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface QuotientPhone {
  type: string;
  value: string;
}

interface QuotientCustomer {
  name_first: string;
  name_last: string;
  email: string;
  company_name?: string;
  phone?: QuotientPhone;
  address?: QuotientAddress;
}

interface QuotientItem {
  item_code: string;
  heading: string;
  description: string;
  sales_category: string;
  tax_rate: number;
  tax_description: string;
  subscription: string;
  discount: number;
  cost_price: number;
  unit_price: number;
  quantity: number;
  item_total: number;
}

interface QuotientWebhookPayload {
  event_name: string;
  quote_number: number;
  title: string;
  quote_url: string;
  from: string;
  for: string;
  first_sent: string;
  valid_until: string;
  quote_status: string;
  progress: string;
  is_archived: boolean;
  currency: string;
  amounts_are: string;
  overall_discount: number;
  quote_for: QuotientCustomer;
  item_headings: string;
  total_includes_tax: number;
  total_excludes_tax: number;
  discount_amount_includes_tax: number;
  discount_amount_excludes_tax: number;
  selected_items: QuotientItem[];
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
    // Basic security: Check for webhook secret if provided
    const webhookSecret = Deno.env.get('QUOTIENT_WEBHOOK_SECRET')
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
      if (providedSecret !== webhookSecret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401,
            headers: { 
              ...corsHeaders,
              "Content-Type": "application/json" 
            } 
          }
        )
      }
    }

    const notionToken = Deno.env.get('NOTION_TOKEN')
    const databaseId = Deno.env.get('NOTION_DATABASE_ID')

    if (!notionToken || !databaseId) {
      throw new Error('NOTION_TOKEN and NOTION_DATABASE_ID environment variables are required')
    }

    const notion = new Client({
      auth: notionToken,
    })

    const payload: QuotientWebhookPayload = await req.json()
    
    console.log('Received Quotient webhook:', payload.event_name, payload.quote_number)

    // Extract data according to user requirements:
    // quote_number → Quote # (row title)  
    // title → Property Address
    // first_sent → Date Sent
    // total_excludes_tax → Amount (+GST)
    // quote_for → Notes (concatenate name_first, name_last, email, company_name)
    
    const quoteNumber = payload.quote_number
    const propertyAddress = payload.title || 'No title provided'
    const dateSent = payload.first_sent
    const amount = payload.total_excludes_tax
    
    // Build Notes from quote_for customer data
    const customer = payload.quote_for
    const notes = [
      customer.name_first,
      customer.name_last,
      customer.email,
      customer.company_name
    ].filter(Boolean).join(', ')

    // Create Notion entry with exact field mapping as requested
    await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        'Quote #': {
          title: [
            {
              text: {
                content: `${quoteNumber}`,
              },
            },
          ],
        },
        'Date Sent': {
          date: {
            start: new Date(dateSent).toISOString(),
          },
        },
        'Property Address': {
          rich_text: [
            {
              text: {
                content: propertyAddress,
              },
            },
          ],
        },
        'Amount (+GST)': {
          number: amount,
        },
        'Notes': {
          rich_text: [
            {
              text: {
                content: notes,
              },
            },
          ],
        },
        'Follow-Up': {
          rich_text: [
            {
              text: {
                content: 'autosent from Quotient - UPDATE this!',
              },
            },
          ],
        },
      },
    })

    console.log('Successfully sent Quotient data to Notion')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${payload.event_name} for quote ${quoteNumber}` 
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      },
    )
  } catch (error) {
    console.error('Error processing Quotient webhook:', error)
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