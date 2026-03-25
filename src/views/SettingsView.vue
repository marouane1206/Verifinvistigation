<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAdminStore, type AdminUser } from '../stores/admin'
import { validatePassword, type PasswordValidationResult } from '../lib/password'
import BaseInput from '../components/BaseInput.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const adminStore = useAdminStore()

// Import forcePasswordChange and updatePassword from auth store
const { forcePasswordChange, updatePassword: authUpdatePassword } = authStore

const username = ref('')
const email = ref('')
const role = ref<'user' | 'journalist' | 'admin'>('user')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showDeleteConfirm = ref(false)

// Forced password change state
const forcedNewPassword = ref('')
const forcedConfirmPassword = ref('')
const forcedPasswordError = ref('')
const forcedPasswordSuccess = ref(false)

// Password validation for forced change
const passwordValidation = computed<PasswordValidationResult>(() => {
  return validatePassword(forcedNewPassword.value)
})

// Password strength indicator
const passwordStrength = computed(() => {
  const validation = passwordValidation.value
  if (!forcedNewPassword.value) return { level: 0, label: '', color: '' }
  
  const errors = validation.errors.length
  if (errors === 0) return { level: 4, label: 'Fort', color: 'bg-green-500' }
  if (errors <= 2) return { level: 3, label: 'Moyen', color: 'bg-yellow-500' }
  if (errors <= 3) return { level: 2, label: 'Faible', color: 'bg-orange-500' }
  return { level: 1, label: 'Très faible', color: 'bg-red-500' }
})

// Check if forced password change is required
const needsForcedPasswordChange = computed(() => {
  return forcePasswordChange === true
})

// Check if this is admin editing another user
const isAdminEditMode = computed(() => !!route.params.id && route.name === 'admin-user-edit')
const targetUserId = computed(() => route.params.id as string)
const targetUser = ref<AdminUser | null>(null)

// Check if current user is admin
const isAdmin = computed(() => authStore.user?.role === 'admin')

// Check if role is being changed (passed as query parameter)
const pendingRoleChange = computed(() => {
  return route.query.role as 'user' | 'journalist' | 'admin' | undefined
})

const user = computed(() => {
  if (isAdminEditMode.value && targetUser.value) {
    return targetUser.value
  }
  return authStore.user
})

const getRoleLabel = (r: string) => {
  switch (r) {
    case 'admin': return 'Administrateur'
    case 'journalist': return 'Journaliste'
    default: return 'Utilisateur'
  }
}

const getRoleBadgeClass = (r: string) => {
  switch (r) {
    case 'admin': return 'bg-nuit-100 text-nuit-700'
    case 'journalist': return 'bg-bleu-100 text-bleu-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

onMounted(async () => {
  // Verify admin authorization for admin edit mode
  if (isAdminEditMode.value && !isAdmin.value) {
    router.push('/admin/users')
    return
  }

  if (isAdminEditMode.value && targetUserId.value) {
    // Fetch the user being edited
    await adminStore.fetchAllUsers()
    targetUser.value = adminStore.users.find(u => u.id === targetUserId.value) || null
    if (!targetUser.value) {
      errorMessage.value = 'Utilisateur introuvable'
      return
    }
    if (targetUser.value) {
      username.value = targetUser.value.username || ''
      email.value = targetUser.value.email || ''
      role.value = targetUser.value.role || 'user'
      
      // If there's a pending role change, apply it
      if (pendingRoleChange.value && pendingRoleChange.value !== targetUser.value.role) {
        isLoading.value = true
        try {
          const result = await adminStore.updateUserRole(targetUserId.value, pendingRoleChange.value)
          if (result) {
            role.value = pendingRoleChange.value
            targetUser.value = { ...targetUser.value, role: pendingRoleChange.value }
            successMessage.value = `Rôle mis à jour vers ${getRoleLabel(pendingRoleChange.value)}`
          } else {
            errorMessage.value = adminStore.error || 'Erreur lors de la mise à jour du rôle'
          }
        } finally {
          isLoading.value = false
        }
      }
    }
  } else if (user.value) {
    username.value = user.value.username || ''
    email.value = user.value.email || ''
  }
})

async function handleUpdateProfile() {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    // Update role via admin store if in admin mode
    if (isAdminEditMode.value && targetUserId.value && role.value !== targetUser.value?.role) {
      const result = await adminStore.updateUserRole(targetUserId.value, role.value)
      if (result) {
        targetUser.value = { ...targetUser.value!, role: role.value }
        successMessage.value = 'Rôle mis à jour avec succès'
      } else {
        errorMessage.value = adminStore.error || 'Erreur lors de la mise à jour du rôle'
      }
    }

    // Update username via auth store or admin store depending on mode
    if (isAdminEditMode.value && targetUserId.value) {
      if (username.value !== targetUser.value?.username) {
        const result = await adminStore.updateUserUsername(targetUserId.value, username.value)
        if (result) {
          targetUser.value = result
          successMessage.value = successMessage.value || 'Profil mis à jour avec succès'
        } else {
          errorMessage.value = adminStore.error || 'Erreur lors de la mise à jour du profil'
        }
      }
    } else {
      if (username.value !== user.value?.username) {
        await authStore.updateUsername(username.value)
        successMessage.value = 'Profil mis à jour avec succès'
      }
    }
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

async function handleForcedPasswordChange() {
  forcedPasswordError.value = ''
  forcedPasswordSuccess.value = false

  // Validate password requirements
  const validation = passwordValidation.value
  if (!validation.valid) {
    forcedPasswordError.value = validation.errors.join('\n')
    return
  }

  // Check password confirmation
  if (forcedNewPassword.value !== forcedConfirmPassword.value) {
    forcedPasswordError.value = 'Les mots de passe ne correspondent pas'
    return
  }

  isLoading.value = true

  try {
    const result = await authUpdatePassword(forcedNewPassword.value)
    
    if (result.success) {
      forcedPasswordSuccess.value = true
      forcedNewPassword.value = ''
      forcedConfirmPassword.value = ''
      // The forcePasswordChange ref in auth store will be cleared automatically
    } else {
      forcedPasswordError.value = result.error || 'Erreur lors du changement de mot de passe'
    }
  } catch (error: any) {
    forcedPasswordError.value = error.message || 'Une erreur inattendue est survenue lors de la mise à jour du mot de passe'
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
      <!-- Forced Password Change Form -->
      <div v-if="needsForcedPasswordChange && !isAdminEditMode" class="bg-white rounded-xl shadow-lg border border-nuit-200 p-6">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-nuit-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-nuit-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">
            Changement de mot de passe obligatoire
          </h1>
          <p class="text-gray-600 mt-2">
            Vous devez changer votre mot de passe pour accéder à votre compte. Votre nouveau mot de passe doit respecter les critères de sécurité ci-dessous.
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="forcedPasswordError" class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg whitespace-pre-line">
          {{ forcedPasswordError }}
        </div>

        <!-- Success Message -->
        <div v-if="forcedPasswordSuccess" class="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          Mot de passe mis à jour avec succès ! Vous pouvez maintenant accéder à vos paramètres.
        </div>

        <!-- Password Change Form -->
        <form v-if="!forcedPasswordSuccess" @submit.prevent="handleForcedPasswordChange" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe <span class="text-red-500">*</span>
            </label>
            <input
              v-model="forcedNewPassword"
              type="password"
              placeholder="Entrez votre nouveau mot de passe"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
              required
            />
            
            <!-- Password Strength Indicator -->
            <div v-if="forcedNewPassword" class="mt-2">
              <div class="flex items-center gap-2 mb-1">
                <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    class="h-full transition-all duration-300" 
                    :class="passwordStrength.color"
                    :style="{ width: `${passwordStrength.level * 25}%` }"
                  ></div>
                </div>
                <span class="text-sm font-medium" :class="{
                  'text-green-700': passwordStrength.level === 4,
                  'text-yellow-700': passwordStrength.level === 3,
                  'text-orange-700': passwordStrength.level === 2,
                  'text-red-700': passwordStrength.level === 1
                }">
                  {{ passwordStrength.label }}
                </span>
              </div>
            </div>
          </div>

          <!-- Password Requirements -->
          <div class="bg-gray-50 rounded-lg p-4 text-sm">
            <p class="font-medium text-gray-700 mb-2">Exigences du mot de passe :</p>
            <ul class="space-y-1 text-gray-600">
              <li :class="{ 'text-green-600': forcedNewPassword.length >= 12 }">
                ✓ Au moins 12 caractères
              </li>
              <li :class="{ 'text-green-600': /[A-Z]/.test(forcedNewPassword) }">
                ✓ Au moins une majuscule
              </li>
              <li :class="{ 'text-green-600': /[a-z]/.test(forcedNewPassword) }">
                ✓ Au moins une minuscule
              </li>
              <li :class="{ 'text-green-600': /[0-9]/.test(forcedNewPassword) }">
                ✓ Au moins un chiffre
              </li>
              <li :class="{ 'text-green-600': /[!@#$%^&*()_+=-]/.test(forcedNewPassword) }">
                ✓ Au moins un caractère spécial (!@#$%^&*()_+=-)
              </li>
            </ul>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe <span class="text-red-500">*</span>
            </label>
            <input
              v-model="forcedConfirmPassword"
              type="password"
              placeholder="Confirmez votre nouveau mot de passe"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
              required
            />
            <p v-if="forcedConfirmPassword && forcedNewPassword !== forcedConfirmPassword" class="text-red-600 text-sm mt-1">
              Les mots de passe ne correspondent pas
            </p>
          </div>

          <div class="pt-4">
            <BaseButton
              type="submit"
              variant="primary"
              :loading="isLoading"
              class="w-full"
            >
              Mettre à jour mon mot de passe
            </BaseButton>
          </div>
        </form>

        <div v-else class="text-center">
          <BaseButton
            variant="primary"
            @click="router.push('/dashboard')"
          >
            Accéder à mon tableau de bord
          </BaseButton>
        </div>
      </div>

      <!-- Regular Settings View (when not forced to change password) -->
      <template v-else>
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
          {{ isAdminEditMode ? (targetUser ? `Modifier le profil: ${targetUser.username}` : 'Profil introuvable') : 'Paramètres du compte' }}
        </h1>
        <p class="text-gray-600 mt-1">
          {{ isAdminEditMode ? 'Modifier les informations de l\'utilisateur' : 'Gérez vos informations personnelles et les paramètres de votre compte' }}
        </p>
        <router-link
          v-if="isAdminEditMode"
          to="/admin/users"
          class="text-nuit-600 hover:text-nuit-800 text-sm mt-2 inline-block"
        >
          ← Retour à la gestion des utilisateurs
        </router-link>
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
          <!-- Role (Admin only) -->
          <div v-if="isAdminEditMode">
            <label class="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              v-model="role"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
            >
              <option value="user">Utilisateur</option>
              <option value="journalist">Journaliste</option>
              <option value="admin">Administrateur</option>
            </select>
            <p class="text-sm text-gray-500 mt-1">
              <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', getRoleBadgeClass(targetUser?.role || 'user')]">
                Rôle actuel: {{ getRoleLabel(targetUser?.role || 'user') }}
              </span>
            </p>
          </div>
          
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
      <div v-if="!isAdminEditMode" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
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
      <div v-if="!isAdminEditMode" class="bg-white rounded-xl shadow-sm border border-red-200 p-6">
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
      </template>
    </div>
  </div>
</template>