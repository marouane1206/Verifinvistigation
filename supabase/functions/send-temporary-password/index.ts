// supabase/functions/send-temporary-password/index.ts
// This Edge Function sends temporary password emails to new users/journalists

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface RequestBody {
  email: string
  temporaryPassword: string
  username: string
  role: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Masks a password for display, showing only first 2 and last 2 characters
 */
function maskPassword(password: string): string {
  if (password.length <= 4) {
    return '*'.repeat(password.length)
  }
  const firstTwo = password.substring(0, 2)
  const lastTwo = password.substring(password.length - 2)
  const middle = '*'.repeat(Math.min(password.length - 4, 8))
  return `${firstTwo}${middle}${lastTwo}`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, temporaryPassword, username, role } = body

    // Validate required fields
    const errors: string[] = []
    if (!email) errors.push('email is required')
    if (!temporaryPassword) errors.push('temporaryPassword is required')
    if (!username) errors.push('username is required')
    if (!role) errors.push('role is required')

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${errors.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    const siteUrl = Deno.env.get('SITE_URL') || 'https://verifinvestigation.org'
    const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'support@verifinvestigation.org'
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@verifinvestigation.org'
    
    // Validate required environment variables in production
    if (!Deno.env.get('RESEND_API_KEY') && Deno.env.get('DENO_ENV') === 'production') {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine role display text
    const roleDisplay = role === 'journalist' ? 'Journaliste' : 
                        role === 'admin' ? 'Administrateur' : 
                        role.charAt(0).toUpperCase() + role.slice(1)

    // Build the email HTML content (with XSS-safe escaped variables)
    const maskedPassword = maskPassword(temporaryPassword)
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vos identifiants de connexion - Verifinvestigation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Bienvenue sur Verifinvestigation</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">Bonjour <strong>${escapeHtml(username)}</strong>,</p>
    
    <p>Votre compte <strong>${escapeHtml(roleDisplay)}</strong> a été créé avec succès sur la plateforme Verifinvestigation.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">🔑 Vos identifiants temporaires</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 100px;">Email:</td>
          <td style="padding: 8px 0;">${escapeHtml(email)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Mot de passe:</td>
          <td style="padding: 8px 0;">
            <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px; color: #d9534f; font-weight: bold;">${escapeHtml(maskedPassword)}</code>
          </td>
        </tr>
      </table>
    </div>

    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <h3 style="margin-top: 0; color: #856404;">⚠️ Important - Changez votre mot de passe</h3>
      <p style="margin: 0;">Pour des raisons de sécurité, vous <strong>devez changer votre mot de passe</strong> lors de votre première connexion.</p>
      <ul style="margin: 10px 0 0 0;">
        <li>Choisissez un mot de passe fort et unique</li>
        <li>Au moins 8 caractères avec des majuscules, minuscules et chiffres</li>
        <li>Ne partagez jamais votre mot de passe</li>
      </ul>
    </div>

    <div style="margin: 25px 0; text-align: center;">
      <a href="${siteUrl}/login" style="display: inline-block; background: #48bb78; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        🚀 Se connecter maintenant
      </a>
    </div>

    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #764ba2;">
      <h3 style="margin-top: 0; color: #764ba2;">📧 Besoin d'aide ?</h3>
      <p style="margin: 0;">Si vous avez des questions ou des problèmes pour accéder à votre compte, n'hésitez pas à contacter notre équipe de support.</p>
      <p style="margin: 10px 0 0 0;">
        <strong>Email de support:</strong> <a href="mailto:${supportEmail}" style="color: #667eea;">${supportEmail}</a>
      </p>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Verifinvestigation - Plateforme de vérification de l'information</p>
    <p style="margin: 5px 0 0 0;">Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
  </div>
</body>
</html>
`

    // Build plain text version (with masked password for security)
    const maskedPwd = maskPassword(temporaryPassword)
    const emailText = `
Bienvenue sur Verifinvestigation - Vos identifiants de connexion

Bonjour ${username},

Votre compte ${roleDisplay} a été créé avec succès sur la plateforme Verifinvestigation.

=== VOS IDENTIFIANTS TEMPORAIRES ===
Email: ${email}
Mot de passe temporaire: ${maskedPwd}
================================

⚠️ IMPORTANT - Changez votre mot de passe

Pour des raisons de sécurité, vous devez changer votre mot de passe lors de votre première connexion.

Conseils pour un mot de passe sécurisé:
- Au moins 8 caractères
- Mélange de majuscules, minuscules et chiffres
- Ne partagez jamais votre mot de passe

Connectez-vous ici: ${siteUrl}/login

===

Besoin d'aide ?
Si vous avez des questions ou des problèmes pour accéder à votre compte, contactez notre équipe de support à: ${supportEmail}

---
Verifinvestigation - Plateforme de vérification de l'information
Ce message a été envoyé automatiquement, merci de ne pas y répondre.
`

    // Try to send email using Resend API
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
          from: `Verifinvestigation <${fromEmail}>`,
          to: [email],
          subject: `🔐 Vos identifiants de connexion - Verifinvestigation`,
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
      console.log('Temporary password email sent successfully via Resend:', resendData)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Temporary password email sent successfully',
          email: email
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Development fallback: Log email to console (without exposing full password)
      console.log('=== TEMPORARY PASSWORD EMAIL (Development Mode) ===')
      console.log('To:', email)
      console.log('Subject:', 'Vos identifiants de connexion - Verifinvestigation')
      console.log('Username:', username)
      console.log('Role:', role)
      console.log('Temporary Password (masked):', maskedPassword)
      console.log('---')
      console.log('Email Body:')
      console.log(emailText)
      console.log('===================================================')
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email logged to console (development mode)',
          email: email,
          note: 'RESEND_API_KEY not configured - email logged to console instead'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in send-temporary-password:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to send temporary password email'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
