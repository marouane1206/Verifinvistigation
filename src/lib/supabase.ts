import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

// Create and export Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'verifinvestigation-web',
      // Add Accept header to prevent 406 errors
      'Accept': 'application/json'
    }
  }
})

// Export a function to check if the client is properly configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co')
}

// Export error types for handling
export const SupabaseError = {
  NOT_CONFIGURED: 'Supabase is not configured. Please add your Supabase URL and anon key to the .env file.',
  CONNECTION_FAILED: 'Failed to connect to Supabase. Please check your internet connection and Supabase project status.',
  AUTH_FAILED: 'Authentication failed. Please check your credentials.',
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  DELETE_FAILED: 'Failed to delete file. Please try again.'
}