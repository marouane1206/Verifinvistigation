<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseInput from '../components/BaseInput.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formData = ref({
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
})

const acceptTerms = ref(false)
const errors = ref<Record<string, string>>({})
const isSubmitting = ref(false)
const registrationSuccess = ref(false)
let lastSubmitTime = 0

// Redirect authenticated users on mount
onMounted(async () => {
  // Initialize auth if not done yet
  try {
    if (!authStore.user && !authStore.loading) {
      await authStore.initialize()
    }
    
    // Redirect authenticated users away from register page
    if (authStore.isAuthenticated) {
      if (authStore.isJournalist) {
        router.replace('/journalistes/dashboard')
      } else {
        router.replace('/users/dashboard')
      }
    }
  } catch (error) {
    console.error('[RegisterView] Auth initialization failed:', error)
  }
})


async function handleSubmit() {
  const now = Date.now()
  if (now - lastSubmitTime < 3000) {
    console.log('[REGISTER] Debounce: preventing rapid submission')
    errors.value.general = 'Veuillez patienter avant de soumettre à nouveau'
    return
  }
  lastSubmitTime = now
  
  if (isSubmitting.value) return
  isSubmitting.value = true
  
  errors.value = {}
  registrationSuccess.value = false
  
  // Validation
  if (!formData.value.email) {
    errors.value.email = 'L\'email est requis'
    isSubmitting.value = false
    return
  }
  
  if (!formData.value.username) {
    errors.value.username = 'Le nom d\'utilisateur est requis'
    isSubmitting.value = false
    return
  }
  
  if (!formData.value.password) {
    errors.value.password = 'Le mot de passe est requis'
    isSubmitting.value = false
    return
  }
  
  if (formData.value.password.length < 6) {
    errors.value.password = 'Le mot de passe doit contenir au moins 6 caractères'
    isSubmitting.value = false
    return
  }
  
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Les mots de passe ne correspondent pas'
    isSubmitting.value = false
    return
  }
  
  if (!acceptTerms.value) {
    errors.value.terms = 'Vous devez accepter les conditions d\'utilisation'
    isSubmitting.value = false
    return
  }

  const success = await authStore.register(
    formData.value.email,
    formData.value.password,
    formData.value.username
  )
  
  if (success) {
    console.log('[Register] Registration successful, user:', authStore.user)
    console.log('[Register] isJournalist computed:', authStore.isJournalist)
    
    if (authStore.emailConfirmationPending) {
      // Email confirmation is required - show success message
      registrationSuccess.value = true
      errors.value.general = '' // Clear any previous errors
    } else {
      // No email confirmation required - redirect based on role
      if (authStore.isJournalist) {
        router.push('/journalistes/dashboard')
      } else {
        router.push('/users/dashboard')
      }
    }
  } else {
    errors.value.general = authStore.error || 'Erreur lors de l\'inscription'
  }
  
  isSubmitting.value = false
}
</script>

<template>
  <div class="min-h-screen bg-ardoise-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
        Créer un compte
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Rejoignez Verifinvestigation pour signaler et vérifier les informations
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Journalist Link (positioned at top) -->
          <div class="bg-nuit-50 border-2 border-nuit-200 rounded-lg p-4">
            <div class="text-center">
              <p class="text-gray-700 font-medium mb-2">
                Vous êtes journaliste et souhaitez rejoindre le réseau professionnel ?
              </p>
              <p class="text-sm text-gray-500 mb-3">
                Utilisez le formulaire dédié aux professionnels de l'investigation
              </p>
              <router-link
                to="/journalistes/register"
                class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-nuit-600 hover:bg-nuit-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nuit-500 transition-colors duration-200"
              >
                → Accéder au formulaire journaliste
              </router-link>
            </div>
          </div>

          <!-- Success Message -->
          <div
            v-if="registrationSuccess"
            class="bg-vert-50 border border-vert-200 text-vert-700 px-4 py-3 rounded relative"
          >
            <p class="font-medium">Inscription réussie !</p>
            <p class="text-sm mt-1">Veuillez vérifier votre email pour confirmer votre compte avant de vous connecter.</p>
          </div>

          <!-- General Error -->
          <div
            v-if="errors.general"
            class="bg-alerte-50 border border-alerte-200 text-alerte-700 px-4 py-3 rounded relative"
          >
            {{ errors.general }}
          </div>

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

          <!-- Username -->
          <BaseInput
            v-model="formData.username"
            label="Nom d'utilisateur"
            type="text"
            placeholder="pseudo123"
            :error="errors.username"
            required
            autocomplete="username"
          />

          <!-- Password -->
          <BaseInput
            v-model="formData.password"
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            :error="errors.password"
            required
            autocomplete="new-password"
          />

          <!-- Confirm Password -->
          <BaseInput
            v-model="formData.confirmPassword"
            label="Confirmer le mot de passe"
            type="password"
            placeholder="••••••••"
            :error="errors.confirmPassword"
            required
            autocomplete="new-password"
          />

          <!-- Terms -->
          <div class="flex items-start">
            <div class="flex items-center h-5">
              <input
                id="terms"
                v-model="acceptTerms"
                type="checkbox"
                class="h-4 w-4 text-nuit-600 border-gray-300 rounded focus:ring-nuit-500"
              />
            </div>
            <div class="ml-3 text-sm">
              <label for="terms" class="font-medium text-gray-700">
                J'accepte les
                <a href="#" class="text-nuit-600 hover:text-nuit-500">conditions d'utilisation</a>
                et la
                <a href="#" class="text-nuit-600 hover:text-nuit-500">politique de confidentialité</a>
              </label>
              <p v-if="errors.terms" class="text-alerte-600 mt-1">{{ errors.terms }}</p>
            </div>
          </div>

          <!-- Submit -->
          <div>
            <BaseButton
              type="submit"
              variant="primary"
              class="w-full"
              :loading="isSubmitting || authStore.loading"
              :disabled="isSubmitting"
            >
              Créer mon compte
            </BaseButton>
          </div>

          <!-- Login Link -->
          <div class="text-center">
            <p class="text-sm text-gray-600">
              Déjà inscrit ?
              <router-link
                :to="{ name: 'login', query: route.query }"
                class="font-medium text-nuit-600 hover:text-nuit-500"
              >
                Se connecter
              </router-link>
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>