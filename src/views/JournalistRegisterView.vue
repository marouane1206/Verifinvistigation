<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import BaseInput from '../components/BaseInput.vue'
import BaseTextarea from '../components/BaseTextarea.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

// Specializations available in the dropdown
const specializations = [
  { value: '', label: 'Sélectionner une spécialisation' },
  { value: 'Investigation', label: 'Investigation' },
  { value: 'Politique', label: 'Politique' },
  { value: 'Affaires', label: 'Affaires' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Culture', label: 'Culture' },
  { value: 'Technologie', label: 'Technologie' },
  { value: 'Environnement', label: 'Environnement' },
  { value: 'Autre', label: 'Autre' },
]

// Form data
const formData = ref({
  // Basic auth fields
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  
  // Journalist application fields
  fullName: '',
  phone: '',
  mediaOutlet: '',
  journalistIdNumber: '',
  yearsExperience: '',
  specialization: '',
  portfolioUrl: '',
  previousWorkSamples: '',
  motivation: '',
})

const acceptTerms = ref(false)
const errors = ref<Record<string, string>>({})
const isSubmitting = ref(false)
const registrationSuccess = ref(false)
const errorMessage = ref('')
let lastSubmitTime = 0

// Helper function to wait for profile creation with polling
const waitForProfileCreation = async (userId: string, maxAttempts = 10): Promise<boolean> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (!error && data) {
      return true
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return false
}

// Pre-fill email if user is logged in
onMounted(async () => {
  await authStore.initialize()
  if (authStore.user?.email) {
    formData.value.email = authStore.user.email
  }
})

function validateForm(): boolean {
  errors.value = {}
  
  // Required basic fields
  if (!formData.value.username) {
    errors.value.username = 'Le nom d\'utilisateur est requis'
  }
  
  if (!formData.value.email) {
    errors.value.email = 'L\'email est requis'
  }
  
  if (!formData.value.password) {
    errors.value.password = 'Le mot de passe est requis'
  } else if (formData.value.password.length < 6) {
    errors.value.password = 'Le mot de passe doit contenir au moins 6 caractères'
  }
  
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Les mots de passe ne correspondent pas'
  }
  
  if (!acceptTerms.value) {
    errors.value.terms = 'Vous devez accepter les conditions d\'utilisation'
  }
  
  // Required journalist fields
  if (!formData.value.fullName) {
    errors.value.fullName = 'Le nom complet est requis'
  }
  
  if (!formData.value.mediaOutlet) {
    errors.value.mediaOutlet = 'Le média/organisation est requis'
  }
  
  if (!formData.value.motivation) {
    errors.value.motivation = 'La motivation est requise'
  }
  
  // Portfolio URL validation (if provided)
  if (formData.value.portfolioUrl) {
    try {
      new URL(formData.value.portfolioUrl)
    } catch {
      errors.value.portfolioUrl = 'L\'URL du portfolio doit être une adresse valide (ex: https://exemple.com)'
    }
  }
  
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  const now = Date.now()
  if (now - lastSubmitTime < 3000) {
    errors.value.general = 'Veuillez patienter avant de soumettre à nouveau'
    return
  }
  lastSubmitTime = now
  
  if (isSubmitting.value) return
  
  if (!validateForm()) {
    return
  }
  
  isSubmitting.value = true
  errorMessage.value = ''
  
  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.value.email,
      password: formData.value.password,
      options: {
        data: {
          username: formData.value.username,
          is_journalist: 'true',
        },
      },
    })
    
    if (authError) {
      const errMsg = authError.message.toLowerCase()
      
      if (errMsg.includes('email') && (errMsg.includes('already') || errMsg.includes('exists'))) {
        errorMessage.value = 'Cet email est déjà utilisé'
      } else if (errMsg.includes('password') && errMsg.includes('least')) {
        errorMessage.value = 'Le mot de passe doit contenir au moins 6 caractères'
      } else if (errMsg.includes('invalid email')) {
        errorMessage.value = 'Format d\'email invalide'
      } else {
        errorMessage.value = 'Erreur lors de l\'inscription: ' + authError.message
      }
      isSubmitting.value = false
      return
    }
    
    if (!authData.user) {
      errorMessage.value = 'Erreur lors de la création du compte'
      isSubmitting.value = false
      return
    }
    
    // Wait for profile to be created by trigger (with polling for up to 5 seconds)
    const profileCreated = await waitForProfileCreation(authData.user.id)
    if (!profileCreated) {
      console.warn('[JournalistRegister] Profile creation might be delayed, continuing anyway')
    }
    
    // Step 2: Create journalist application
    const { error: applicationError } = await supabase
      .from('journalist_applications')
      .insert({
        user_id: authData.user.id,
        full_name: formData.value.fullName,
        email: formData.value.email,
        phone: formData.value.phone || null,
        media_outlet: formData.value.mediaOutlet,
        journalist_id_number: formData.value.journalistIdNumber || null,
        years_experience: formData.value.yearsExperience ? parseInt(formData.value.yearsExperience) : null,
        specialization: formData.value.specialization || null,
        portfolio_url: formData.value.portfolioUrl || null,
        previous_work_samples: formData.value.previousWorkSamples || null,
        motivation: formData.value.motivation,
        status: 'pending',
      })
    
    if (applicationError) {
      console.error('[JournalistRegister] Application error:', applicationError)
      // Rollback: delete the created auth user since application creation failed
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
        console.log('[JournalistRegister] Rolled back user creation due to application failure')
      } catch (deleteError) {
        console.error('[JournalistRegister] Failed to rollback user deletion:', deleteError)
      }
      errorMessage.value = 'Erreur lors de la soumission de la demande'
      isSubmitting.value = false
      return
    }
    
    // Success!
    registrationSuccess.value = true
    
  } catch (error: any) {
    console.error('[JournalistRegister] Unexpected error:', error)
    errorMessage.value = 'Une erreur inattendue est survenue'
  } finally {
    isSubmitting.value = false
  }
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-ardoise-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">
          Inscription Journaliste
        </h1>
        <p class="mt-2 text-gray-600">
          Rejoignez notre réseau de journalistes pour mener des enquêtes et vérifier les informations
        </p>
      </div>

      <!-- Success Message -->
      <div
        v-if="registrationSuccess"
        class="bg-white rounded-lg shadow-lg p-8 mb-8"
      >
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-vert-100 mb-4">
            <svg class="h-8 w-8 text-vert-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Demande soumise avec succès !
          </h2>
          <p class="text-gray-600 mb-6">
            Votre demande d'inscription en tant que journaliste a été soumise et est en attente d'approbation par notre équipe.
            Vous recevrez un email une fois votre demande traitée.
          </p>
          <div class="space-y-4">
            <p class="text-sm text-gray-500">
              Pendant ce temps, vous pouvez :
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <router-link
                to="/"
                class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-nuit-700 bg-nuit-100 hover:bg-nuit-200"
              >
                Retour à l'accueil
              </router-link>
              <button
                @click="goToLogin"
                class="inline-flex items-center justify-center px-4 py-2 border border-nuit-300 text-sm font-medium rounded-md text-nuit-700 bg-white hover:bg-gray-50"
              >
                Se connecter
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Registration Form -->
      <div v-else class="bg-white rounded-lg shadow-lg p-8">
        <!-- General Error -->
        <div
          v-if="errorMessage"
          class="mb-6 bg-alerte-50 border border-alerte-200 text-alerte-700 px-4 py-3 rounded relative"
        >
          {{ errorMessage }}
        </div>

        <form class="space-y-8" @submit.prevent="handleSubmit">
          <!-- Section: Identifiants de connexion -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">
              Identifiants de connexion
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
          </div>

          <!-- Section: Informations professionnelles -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">
              Informations professionnelles
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Full Name -->
              <BaseInput
                v-model="formData.fullName"
                label="Nom complet"
                type="text"
                placeholder="Jean Dupont"
                :error="errors.fullName"
                required
              />

              <!-- Phone -->
              <BaseInput
                v-model="formData.phone"
                label="Téléphone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                :error="errors.phone"
              />

              <!-- Media Outlet -->
              <BaseInput
                v-model="formData.mediaOutlet"
                label="Média / Organisation"
                type="text"
                placeholder="Le Journal, France Télévisions..."
                :error="errors.mediaOutlet"
                required
                class="md:col-span-2"
              />

              <!-- Journalist ID Number -->
              <BaseInput
                v-model="formData.journalistIdNumber"
                label="Numéro de carte de presse / Identifiant"
                type="text"
                placeholder="Numéro de carte ou badge professionnel"
                :error="errors.journalistIdNumber"
              />

              <!-- Years of Experience -->
              <BaseInput
                v-model="formData.yearsExperience"
                label="Années d'expérience"
                type="number"
                placeholder="5"
                :error="errors.yearsExperience"
                min="0"
              />

              <!-- Specialization -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Spécialisation
                </label>
                <select
                  v-model="formData.specialization"
                  :class="[
                    'block w-full rounded-md border-gray-300 shadow-sm',
                    'focus:border-nuit-500 focus:ring-nuit-500 sm:text-sm',
                    'px-3 py-2 border',
                    errors.specialization ? 'border-alerte-500' : ''
                  ]"
                >
                  <option
                    v-for="spec in specializations"
                    :key="spec.value"
                    :value="spec.value"
                  >
                    {{ spec.label }}
                  </option>
                </select>
                <p v-if="errors.specialization" class="mt-1 text-sm text-alerte-600">
                  {{ errors.specialization }}
                </p>
              </div>

              <!-- Portfolio URL -->
              <BaseInput
                v-model="formData.portfolioUrl"
                label="URL du portfolio / Portfolio en ligne"
                type="url"
                placeholder="https://portfolio.exemple.com"
                :error="errors.portfolioUrl"
                class="md:col-span-2"
              />

              <!-- Previous Work Samples -->
              <BaseTextarea
                v-model="formData.previousWorkSamples"
                label="Exemples de travaux précédents"
                placeholder="Décrivez vos précédents travauxjournalistiques, enquêtes publiées, articles..."
                :rows="4"
                :error="errors.previousWorkSamples"
                class="md:col-span-2"
              />
            </div>
          </div>

          <!-- Section: Motivation -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">
              Motivation
            </h3>
            <BaseTextarea
              v-model="formData.motivation"
              label="Pourquoi souhaitez-vous rejoindre Verifinvestigation ?"
              placeholder="Expliquez votre motivation à rejoindre notre plateforme..."
              :rows="5"
              :error="errors.motivation"
              required
            />
          </div>

          <!-- Terms Acceptance -->
          <div class="bg-nuit-50 border border-nuit-200 rounded-md p-4">
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
          </div>

          <!-- Submit Button -->
          <div class="flex flex-col sm:flex-row gap-4">
            <BaseButton
              type="submit"
              variant="primary"
              size="lg"
              class="flex-1"
              :loading="isSubmitting"
              :disabled="isSubmitting"
            >
              Soumettre ma demande
            </BaseButton>
            <router-link
              to="/register"
              class="inline-flex items-center justify-center px-6 py-3 border border-nuit-300 text-sm font-medium rounded-md text-nuit-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </router-link>
          </div>

          <!-- Login Link -->
          <div class="text-center pt-4 border-t">
            <p class="text-sm text-gray-600">
              Déjà inscrit ?
              <router-link
                to="/login"
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