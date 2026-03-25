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

// Parse tokens from hash URL (for OAuth/email confirmation links)
async function parseHashUrlTokens() {
  const hash = window.location.hash
  
  // Check for error in hash first (e.g., expired confirmation link)
  // This must be checked BEFORE Vue Router processes the hash
  if (hash && hash.includes('error=')) {
    // Handle both standard hash format and Vue Router hash mode (#/)
    let tokenHash = hash
    if (hash.startsWith('#/')) {
      tokenHash = hash.substring(1) // Remove the leading #
    } else if (hash.startsWith('#')) {
      tokenHash = hash.substring(1)
    }
    
    const hashParams = new URLSearchParams(tokenHash)
    const error = hashParams.get('error')
    const errorCode = hashParams.get('error_code')
    const errorDescription = hashParams.get('error_description')
    
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
      
      // Clear the hash after processing but keep the base path
      window.history.replaceState(null, '', window.location.pathname)
      return
    }
  }
  
  // Handle standard hash format and Vue Router hash mode (#/)
  let tokenHash = hash
  if (hash.startsWith('#/')) {
    tokenHash = hash.substring(1) // Remove the leading #
  } else if (hash.startsWith('#')) {
    tokenHash = hash.substring(1)
  }
  
  if (!tokenHash || !tokenHash.includes('access_token')) {
    return
  }

  // Parse the parameters from the hash
  const hashParams = new URLSearchParams(tokenHash)
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const expiresIn = hashParams.get('expires_in')
  const expiresAt = hashParams.get('expires_at')
  const type = hashParams.get('type') // 'signup' or 'login'

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
        // Store error for display
        sessionStorage.setItem('confirmation_error', error.message)
      } else {
        console.log('[APP] Session established from URL tokens')
      }
      // Clear the hash after successful token processing
      // But preserve the base path for routing
      window.history.replaceState(null, '', window.location.pathname)
      // Reinitialize auth store
      await authStore.initialize()
    } catch (e) {
      console.error('[APP] Exception setting session from hash tokens:', e)
    }
  }
}

// Initialize auth state on app mount to ensure auth state is available early
onMounted(async () => {
  // First, check for tokens in the hash URL
  await parseHashUrlTokens()
  
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
