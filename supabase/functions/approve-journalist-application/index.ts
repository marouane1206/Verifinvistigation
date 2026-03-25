// supabase/functions/approve-journalist-application/index.ts
// This Edge Function handles one-click approval from email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Get the token from the query string
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // First, validate the token and get the application
    const { data: tokenData, error: tokenError } = await supabase
      .from('journalist_approval_tokens')
      .select('*, journalist_applications(*)')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      // Return a user-friendly error page
      return new Response(
        generateErrorPage('Token invalide', 'Le lien d\'approbation est invalide ou a déjà été utilisé.'),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        generateErrorPage('Token expiré', 'Le lien d\'approbation a expiré. Veuillez demander un nouveau lien.'),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Check if token was already used
    if (tokenData.used_at) {
      return new Response(
        generateErrorPage('Token déjà utilisé', 'Ce lien d\'approbation a déjà été utilisé.'),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Get the application data
    const application = tokenData.journalist_applications

    // Check if application is still pending
    if (application.status !== 'pending') {
      const statusMessages: Record<string, string> = {
        'approved': 'Cette demande a déjà été approuvée.',
        'rejected': 'Cette demande a été rejetée.'
      }
      return new Response(
        generateErrorPage('Demande déjà traitée', statusMessages[application.status] || 'Cette demande a déjà été traitée.'),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Approve the application using the RPC function
    const { error: approveError } = await supabase.rpc('approve_journalist_application_by_token', {
      p_token: token
    })

    if (approveError) {
      console.error('Error approving application:', approveError)
      return new Response(
        generateErrorPage('Erreur', 'Une erreur est survenue lors de l\'approbation. Veuillez réessayer.'),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Get the updated application to show success
    const { data: updatedApplication } = await supabase
      .from('journalist_applications')
      .select('*, profiles(*)')
      .eq('id', application.id)
      .single()

    const siteUrl = Deno.env.get('SITE_URL') || 'https://verifinvestigation.org'
    const dashboardUrl = `${siteUrl}/journalistes/dashboard`

    // Return success page
    return new Response(
      generateSuccessPage(
        application.full_name,
        application.media_outlet,
        dashboardUrl,
        siteUrl
      ),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    )

  } catch (error) {
    console.error('Error in approve-journalist-application:', error)
    return new Response(
      generateErrorPage('Erreur serveur', 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.', siteUrl),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    )
  }
})

function generateErrorPage(title: string, message: string, siteUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Verifinvestigation</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #e53e3e;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #5568d3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${siteUrl}" class="btn">Retour à l'accueil</a>
  </div>
</body>
</html>
`
}

function generateSuccessPage(applicantName: string, mediaOutlet: string, dashboardUrl: string, siteUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande approuvée - Verifinvestigation</title>
  <meta http-equiv="refresh" content="5;url=${dashboardUrl}">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #38a169;
      font-size: 24px;
      margin-bottom: 16px;
    }
    .details {
      background: #f7fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: left;
    }
    .details p {
      margin: 8px 0;
      color: #4a5568;
    }
    .details strong {
      color: #2d3748;
    }
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #48bb78;
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #38a169;
    }
    .countdown {
      color: #999;
      font-size: 14px;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>Demande approuvée !</h1>
    <div class="details">
      <p><strong>Candidat:</strong> ${applicantName}</p>
      <p><strong>Média:</strong> ${mediaOutlet}</p>
      <p><strong>Statut:</strong> Journaliste actif</p>
    </div>
    <p>La demande de journaliste a été approuvée avec succès. Le candidat peut maintenant accéder à toutes les fonctionnalités de journaliste.</p>
    <a href="${dashboardUrl}" class="btn">Accéder au dashboard</a>
    <p class="countdown">Redirection automatique dans 5 secondes...</p>
  </div>
</body>
</html>
`
}
