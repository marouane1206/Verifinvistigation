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
    const redirect = route.query.redirect as string || '/dashboard'
    router.push(redirect)
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