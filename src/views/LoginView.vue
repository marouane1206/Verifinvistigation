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
  password: '',
})

const errors = ref<Record<string, string>>({})

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
        </form>
      </div>
    </div>
  </div>
</template>