# Email Delivery Troubleshooting Guide

## Problem

Confirmation emails are not being delivered to new user registrations. Users who sign up for new accounts are not receiving the verification/confirmation email required to activate their account.

## Error Messages

If you see these errors in the browser console:

- `[Register] Registration successful, user: null`
- `Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received`
- `qeyfzmtylwxmlgeprnmi.supabase.co/auth/v1/signup:1 Failed to load resource: the server responded with a status of 500`
- `[AUTH] Registration error: Error sending confirmation email`

**This confirms the SMTP server is not configured.**

## Root Cause

**No custom SMTP server is configured in Supabase.**

When no custom SMTP is configured, Supabase uses its default built-in email service which:

- Has limited deliverability
- Often gets marked as spam
- Has rate limits on free tier (2 emails/hour)
- Uses generic "from" addresses that email providers block

## Solution

### Step 1: Configure SMTP in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `qeyfzmtylwxmlgeprnmi`
3. Navigate to **Authentication** → **Providers** → **Email**
4. Scroll down to the **SMTP** section
5. Enable SMTP by toggling it on
6. Configure your SMTP server settings:

#### Option A: SendGrid (Recommended)

1. Create a SendGrid account at https://sendgrid.com
2. Go to Settings → API Keys → Create API Key
3. Copy the API key (starts with `SG.`)
4. In Supabase, configure:
   - **Host:** `smtp.sendgrid.net`
   - **Port:** `587` (or `465` for SSL)
   - **Username:** `apikey`
   - **Password:** Your SendGrid API key
   - **Sender Email:** `noreply@yourdomain.com`
   - **Sender Name:** `Verifinvestigation`

**Important:** If using a free SendGrid trial, you need to verify your sender identity (single sender verification) before sending emails.

#### Option B: Mailgun

1. Create a Mailgun account at https://mailgun.com
2. Go to Sending → Domain Setup to add your domain
3. In Supabase, configure:
   - **Host:** `smtp.mailgun.org`
   - **Port:** `587`
   - **Username:** `postmaster@yourdomain.com`
   - **Password:** Your Mailgun SMTP password

#### Option C: AWS SES

1. Set up AWS SES in the AWS Console
2. Create SMTP credentials
3. In Supabase, configure:
   - **Host:** `email-smtp.us-east-1.amazonaws.com` (replace with your region)
   - **Port:** `587`
   - **Username:** Your AWS SES SMTP username
   - **Password:** Your AWS SES SMTP password

### Step 2: Verify Site URL

In the same **Authentication > Providers > Email** page, ensure:

- **Site URL:** `https://marouane1206.github.io/Verifinvistigation`
- **Redirect URLs:** Add your production URL

### Step 3: Enable Email Confirmations

Make sure these settings are enabled:

- ✅ **Enable signup:** ON
- ✅ **Confirm email:** ON

### Step 4: Test

1. Try registering a new user
2. Check if confirmation email is received
3. Check spam/junk folder

## Rate Limits

On Supabase Free Tier:

- 2 emails per hour (with custom SMTP)
- 3 emails per hour (Supabase default)

To increase, upgrade to Supabase Pro.

## Alternative Workaround

If you need immediate registration without email confirmation:

1. Go to Supabase Dashboard → Authentication → Providers → Email
2. Turn **OFF** "Confirm email"
3. Users will be logged in immediately after registration

**Warning:** This is less secure as users don't verify their email.

## Troubleshooting

### Still not working?

1. Verify SMTP credentials are correct
2. Check your SMTP provider's dashboard for sending logs
3. Ensure sender email domain is verified
4. Check SPF/DKIM records for your domain

### Local Development

For local development, Supabase uses Inbucket:

- Web interface: http://localhost:54324
- Emails can be viewed in the dashboard
- No real emails are sent locally
