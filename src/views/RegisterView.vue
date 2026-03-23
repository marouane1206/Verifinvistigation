<script setup lang="ts">
import { ref } from 'vue'
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

async function handleSubmit() {
  errors.value = {}
  
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
    formData.value.username,
    formData.value.password
  )
  
  if (success) {
    router.push('/dashboard')
  } else {
    errors.value.general = authStore.error || 'Erreur lors de l\'inscription'
  }
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
              :loading="authStore.loading"
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