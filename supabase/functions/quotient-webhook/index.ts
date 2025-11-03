import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Client } from 'npm:@notionhq/client';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Basic security: Check for webhook secret if provided
    const webhookSecret = Deno.env.get('QUOTIENT_WEBHOOK_SECRET');
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({
          error: 'Unauthorized'
        }), {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
    }
    const notionToken = Deno.env.get('NOTION_TOKEN');
    const databaseId = Deno.env.get('NOTION_DATABASE_ID');
    const receivableDatabaseId = Deno.env.get('NOTION_DATABASE_ID_RECEIVABLE');
    if (!notionToken || !databaseId) {
      throw new Error('NOTION_TOKEN and NOTION_DATABASE_ID environment variables are required');
    }
    const notion = new Client({
      auth: notionToken
    });
    const payload = await req.json();
    console.log('Received Quotient webhook:', payload.event_name, payload.quote_number);
    // Handle Quote Accepted events separately
    if (payload.event_name === 'quote_accepted') {
      if (!receivableDatabaseId) {
        throw new Error('NOTION_DATABASE_ID_RECEIVABLE environment variable is required for quote_accepted events');
      }
      const address = payload.title || 'No title provided';
      const amount = payload.total_includes_tax;
      const customer = payload.quote_for;
      const itemCodes = payload.selected_items?.map((item)=>item.item_code).join(', ') || 'No items';
      const updates = [
        itemCodes,
        customer.name_first,
        customer.email,
        customer.company_name,
        'autosent from Quotient - UPDATE this!'
      ].filter(Boolean).join(', ');
      await notion.pages.create({
        parent: {
          database_id: receivableDatabaseId
        },
        properties: {
          'Address': {
            rich_text: [
              {
                text: {
                  content: address
                }
              }
            ]
          },
          'Amount': {
            number: amount
          },
          'Updates': {
            rich_text: [
              {
                text: {
                  content: updates
                }
              }
            ]
          }
        }
      });
      console.log('Successfully sent Quote Accepted data to Receivables database');
      return new Response(JSON.stringify({
        success: true,
        message: `Processed ${payload.event_name} for quote ${payload.quote_number}`
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Extract data according to user requirements:
    // quote_number → Quote # (row title)  
    // title → Property Address
    // first_sent → Date Sent
    // total_excludes_tax → Amount (+GST)
    // quote_for → Notes (concatenate name_first, name_last, email, company_name)
    const quoteNumber = payload.quote_number;
    const propertyAddress = payload.title || 'No title provided';
    const dateSent = payload.first_sent;
    const amount = payload.total_excludes_tax;
    // Build Notes from quote_for customer data
    const customer = payload.quote_for;
    const notes = [
      customer.name_first,
      customer.name_last,
      customer.email,
      customer.company_name
    ].filter(Boolean).join(', ');
    // Create Notion entry with exact field mapping as requested
    await notion.pages.create({
      parent: {
        database_id: databaseId
      },
      properties: {
        'Quote #': {
          title: [
            {
              text: {
                content: `${quoteNumber}`
              }
            }
          ]
        },
        'Date Sent': {
          date: {
            start: new Date(dateSent).toISOString()
          }
        },
        'Property Address': {
          rich_text: [
            {
              text: {
                content: propertyAddress
              }
            }
          ]
        },
        'Amount (+GST)': {
          number: amount
        },
        'Notes': {
          rich_text: [
            {
              text: {
                content: notes
              }
            }
          ]
        },
        'Follow-Up': {
          rich_text: [
            {
              text: {
                content: 'autosent from Quotient - UPDATE this!'
              }
            }
          ]
        }
      }
    });
    console.log('Successfully sent Quotient data to Notion');
    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${payload.event_name} for quote ${quoteNumber}`
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error('Error processing Quotient webhook:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
