// supabase/functions/notify-investigation-started/index.ts
// This Edge Function sends email notifications to admin when a journalist starts an investigation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Inlined constants to avoid shared module import issues in Dashboard deployment
const DEFAULT_SITE_URL = 'https://verifinvestigation.org'
const DEFAULT_SUPPORT_EMAIL = 'support@verifinvestigation.org'

function getSiteUrl(): string {
  return Deno.env.get('SITE_URL') || DEFAULT_SITE_URL
}

function getSupportEmail(): string {
  return Deno.env.get('SUPPORT_EMAIL') || DEFAULT_SUPPORT_EMAIL
}

interface InvestigationData {
  report_id: string
  report_title: string
  journalist_name: string
  journalist_email: string
  timestamp: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the investigation data from the request body
    const investigationData: InvestigationData = await req.json()

    if (!investigationData.report_id || !investigationData.journalist_name || !investigationData.timestamp) {
      return new Response(
        JSON.stringify({ error: 'Report ID, journalist name, and timestamp are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const siteUrl = getSiteUrl()
    const adminDashboardUrl = `${siteUrl}/admin/investigations`

    // Get admin email from environment or use default
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@verifinvestigation.org'
    const supportEmail = getSupportEmail()

    // Format the timestamp
    const formattedDate = new Date(investigationData.timestamp).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Build email content
    const emailSubject = `🔍 Nouvelle investigation démarrée - ${investigationData.report_title}`
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle investigation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔍 Nouvelle investigation démarrée</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">Bonjour Administrateur,</p>
    
    <p>Un journaliste a commencé une nouvelle investigation sur la plateforme Verifinvestigation.</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">📋 Détails de l'investigation</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 140px;">ID du signalement:</td>
          <td style="padding: 8px 0;">${investigationData.report_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Titre:</td>
          <td style="padding: 8px 0;">${investigationData.report_title}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Journaliste:</td>
          <td style="padding: 8px 0;">${investigationData.journalist_name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Email du journaliste:</td>
          <td style="padding: 8px 0;">${investigationData.journalist_email || 'Non spécifié'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Date de début:</td>
          <td style="padding: 8px 0;">${formattedDate}</td>
        </tr>
      </table>
    </div>

    <div style="margin: 25px 0; text-align: center;">
      <a href="${adminDashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Voir les investigations en cours
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Vous pouvez suivre cette investigation depuis le tableau de bord administrateur.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Verifinvestigation - Plateforme de vérification de l'information</p>
    <p>Contact: ${supportEmail}</p>
  </div>
</body>
</html>
`

    const emailText = `
Nouvelle investigation démarrée

Bonjour Administrateur,

Un journaliste a commencé une nouvelle investigation sur la plateforme Verifinvestigation.

Détails de l'investigation:
- ID du signalement: ${investigationData.report_id}
- Titre: ${investigationData.report_title}
- Journaliste: ${investigationData.journalist_name}
- Email du journaliste: ${investigationData.journalist_email || 'Non spécifié'}
- Date de début: ${formattedDate}

Vous pouvez suivre cette investigation depuis le tableau de bord administrateur.
Lien: ${adminDashboardUrl}

Verifinvestigation - Plateforme de vérification de l'information
Contact: ${supportEmail}
`

    // Try to send email using Resend (if available) or fallback
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (resendApiKey) {
      // Use Resend for sending emails
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Verifinvestigation <noreply@verifinvestigation.org>',
          to: [adminEmail],
          subject: emailSubject,
          html: emailHtml,
          text: emailText
        })
      })

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text()
        console.error('Resend API error:', errorText)
        throw new Error(`Failed to send email: ${errorText}`)
      }

      const resendData = await resendResponse.json()
      console.log('Investigation started notification email sent successfully via Resend:', resendData)
    } else {
      // Fallback: Log the email content for development
      console.log('=== INVESTIGATION STARTED NOTIFICATION EMAIL ===')
      console.log('To:', adminEmail)
      console.log('Subject:', emailSubject)
      console.log('Body:', emailText)
      console.log('==============================================')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Investigation started notification sent to admin'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in notify-investigation-started:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
