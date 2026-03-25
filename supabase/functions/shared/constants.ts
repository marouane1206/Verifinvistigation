// supabase/functions/shared/constants.ts
// Shared constants for Supabase Edge Functions
// This file centralizes fallback URLs and other configuration values

/**
 * Default fallback URL when SITE_URL environment variable is not set
 * Used as fallback in Edge Functions for email links and redirects
 */
export const DEFAULT_SITE_URL = 'https://marouane1206.github.io/Verifinvistigation'

/**
 * Get the site URL from environment or use default fallback
 */
export function getSiteUrl(): string {
  return Deno.env.get('SITE_URL') || DEFAULT_SITE_URL
}

/**
 * Default support email address
 */
export const DEFAULT_SUPPORT_EMAIL = 'support@verifinvestigation.org'

/**
 * Get support email from environment or use default
 */
export function getSupportEmail(): string {
  return Deno.env.get('SUPPORT_EMAIL') || DEFAULT_SUPPORT_EMAIL
}

/**
 * Default from email for outgoing emails
 */
export const DEFAULT_FROM_EMAIL = 'noreply@verifinvestigation.org'

/**
 * Get from email from environment or use default
 */
export function getFromEmail(): string {
  return Deno.env.get('FROM_EMAIL') || DEFAULT_FROM_EMAIL
}