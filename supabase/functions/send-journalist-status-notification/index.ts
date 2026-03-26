// supabase/functions/send-journalist-status-notification/index.ts
// This Edge Function sends email notifications to applicants when their application status changes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Inlined constants to avoid shared module import issues in Dashboard deployment
const DEFAULT_SITE_URL = 'https://verifinvestigation.org'
function getSiteUrl(): string {
  return Deno.env.get('SITE_URL') || DEFAULT_SITE_URL
}

interface ApplicationData {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  media_outlet: string
  status: 'approved' | 'rejected' | 'pending'
  admin_notes: string | null
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

    if (!applicationData.id || !applicationData.email) {
      return new Response(
        JSON.stringify({ error: 'Application ID and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const siteUrl = getSiteUrl()
    const loginUrl = `${siteUrl}/login`

    // Build email content based on status
    let emailSubject: string
    let emailHtml: string
    let emailText: string

    if (applicationData.status === 'approved') {
      // Approval email
      emailSubject = 'Votre demande de journaliste a été approuvée - Verifinvestigation'
      
      emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande approuvée</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Demande approuvée !</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">Bonjour <strong>${applicationData.full_name}</strong>,</p>
    
    <p>Nous avons le plaisir de vous informer que votre demande d'inscription en tant que journaliste sur Verifinvestigation a été <strong>approuvée</strong> !</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #48bb78;">
      <h3 style="margin-top: 0; color: #48bb78;">📋 Détails de votre inscription</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 140px;">Nom:</td>
          <td style="padding: 8px 0;">${applicationData.full_name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Média:</td>
          <td style="padding: 8px 0;">${applicationData.media_outlet || 'Non spécifié'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Statut:</td>
          <td style="padding: 8px 0; color: #48bb78; font-weight: bold;">Approuvé ✓</td>
        </tr>
      </table>
    </div>

    ${applicationData.admin_notes ? `
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">💬 Note de l'administrateur</h3>
      <p style="margin: 0; white-space: pre-wrap;">${applicationData.admin_notes}</p>
    </div>
    ` : ''}

    <div style="margin: 25px 0; text-align: center;">
      <a href="${loginUrl}" style="display: inline-block; background: #48bb78; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Se connecter à mon compte
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Vous pouvez maintenant accéder à toutes les fonctionnalités journaliste :
    </p>
    <ul style="color: #666; font-size: 14px;">
      <li>Sélectionner et investiguer des signalements</li>
      <li>Publier des résultats de vérification</li>
      <li>Accéder au tableau de bord journaliste</li>
    </ul>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Verifinvestigation - Plateforme de vérification de l'information</p>
  </div>
</body>
</html>
`

      emailText = `
Demande approuvée !

Bonjour ${applicationData.full_name},

Nous avons le plaisir de vous informer que votre demande d'inscription en tant que journaliste sur Verifinvestigation a été approuvée !

Détails de votre inscription:
- Nom: ${applicationData.full_name}
- Média: ${applicationData.media_outlet || 'Non spécifié'}
- Statut: Approuvé ✓

${applicationData.admin_notes ? `\nNote de l'administrateur:\n${applicationData.admin_notes}` : ''}

Vous pouvez maintenant vous connecter à votre compte et accéder à toutes les fonctionnalités journaliste.

Lien de connexion: ${loginUrl}

Verifinvestigation - Plateforme de vérification de l'information
`
    } else if (applicationData.status === 'rejected') {
      // Rejection email
      emailSubject = 'Votre demande de journaliste a été rejetée - Verifinvestigation'
      
      emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande rejetée</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">❌ Demande rejétée</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">Bonjour <strong>${applicationData.full_name}</strong>,</p>
    
    <p>Nous avons le regret de vous informer que votre demande d'inscription en tant que journaliste sur Verifinvestigation a été <strong>rejetée</strong>.</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #e53e3e;">
      <h3 style="margin-top: 0; color: #e53e3e;">📋 Détails de votre demande</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 140px;">Nom:</td>
          <td style="padding: 8px 0;">${applicationData.full_name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Média:</td>
          <td style="padding: 8px 0;">${applicationData.media_outlet || 'Non spécifié'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Statut:</td>
          <td style="padding: 8px 0; color: #e53e3e; font-weight: bold;">Rejeté ✗</td>
        </tr>
      </table>
    </div>

    ${applicationData.admin_notes ? `
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #e53e3e;">
      <h3 style="margin-top: 0; color: #e53e3e;">💬 Motif du rejet</h3>
      <p style="margin: 0; white-space: pre-wrap;">${applicationData.admin_notes}</p>
    </div>
    ` : ''}

    <div style="margin: 25px 0; padding: 15px; background: #fffaf0; border-radius: 8px; border: 1px solid #f6e05e;">
      <p style="margin: 0; color: #744210; font-size: 14px;">
        <strong>Pourcentage de réessai:</strong> Si vous pensez que cette décision est une erreur ou si vous souhaitez soumettre une nouvelle demande avec des informations différentes, vous pouvez retourner sur le site et soumettre une nouvelle demande.
      </p>
    </div>
    
    <div style="margin: 25px 0; text-align: center;">
      <a href="${siteUrl}" style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Retour à l'accueil
      </a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Verifinvestigation - Plateforme de vérification de l'information</p>
  </div>
</body>
</html>
`

      emailText = `
Demande rejétée

Bonjour ${applicationData.full_name},

Nous avons le regret de vous informer que votre demande d'inscription en tant que journaliste sur Verifinvestigation a été rejetée.

Détails de votre demande:
- Nom: ${applicationData.full_name}
- Média: ${applicationData.media_outlet || 'Non spécifié'}
- Statut: Rejeté ✗

${applicationData.admin_notes ? `\nMotif du rejet:\n${applicationData.admin_notes}` : ''}

Si vous pensez que cette décision est une erreur ou si vous souhaitez soumettre une nouvelle demande avec des informations différentes, vous pouvez retourner sur le site et soumettre une nouvelle demande.

Lien du site: ${siteUrl}

Verifinvestigation - Plateforme de vérification de l'information
`
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Only approved or rejected statuses are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
          to: [applicationData.email],
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
      console.log('Status notification email sent successfully via Resend:', resendData)
    } else {
      // Fallback: Log the email content for development
      console.log('=== STATUS NOTIFICATION EMAIL ===')
      console.log('To:', applicationData.email)
      console.log('Subject:', emailSubject)
      console.log('Body:', emailText)
      console.log('===================================')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Status notification email sent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-journalist-status-notification:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})