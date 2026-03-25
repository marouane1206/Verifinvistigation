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

const isJournalist = ref(false)

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
  // Prevent rapid repeated submissions (debounce)
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
    return
  }
  
  if (!formData.value.username) {
    errors.value.username = 'Le nom d\'utilisateur est requis'
    return
  }
  
  if (!formData.value.password) {
    errors.value.password = 'Le mot de passe est requis'
    return
  }
  
  if (formData.value.password.length < 6) {
    errors.value.password = 'Le mot de passe doit contenir au moins 6 caractères'
    return
  }
  
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Les mots de passe ne correspondent pas'
    return
  }
  
  if (!acceptTerms.value) {
    errors.value.terms = 'Vous devez accepter les conditions d\'utilisation'
    return
  }

  const success = await authStore.register(
    formData.value.email,
    formData.value.password,
    formData.value.username,
    isJournalist.value
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

          <!-- Journalist Checkbox -->
          <div class="bg-nuit-50 border border-nuit-200 rounded-md p-4">
            <div class="flex items-start">
              <div class="flex items-center h-5">
                <input
                  id="is_journalist"
                  v-model="isJournalist"
                  type="checkbox"
                  class="h-4 w-4 text-nuit-600 border-gray-300 rounded focus:ring-nuit-500"
                />
              </div>
              <div class="ml-3 text-sm">
                <label for="is_journalist" class="font-medium text-gray-700">
                  Je suis journaliste
                </label>
                <p class="text-gray-500 mt-1">
                  Cochez cette case si vous êtes journaliste professionnel. Cela vous accordera un accès au tableau de bord journalist et la possibilité de mener des enquêtes.
                </p>
                <div class="mt-3 pt-3 border-t border-nuit-200">
                  <router-link
                    to="/journalistes/register"
                    class="text-nuit-600 hover:text-nuit-500 font-medium text-sm"
                  >
                    → Formulaire d'inscription détaillé pour journalistes
                  </router-link>
                  <p class="text-gray-500 text-xs mt-1">
                    Si vous souhaitez постuler avec un dossier complet (portefeuille, spécialisation, références), utilisez le formulaire dédié.
                  </p>
                </div>
              </div>
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