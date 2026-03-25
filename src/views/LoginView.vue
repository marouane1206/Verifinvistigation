<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import BaseInput from '../components/BaseInput.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formData = ref({
  email: '',
  password: '',
})

const errors = ref<Record<string, string>>({})
const showResendConfirmation = ref(false)
const resendEmail = ref('')
const resendLoading = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')

// Check for unconfirmed email query parameter on mount
onMounted(async () => {
  // Initialize auth if not done yet
  try {
    if (!authStore.user && !authStore.loading) {
      await authStore.initialize()
    }
    
    // Redirect authenticated users away from login page - priority: admin > journalist > user
    if (authStore.isAuthenticated) {
      if (authStore.isAdmin) {
        router.replace({ name: 'admin-dashboard' })
      } else if (authStore.isJournalist) {
        router.replace('/journalistes/dashboard')
      } else {
        router.replace('/users/dashboard')
      }
      return
    }
  } catch (error) {
    console.error('[LoginView] Auth initialization failed:', error)
  }
  
  // Check for error from confirmation link (expired/invalid link)
  const confirmationError = sessionStorage.getItem('confirmation_error')
  const confirmationErrorType = sessionStorage.getItem('confirmation_error_type')
  
  // Check for success message (email already verified)
  const confirmationMessage = sessionStorage.getItem('confirmation_message')
  if (confirmationMessage) {
    errors.value.general = confirmationMessage
    sessionStorage.removeItem('confirmation_message')
  } else if (confirmationError) {
    // Display user-friendly French error message
    if (confirmationErrorType === 'expired' || confirmationError.includes('expired')) {
      errors.value.general = 'Ce lien de confirmation a expiré. Veuillez demander un nouveau lien de confirmation.'
      showResendConfirmation.value = true
    } else {
      errors.value.general = confirmationError
    }
    // Clear the stored error
    sessionStorage.removeItem('confirmation_error')
    sessionStorage.removeItem('confirmation_error_type')
  }
  
  if (route.query.unconfirmed === '1') {
    errors.value.general = 'Veuillez confirmer votre email avant de accéder à cette page'
    // Clear the query parameter to avoid showing the message again on refresh
    router.replace({ query: { redirect: route.query.redirect } })
  }
})

async function handleSubmit() {
  errors.value = {}
  
  if (!formData.value.email) {
    errors.value.email = 'L\'email est requis'
    return
  }
  
  if (!formData.value.password) {
    errors.value.password = 'Le mot de passe est requis'
    return
  }

  const success = await authStore.login(formData.value.email, formData.value.password)
  
  if (success) {
    // Check if user has admin role and redirect accordingly
    const redirect = route.query.redirect as string
    if (redirect) {
      router.push(redirect)
    } else if (authStore.isAdmin) {
      router.push({ name: 'admin-dashboard' })
    } else if (authStore.isJournalist) {
      router.push('/journalistes/dashboard')
    } else {
      router.push('/users/dashboard')
    }
  } else {
    errors.value.general = authStore.error || 'Erreur de connexion'
  }
}

async function handleResendConfirmation() {
  resendError.value = ''
  resendSuccess.value = false
  
  if (!resendEmail.value) {
    resendError.value = 'L\'email est requis'
    return
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(resendEmail.value)) {
    resendError.value = 'Format d\'email invalide'
    return
  }
  
  resendLoading.value = true
  
  try {
    // Check if the email exists in the database (profiles table)
    // Note: We need RLS policies to allow this check
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, status')
      .eq('email', resendEmail.value)
      .maybeSingle()
    
    if (profileError) {
      console.error('[LoginView] Profile lookup error:', profileError)
    }
    
    if (!profileData) {
      // Email not found in database - show error with options
      resendError.value = ''
      showResendConfirmation.value = false
      errors.value.general = `Cette adresse email n'est pas enregistrée dans notre système. Vous pouvez <a href="/register?email=${encodeURIComponent(resendEmail.value)}" class="font-medium text-nuit-600 hover:text-nuit-500 underline">créer un compte</a> ou vérifier votre adresse email.`
      return
    }
    
    // Email exists - check if account is active
    if (profileData.status === 'rejected') {
      resendError.value = ''
      showResendConfirmation.value = false
      errors.value.general = 'Votre compte a été rejeté. Veuillez contacter le support pour plus d\'informations.'
      return
    }
    
    if (profileData.status === 'active') {
      // Account is already active - prompt to login
      resendError.value = ''
      showResendConfirmation.value = false
      errors.value.general = 'Ce compte est déjà actif. Veuillez vous connecter avec votre mot de passe.'
      return
    }
    
    // Email exists but status is 'pending' - try to resend confirmation
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: resendEmail.value,
    })
    
    if (error) {
      console.error('[LoginView] Resend confirmation error:', error)
      
      // Check for specific error messages
      if (error.message.includes('rate limit') || error.message.includes('too many')) {
        resendError.value = 'Trop de demandes. Veuillez patienter quelques instants avant de réessayer.'
      } else if (error.message.includes('Email rate limit exceeded')) {
        resendError.value = 'Trop de demandes pour cet email. Veuillez patienter avant de réessayer.'
      } else {
        resendError.value = 'Erreur lors de l\'envoi du lien de confirmation. Veuillez réessayer.'
      }
    } else {
      resendSuccess.value = true
      showResendConfirmation.value = false
      errors.value.general = 'Un nouveau lien de confirmation a été envoyé à votre adresse email.'
    }
  } catch (e) {
    console.error('[LoginView] Resend confirmation exception:', e)
    resendError.value = 'Une erreur inattendue est survenue. Veuillez réessayer.'
  } finally {
    resendLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-ardoise-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
        Connexion
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Accédez à votre compte Verifinvestigation
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- General Error -->
          <div
            v-if="errors.general"
            class="bg-alerte-50 border border-alerte-200 text-alerte-700 px-4 py-3 rounded relative"
          >
            {{ errors.general }}
          </div>

          <!-- Resend Confirmation Form -->
          <div v-if="showResendConfirmation" class="space-y-4">
            <p class="text-sm text-gray-600">
              Entrez votre adresse email pour recevoir un nouveau lien de confirmation.
            </p>
            <BaseInput
              v-model="resendEmail"
              label="Adresse email"
              type="email"
              placeholder="vous@exemple.com"
              :error="resendError"
              required
              autocomplete="email"
            />
            <div class="flex gap-3">
              <BaseButton
                type="button"
                variant="primary"
                class="flex-1"
                :loading="resendLoading"
                @click="handleResendConfirmation"
              >
                Envoyer le lien
              </BaseButton>
              <BaseButton
                type="button"
                variant="secondary"
                class="flex-1"
                @click="showResendConfirmation = false"
              >
                Annuler
              </BaseButton>
            </div>
          </div>

          <!-- Regular Login Form -->
          <template v-else>
            <!-- Email -->
            <BaseInput
              v-model="formData.email"
              label="Adresse email"
              type="email"
              placeholder="vous@exemple.com"
              :error="errors.email"
              required
              autocomplete="email"
            />

            <!-- Password -->
            <BaseInput
              v-model="formData.password"
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              :error="errors.password"
              required
              autocomplete="current-password"
            />

            <!-- Submit -->
            <div>
              <BaseButton
                type="submit"
                variant="primary"
                class="w-full"
                :loading="authStore.loading"
              >
                Se connecter
              </BaseButton>
            </div>

            <!-- Register Link -->
            <div class="text-center">
              <p class="text-sm text-gray-600">
                Pas encore de compte ?
                <router-link
                  :to="{ name: 'register', query: route.query }"
                  class="font-medium text-nuit-600 hover:text-nuit-500"
                >
                  Créer un compte
                </router-link>
              </p>
            </div>
          </template>
        </form>
      </div>
    </div>
  </div>
</template>
