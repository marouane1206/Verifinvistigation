// supabase/functions/send-journalist-application-notification/index.ts
// This Edge Function sends email notifications to admin when a new journalist application is submitted

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getSiteUrl } from '../shared/constants.ts'

interface ApplicationData {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  media_outlet: string
  journalist_id_number: string | null
  years_experience: number | null
  specialization: string | null
  portfolio_url: string | null
  previous_work_samples: string | null
  motivation: string
  created_at: string
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

    // Get the application data from the request body
    const applicationData: ApplicationData = await req.json()

    if (!applicationData.id) {
      return new Response(
        JSON.stringify({ error: 'Application ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate approval token
    const { data: tokenData, error: tokenError } = await supabase.rpc('create_approval_token', {
      p_application_id: applicationData.id
    })

    if (tokenError) {
      console.error('Error creating approval token:', tokenError)
      // Continue without token - we'll still send the notification
    }

    const approvalToken = tokenData
    const siteUrl = getSiteUrl()
    // Link directly to the edge function for one-click approval
    const approvalUrl = `${supabaseUrl}/functions/v1/approve-journalist-application?token=${approvalToken}`
    const adminDashboardUrl = `${siteUrl}/admin/journalist-applications`

    // Format the application date
    const applicationDate = new Date(applicationData.created_at).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Get admin email from environment or use default
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@verifinvestigation.org'

    // Build the email HTML content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle demande de journaliste</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Nouvelle demande de journaliste</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">Une nouvelle demande d'inscription de journaliste a été soumise sur Verifinvestigation.</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">📋 Informations du candidat</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 140px;">Nom complet:</td>
          <td style="padding: 8px 0;">${applicationData.full_name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${applicationData.email}" style="color: #667eea;">${applicationData.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Téléphone:</td>
          <td style="padding: 8px 0;">${applicationData.phone || 'Non fourni'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Média:</td>
          <td style="padding: 8px 0;">${applicationData.media_outlet}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">N° Carte de presse:</td>
          <td style="padding: 8px 0;">${applicationData.journalist_id_number || 'Non fourni'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Expérience:</td>
          <td style="padding: 8px 0;">${applicationData.years_experience ? applicationData.years_experience + ' ans' : 'Non spécifié'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Spécialisation:</td>
          <td style="padding: 8px 0;">${applicationData.specialization || 'Non spécifiée'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Date de soumission:</td>
          <td style="padding: 8px 0;">${applicationDate}</td>
        </tr>
      </table>
    </div>

    ${applicationData.portfolio_url ? `
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #764ba2;">
      <h3 style="margin-top: 0; color: #764ba2;">🔗 Portfolio</h3>
      <p style="margin: 0;"><a href="${applicationData.portfolio_url}" target="_blank" style="color: #667eea;">${applicationData.portfolio_url}</a></p>
    </div>
    ` : ''}

    ${applicationData.previous_work_samples ? `
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #764ba2;">
      <h3 style="margin-top: 0; color: #764ba2;">📝 Échantillons de travail précédents</h3>
      <p style="margin: 0; white-space: pre-wrap;">${applicationData.previous_work_samples}</p>
    </div>
    ` : ''}

    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #48bb78;">
      <h3 style="margin-top: 0; color: #48bb78;">💡 Motivation</h3>
      <p style="margin: 0; white-space: pre-wrap;">${applicationData.motivation}</p>
    </div>

    <div style="margin: 25px 0; text-align: center;">
      <a href="${approvalUrl}" style="display: inline-block; background: #48bb78; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        ✅ Approuver cette demande
      </a>
      <p style="margin-top: 10px; font-size: 12px; color: #666;">
        Ce lien expire dans 7 jours
      </p>
    </div>

    <div style="margin: 25px 0; text-align: center;">
      <a href="${adminDashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">
        📊 Voir dans le dashboard admin
      </a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Verifinvestigation - Plateforme de vérification de l'information</p>
  </div>
</body>
</html>
`

    // Build plain text version
    const emailText = `
Nouvelle demande de journaliste - ${applicationData.full_name}

Informations du candidat:
- Nom complet: ${applicationData.full_name}
- Email: ${applicationData.email}
- Téléphone: ${applicationData.phone || 'Non fourni'}
- Média: ${applicationData.media_outlet}
- N° Carte de presse: ${applicationData.journalist_id_number || 'Non fourni'}
- Expérience: ${applicationData.years_experience ? applicationData.years_experience + ' ans' : 'Non spécifié'}
- Spécialisation: ${applicationData.specialization || 'Non spécifiée'}
- Date de soumission: ${applicationDate}

${applicationData.portfolio_url ? `Portfolio: ${applicationData.portfolio_url}` : ''}

${applicationData.previous_work_samples ? `Échantillons de travail:\n${applicationData.previous_work_samples}` : ''}

Motivation:
${applicationData.motivation}

---
Pour approuver cette demande: ${approvalUrl}
Pour voir dans le dashboard: ${adminDashboardUrl}

Verifinvestigation - Plateforme de vérification de l'information
`

    // Try to send email using Resend (if available) or Supabase's built-in email
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
          subject: `Nouvelle demande de journaliste - ${applicationData.full_name}`,
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
      console.log('Email sent successfully via Resend:', resendData)
    } else {
      // Fallback: Use Supabase's internal email function (for local development)
      // This will store the email in the database for viewing in Inbucket
      const { error: emailError } = await supabase.from('journalist_application_emails').insert({
        application_id: applicationData.id,
        to_email: adminEmail,
        subject: `Nouvelle demande de journaliste - ${applicationData.full_name}`,
        body_html: emailHtml,
        body_text: emailText,
        status: 'pending'
      }).catch(() => {
        // Table might not exist, just log and continue
        console.log('Email storage table not available, using console log')
      })

      if (emailError) {
        console.error('Error storing email:', emailError)
      }

      // Log the email content for development
      console.log('=== EMAIL NOTIFICATION ===')
      console.log('To:', adminEmail)
      console.log('Subject:', `Nouvelle demande de journaliste - ${applicationData.full_name}`)
      console.log('Body:', emailText)
      console.log('==========================')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification sent successfully',
        approvalUrl: approvalUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-journalist-application-notification:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
