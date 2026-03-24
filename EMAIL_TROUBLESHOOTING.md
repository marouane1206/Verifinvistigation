# Email Delivery Troubleshooting Guide

## Problem

Confirmation emails are not being delivered to new user registrations. Users who sign up for new accounts are not receiving the verification/confirmation email required to activate their account.

## Root Cause

**No custom SMTP server is configured in Supabase.**

When no custom SMTP is configured, Supabase uses its default built-in email service which:

- Has limited deliverability
- Often gets marked as spam
- Has rate limits on free tier
- Uses generic "from" addresses that email providers block

## Solution

### Step 1: Configure SMTP in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `qeyfzmtylwxmlgeprnmi`
3. Navigate to **Authentication** → **Providers** → **Email**
4. Scroll down to the **SMTP** section
5. Enable SMTP by toggling it on
6. Configure your SMTP server settings:

#### Option A: SendGrid (Recommended for ease of use)

- **Host:** `smtp.sendgrid.net`
- **Port:** `587` (or `465` for SSL)
- **Username:** `apikey`
- **Password:** Your SendGrid API key
- **Sender Email:** `noreply@yourdomain.com`
- **Sender Name:** `Verifinvestigation`

#### Option B: Mailgun

- **Host:** `smtp.mailgun.org`
- **Port:** `587`
- **Username:** `postmaster@yourdomain.com`
- **Password:** Your Mailgun SMTP password
- **Sender Email:** `noreply@yourdomain.com`

#### Option C: AWS SES

- **Host:** `email-smtp.us-east-1.amazonaws.com` (replace with your region)
- **Port:** `587`
- **Username:** Your AWS SES SMTP username
- **Password:** Your AWS SES SMTP password

#### Option D: Gmail (Not recommended for production)

- **Host:** `smtp.gmail.com`
- **Port:** `587`
- **Username:** Your Gmail address
- **Password:** [App Password](https://support.google.com/accounts/answer/185833) (not your regular password)

### Step 2: Configure Site URL

1. In the same **Authentication > Providers > Email** page
2. Find the **Site URL** field
3. Set it to: `https://verifinvestigation.org`

### Step 3: Verify Email Settings

Make sure these settings are enabled:

- ✅ **Enable signup:** ON
- ✅ **Confirm email:** ON
- ✅ **Double confirm changes:** ON (optional)

### Step 4: Test Email Delivery

1. Register a new user account
2. Check if confirmation email is received
3. If not received, check:
   - Spam/junk folder
   - Email provider's quarantine

## Alternative: Resend Confirmation Email

If users have already registered but didn't receive the email:

1. Go to Supabase Dashboard → Authentication → Users
2. Find the user
3. Click "Send Confirmation Email" button

## Rate Limits

If you're on Supabase Free Tier, be aware of email sending limits:

- 2 emails per hour (when using custom SMTP)
- 3 emails per hour (using Supabase default)

To increase limits, upgrade to Supabase Pro plan.

## Troubleshooting

### Emails still not delivered?

1. Verify SMTP credentials are correct
2. Check your SMTP provider's dashboard for sending logs
3. Ensure sender email domain is verified (especially for SendGrid/Mailgun)
4. Check if your domain has SPF/DKIM records set up

### Local Development

For local development, Supabase uses Inbucket:

- Web interface: http://localhost:54324
- Emails sent locally can be viewed in the Inbucket dashboard
- No real emails are sent in development mode
