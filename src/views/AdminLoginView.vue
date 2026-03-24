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
  password: '',
})

const errors = ref<Record<string, string>>({})
const loading = ref(false)

async function handleSubmit() {
  errors.value = {}
  loading.value = true
  
  if (!formData.value.email) {
    errors.value.email = 'L\'email est requis'
    loading.value = false
    return
  }
  
  if (!formData.value.password) {
    errors.value.password = 'Le mot de passe est requis'
    loading.value = false
    return
  }

  // Attempt login
  const success = await authStore.login(formData.value.email, formData.value.password)
  
  loading.value = false
  
  if (success) {
    // Check if user has admin role
    if (authStore.isAdmin) {
      // Redirect to admin dashboard
      const redirect = route.query.redirect as string || '/admin'
      router.push(redirect)
    } else {
      // User is logged in but not an admin
      await authStore.logout()
      errors.value.general = 'Vous n\'avez pas les droits d\'administration'
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
        Administration
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Connexion à l'espace administrator
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
            label="Adresse email administrateur"
            type="email"
            placeholder="admin@exemple.com"
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
              :loading="loading"
            >
              Se connecter en tant qu'admin
            </BaseButton>
          </div>

          <!-- Back to regular login -->
          <div class="text-center">
            <p class="text-sm text-gray-600">
              Pas un administrateur ?
              <router-link
                :to="{ name: 'login', query: route.query }"
                class="font-medium text-nuit-600 hover:text-nuit-500"
              >
                Retour à la connexion utilisateur
              </router-link>
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>