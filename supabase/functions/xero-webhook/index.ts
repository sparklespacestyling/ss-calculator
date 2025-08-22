import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from 'npm:@notionhq/client'

// Xero Webhook Event Structure
interface XeroWebhookEvent {
  resourceUrl: string;
  resourceId: string;
  eventDateUtc: string;
  eventType: 'CREATE' | 'UPDATE';
  eventCategory: 'INVOICE' | 'CONTACT';
  tenantId: string;
  tenantType: 'ORGANISATION';
}

// Xero Webhook Payload Structure
interface XeroWebhookPayload {
  events: XeroWebhookEvent[];
  firstEventSequence: number;
  lastEventSequence: number;
  entropy: string;
}

// Xero Contact Structure
interface XeroContact {
  ContactID: string;
  Name: string;
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  ContactStatus: string;
}

// Xero Invoice Structure (from API response)
interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Reference?: string;
  Type: 'ACCREC' | 'ACCPAY';
  Contact: XeroContact;
  Date: string; // YYYY-MM-DD format
  DueDate: string;
  Status: string;
  SubTotal: number;
  TotalTax: number;
  Total: number;
  AmountDue: number;
  AmountPaid: number;
  AmountCredited: number;
  CurrencyCode: string;
  FullyPaidOnDate?: string;
}

// Xero API Response Structure
interface XeroInvoiceResponse {
  Invoices: XeroInvoice[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-xero-signature',
}

// HMAC SHA256 signature verification for Xero webhooks
async function verifyXeroSignature(body: string, signature: string, webhookKey: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    return computedSignature === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Refresh Xero access token using refresh token
async function refreshXeroToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token:', response.statusText);
      return null;
    }

    const tokenData = await response.json();
    console.log('Token refreshed successfully');
    
    // In production, you should update the stored refresh token too
    // as Xero may provide a new one
    return tokenData.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// Fetch invoice details from Xero API with automatic token refresh
async function fetchInvoiceFromXero(resourceId: string, accessToken: string, tenantId: string, refreshToken?: string, clientId?: string, clientSecret?: string): Promise<XeroInvoice | null> {
  try {
    let currentToken = accessToken;
    
    // First attempt with current token
    let response = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${resourceId}`, {
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Xero-tenant-id': tenantId,
        'Accept': 'application/json',
      },
    });

    // If token expired (401), try to refresh it
    if (response.status === 401 && refreshToken && clientId && clientSecret) {
      console.log('Access token expired, attempting to refresh...');
      const newToken = await refreshXeroToken(refreshToken, clientId, clientSecret);
      
      if (newToken) {
        currentToken = newToken;
        // Retry the request with new token
        response = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${resourceId}`, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Xero-tenant-id': tenantId,
            'Accept': 'application/json',
          },
        });
      }
    }

    if (!response.ok) {
      console.error('Failed to fetch invoice from Xero:', response.statusText);
      return null;
    }

    const data: XeroInvoiceResponse = await response.json();
    return data.Invoices?.[0] || null;
  } catch (error) {
    console.error('Error fetching invoice from Xero:', error);
    return null;
  }
}

// Process payment event and create entry in payments Notion database
async function processPaymentEvent(invoice: XeroInvoice, notion: Client, paymentsDatabaseId: string): Promise<void> {
  try {
    // Determine payment status
    const isFullyPaid = invoice.AmountDue === 0 || invoice.Status === 'PAID'
    const paymentStatus = isFullyPaid ? 'Fully Paid' : 'Deposit'
    
    // Use FullyPaidOnDate if available and fully paid, otherwise use current date
    const paymentDate = isFullyPaid && invoice.FullyPaidOnDate 
      ? invoice.FullyPaidOnDate 
      : new Date().toISOString().split('T')[0] // Current date in YYYY-MM-DD format
    
    // Map Xero data to Notion fields
    const invoiceNumber = invoice.InvoiceNumber
    const address = invoice.Reference || 'No reference provided'
    const amountPaid = invoice.AmountPaid.toString() // Convert number to text
    
    console.log(`Processing payment event for invoice ${invoiceNumber}: ${paymentStatus}, Amount: ${amountPaid}`)
    
    // Create Notion entry in payments database
    await notion.pages.create({
      parent: {
        database_id: paymentsDatabaseId,
      },
      properties: {
        'INV #': {
          title: [
            {
              text: {
                content: invoiceNumber,
              },
            },
          ],
        },
        'Address': {
          rich_text: [
            {
              text: {
                content: address,
              },
            },
          ],
        },
        'Amount Paid': {
          rich_text: [
            {
              text: {
                content: amountPaid,
              },
            },
          ],
        },
        'Date Paid': {
          date: {
            start: paymentDate,
          },
        },
        'Status': {
          select: {
            name: paymentStatus,
          },
        },
      },
    })
    
    console.log(`Successfully created payment entry for invoice ${invoiceNumber}`)
  } catch (error) {
    console.error('Error processing payment event:', error)
    // Don't throw - we want invoice processing to continue even if payment processing fails
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const webhookKey = Deno.env.get('XERO_WEBHOOK_KEY')
    const accessToken = Deno.env.get('XERO_ACCESS_TOKEN')
    const refreshToken = Deno.env.get('XERO_REFRESH_TOKEN')
    const clientId = Deno.env.get('XERO_CLIENT_ID')
    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET')
    const notionToken = Deno.env.get('NOTION_TOKEN')
    const databaseId = Deno.env.get('NOTION_DATABASE_ID_RECEIVABLE')
    const paymentsDatabaseId = Deno.env.get('NOTION_DATABASE_ID_PAYMENTS')

    if (!webhookKey || !accessToken || !notionToken || !databaseId || !paymentsDatabaseId) {
      throw new Error('Required environment variables missing: XERO_WEBHOOK_KEY, XERO_ACCESS_TOKEN, NOTION_TOKEN, NOTION_DATABASE_ID_RECEIVABLE, NOTION_DATABASE_ID_PAYMENTS')
    }

    // Get request body as text for signature verification
    const body = await req.text()
    const signature = req.headers.get('x-xero-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing x-xero-signature header' }),
        { 
          status: 401,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      )
    }

    // Verify webhook signature
    const isValid = await verifyXeroSignature(body, signature, webhookKey)
    if (!isValid) {
      console.log('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      )
    }

    // Parse webhook payload
    const payload: XeroWebhookPayload = JSON.parse(body)
    console.log('Received Xero webhook:', payload.events.length, 'events')

    // Initialize Notion client
    const notion = new Client({
      auth: notionToken,
    })

    // Process each invoice event
    for (const event of payload.events) {
      if (event.eventCategory !== 'INVOICE') {
        console.log('Skipping non-invoice event:', event.eventCategory)
        continue
      }

      console.log('Processing invoice event:', event.eventType, event.resourceId)

      // Fetch full invoice details from Xero API (with automatic token refresh)
      const invoice = await fetchInvoiceFromXero(event.resourceId, accessToken, event.tenantId, refreshToken, clientId, clientSecret)
      
      if (!invoice) {
        console.error('Failed to fetch invoice details for:', event.resourceId)
        continue
      }

      // Map Xero invoice data to Notion fields according to user requirements:
      // InvoiceNumber → INV # (row title)
      // Date → Date Sent (date only, no time)  
      // Reference → Address (text)
      // Total → Amount (number)
      // Contact → Updates (text + "autosent from Xero, UPDATE this!")
      
      const invoiceNumber = invoice.InvoiceNumber
      const dateSent = invoice.Date // Already in YYYY-MM-DD format
      const address = invoice.Reference || 'No reference provided'
      const amount = invoice.Total
      const contactInfo = invoice.Contact.Name || 'Unknown Contact'
      const updates = `${contactInfo}, autosent from Xero, UPDATE this!`

      // Create Notion entry
      await notion.pages.create({
        parent: {
          database_id: databaseId,
        },
        properties: {
          'INV #': {
            title: [
              {
                text: {
                  content: invoiceNumber,
                },
              },
            ],
          },
          'Date Sent': {
            date: {
              start: dateSent,
            },
          },
          'Address': {
            rich_text: [
              {
                text: {
                  content: address,
                },
              },
            ],
          },
          'Amount': {
            number: amount,
          },
          'Updates': {
            rich_text: [
              {
                text: {
                  content: updates,
                },
              },
            ],
          },
        },
      })

      console.log(`Successfully created Notion entry for invoice ${invoiceNumber}`)
      
      // Check if this invoice has payment activity and process as payment event
      if (invoice.AmountPaid > 0) {
        console.log(`Detected payment on invoice ${invoiceNumber}, processing payment event...`)
        await processPaymentEvent(invoice, notion, paymentsDatabaseId)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${payload.events.length} webhook events` 
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      },
    )
  } catch (error) {
    console.error('Error processing Xero webhook:', error)
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