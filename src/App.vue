<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TheNavbar from './components/TheNavbar.vue'
import AdminNav from './components/AdminNav.vue'
import TheFooter from './components/TheFooter.vue'
import { useAuthStore } from './stores/auth'
import { supabase } from './lib/supabase'

const route = useRoute()
const authStore = useAuthStore()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))

// Helper function for hash-based navigation
function navigateWithHash(path: string) {
  window.location.hash = path
}

// Parse tokens from hash URL (for OAuth/email confirmation links)
async function parseHashUrlTokens() {
  const hash = window.location.hash
  console.log('[APP] Current hash:', hash)
  
  // Check for error in hash first (e.g., expired confirmation link)
  if (hash && hash.includes('error=')) {
    console.log('[APP] Found error in hash')
    
    // Handle both standard hash format and Vue Router hash mode (#/)
    let tokenHash = hash
    if (hash.startsWith('#/')) {
      tokenHash = hash.substring(1)
    } else if (hash.startsWith('#')) {
      tokenHash = hash.substring(1)
    }
    
    console.log('[APP] Parsing tokenHash:', tokenHash)
    
    const hashParams = new URLSearchParams(tokenHash)
    const error = hashParams.get('error')
    const errorCode = hashParams.get('error_code')
    const errorDescription = hashParams.get('error_description')
    
    console.log('[APP] Parsed error:', error, errorCode, errorDescription)
    
    if (error || errorCode) {
      console.log('[APP] Error in URL hash:', error, errorCode, errorDescription)
      
      // Decode the error description (URL encoded)
      const decodedDescription = errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : ''
      
      // Store error for display in LoginView
      const errorMessage = decodedDescription || error || errorCode || 'Unknown error'
      sessionStorage.setItem('confirmation_error', errorMessage)
      
      // Store error type for resend logic
      if (errorCode === 'otp_expired' || error === 'access_denied') {
        sessionStorage.setItem('confirmation_error_type', 'expired')
      }
      
      // Use hash-based navigation to go to login
      navigateWithHash('/login')
      return
    }
  }
  
  // Handle standard hash format and Vue Router hash mode (#/)
  let tokenHash = hash
  if (hash.startsWith('#/')) {
    tokenHash = hash.substring(2) // Remove the leading #/
  } else if (hash.startsWith('#')) {
    tokenHash = hash.substring(1)
  }
  
  if (!tokenHash || !tokenHash.includes('access_token')) {
    return
  }

  // Parse the parameters from the hash
  const hashParams = new URLSearchParams(tokenHash)
  // Handle both 'access_token' and '/access_token' keys (hash router may include leading slash)
  const accessToken = hashParams.get('access_token') || hashParams.get('/access_token') || hashParams.get('%2Faccess_token')
  const refreshToken = hashParams.get('refresh_token') || hashParams.get('/refresh_token') || ''
  const expiresIn = hashParams.get('expires_in') || hashParams.get('/expires_in') || '3600'
  const expiresAt = hashParams.get('expires_at') || hashParams.get('/expires_at')
  const type = hashParams.get('type') || hashParams.get('/type') // 'signup' or 'login'

  if (accessToken) {
    console.log('[APP] Found tokens in URL hash, exchanging for session...')
    console.log('[APP] Token type:', type)
    
    // Build the token response format that Supabase expects
    const tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken || '',
      expires_in: parseInt(expiresIn || '3600'),
      expires_at: expiresAt ? parseInt(expiresAt) : undefined,
      token_type: 'bearer',
    }

    try {
      const { error } = await supabase.auth.setSession(tokenData)
      if (error) {
        console.error('[APP] Error setting session from hash tokens:', error)
        
        // Store error for display with French translation
        let errorMessage = error.message
        if (error.message.toLowerCase().includes('expired')) {
          errorMessage = 'Ce lien de confirmation a expiré. Veuillez demander un nouveau lien de confirmation.'
          sessionStorage.setItem('confirmation_error_type', 'expired')
        } else if (error.message.toLowerCase().includes('invalid')) {
          errorMessage = 'Ce lien de confirmation est invalide.'
        }
        sessionStorage.setItem('confirmation_error', errorMessage)
        
        // Use hash-based navigation to go to login
        navigateWithHash('/login')
      } else {
        console.log('[APP] Session established from URL tokens')
        
        // Store session flag to track that we just established a session from URL
        sessionStorage.setItem('just_confirmed', 'true')
        
        // Reinitialize auth store to get user profile
        await authStore.initialize()
        
        // Determine redirect path based on user role
        let redirectHash = '/users/dashboard'
        if (authStore.isAdmin) {
          redirectHash = '/admin'
        } else if (authStore.isJournalist) {
          redirectHash = '/journalistes/dashboard'
        }
        
        // Clear the hash and navigate to the appropriate route
        window.location.hash = redirectHash
      }
    } catch (e) {
      console.error('[APP] Exception setting session from hash tokens:', e)
      // Store error for display
      sessionStorage.setItem('confirmation_error', 'Une erreur inattendue est survenue')
      // Use hash-based navigation to go to login
      navigateWithHash('/login')
    }
  }
}

// Initialize auth state on app mount to ensure auth state is available early
onMounted(async () => {
  // First, check for tokens in the hash URL
  await parseHashUrlTokens()
  
  // Check if user just confirmed their email (from sessionStorage flag)
  const justConfirmed = sessionStorage.getItem('just_confirmed')
  if (justConfirmed) {
    sessionStorage.removeItem('just_confirmed')
    
    // Give auth store time to initialize and get the user
    setTimeout(async () => {
      if (!authStore.user) {
        await authStore.initialize()
      }
      
      // Redirect based on user role
      if (authStore.isAdmin) {
        window.location.hash = '/admin'
      } else if (authStore.isJournalist) {
        window.location.hash = '/journalistes/dashboard'
      } else {
        window.location.hash = '/users/dashboard'
      }
    }, 100)
    return
  }
  
  // Then initialize auth if needed
  if (!authStore.user && !authStore.loading) {
    authStore.initialize()
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AdminNav v-if="isAdminRoute" />
    <TheNavbar v-else />
    <main class="grow">
      <RouterView />
    </main>
    <TheFooter />
  </div>
</template>
