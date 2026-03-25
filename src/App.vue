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
  // Handle both standard hash format and Vue Router hash mode (#/)
  let tokenHash = hash
  if (hash.startsWith('#/')) {
    tokenHash = hash.substring(1) // Remove the leading #
  }
  
  if (!tokenHash || !tokenHash.includes('access_token')) return

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
      } else {
        console.log('[APP] Session established from URL tokens')
        // Clear the hash after successful token processing
        // But preserve the base path for routing
        window.history.replaceState(null, '', window.location.pathname)
        // Reinitialize auth store
        await authStore.initialize()
      }
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
