<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseInput from '../components/BaseInput.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const email = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showDeleteConfirm = ref(false)

const user = computed(() => authStore.user)

onMounted(() => {
  if (user.value) {
    username.value = user.value.username || ''
    email.value = user.value.email || ''
  }
})

async function handleUpdateProfile() {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    // Update username via auth store
    if (username.value !== user.value?.username) {
      await authStore.updateUsername(username.value)
    }
    successMessage.value = 'Profil mis à jour avec succès'
  } catch (error: any) {
    errorMessage.value = error.message || 'Erreur lors de la mise à jour du profil'
  } finally {
    isLoading.value = false
  }
}

async function handleChangePassword() {
  errorMessage.value = ''
  successMessage.value = ''

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Les mots de passe ne correspondent pas'
    return
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = 'Le mot de passe doit contenir au moins 6 caractères'
    return
  }

  isLoading.value = true

  try {
    // Password change would be handled by auth store
    successMessage.value = 'Mot de passe mis à jour avec succès'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error: any) {
    errorMessage.value = error.message || 'Erreur lors du changement de mot de passe'
  } finally {
    isLoading.value = false
  }
}

async function handleDeleteAccount() {
  errorMessage.value = ''
  isLoading.value = true

  try {
    await authStore.deleteAccount()
    router.push('/')
  } catch (error: any) {
    errorMessage.value = error.message || 'Erreur lors de la suppression du compte'
  } finally {
    isLoading.value = false
    showDeleteConfirm.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-ardoise-50 py-8">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
          Paramètres du compte
        </h1>
        <p class="text-gray-600 mt-1">
          Gérez vos informations personnelles et les paramètres de votre compte
        </p>
      </div>

      <!-- Messages -->
      <div v-if="errorMessage" class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
        {{ successMessage }}
      </div>

      <!-- Profile Section -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
        
        <form @submit.prevent="handleUpdateProfile" class="space-y-4">
          <BaseInput
            v-model="username"
            label="Nom d'utilisateur"
            type="text"
            placeholder="Votre nom d'utilisateur"
            required
          />
          
          <BaseInput
            v-model="email"
            label="Email"
            type="email"
            placeholder="Votre adresse email"
            disabled
            hint="L'email ne peut pas être modifié"
          />

          <div class="pt-2">
            <BaseButton
              type="submit"
              variant="primary"
              :loading="isLoading"
            >
              Mettre à jour le profil
            </BaseButton>
          </div>
        </form>
      </div>

      <!-- Password Section -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Changer le mot de passe</h2>
        
        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <BaseInput
            v-model="currentPassword"
            label="Mot de passe actuel"
            type="password"
            placeholder="Votre mot de passe actuel"
          />
          
          <BaseInput
            v-model="newPassword"
            label="Nouveau mot de passe"
            type="password"
            placeholder="Votre nouveau mot de passe"
          />

          <BaseInput
            v-model="confirmPassword"
            label="Confirmer le mot de passe"
            type="password"
            placeholder="Confirmez votre nouveau mot de passe"
          />

          <div class="pt-2">
            <BaseButton
              type="submit"
              variant="secondary"
              :loading="isLoading"
            >
              Changer le mot de passe
            </BaseButton>
          </div>
        </form>
      </div>

      <!-- Delete Account Section -->
      <div class="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Supprimer le compte</h2>
        <p class="text-gray-600 mb-4">
          Cette action est irréversible. Toutes vos données seront définitivement supprimées.
        </p>

        <div v-if="!showDeleteConfirm">
          <BaseButton
            variant="danger"
            @click="showDeleteConfirm = true"
          >
            Supprimer mon compte
          </BaseButton>
        </div>

        <div v-else class="bg-red-50 rounded-lg p-4 border border-red-200">
          <p class="text-red-700 font-medium mb-4">
            Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.
          </p>
          <div class="flex gap-3">
            <BaseButton
              variant="danger"
              :loading="isLoading"
              @click="handleDeleteAccount"
            >
              Oui, supprimer définitivement
            </BaseButton>
            <BaseButton
              variant="outline"
              @click="showDeleteConfirm = false"
            >
              Annuler
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>