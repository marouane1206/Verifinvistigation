<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminStore, type AdminUser } from '../stores/admin'
import { useAuthStore } from '../stores/auth'
import BaseButton from '../components/BaseButton.vue'

const route = useRoute()
const adminStore = useAdminStore()
const authStore = useAuthStore()

const activeFilter = ref<string>('user')
const searchQuery = ref('')
const showDeleteModal = ref(false)
const userToDelete = ref<AdminUser | null>(null)
const showRoleModal = ref(false)
const userToEdit = ref<AdminUser | null>(null)
const newRole = ref<'user' | 'journalist' | 'admin'>('user')

// Determine context based on route path
const userContext = computed(() => {
  const path = route.path
  if (path.includes('/journalists')) {
    return 'journalist'
  }
  return 'user'
})

// Page title based on context
const pageTitle = computed(() => {
  return userContext.value === 'journalist' 
    ? 'Gestion des Journalistes' 
    : 'Gestion des Utilisateurs'
})

// Description based on context
const pageDescription = computed(() => {
  return userContext.value === 'journalist'
    ? 'Gérer les journalistes et leurs demandes d\'approbation'
    : 'Gérer les utilisateurs, journalistes et administrateurs'
})

const filters = computed(() => {
  if (userContext.value === 'journalist') {
    return [
      { value: 'all', label: 'Tous' },
      { value: 'journalist', label: 'Journalistes' }
    ]
  }
  return [
    { value: 'all', label: 'Tous' },
    { value: 'user', label: 'Utilisateurs' }
  ]
})

const filteredUsers = computed(() => {
  let users
  
  if (userContext.value === 'journalist') {
    // Show only journalist role when accessed via "Journalistes" menu
    users = adminStore.users.filter(u => u.role === 'journalist')
  } else {
    // Show only regular users (exclude admin and journalist) when accessed via "Utilisateurs" menu
    users = adminStore.users.filter(u => u.role !== 'admin' && u.role !== 'journalist')
  }
  
  if (activeFilter.value !== 'all') {
    users = users.filter(u => u.role === activeFilter.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    users = users.filter(u => 
      u.username.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    )
  }
  
  return users
})

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-nuit-100 text-nuit-700'
    case 'journalist':
      return 'bg-bleu-100 text-bleu-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrateur'
    case 'journalist':
      return 'Journaliste'
    default:
      return 'Utilisateur'
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const openRoleModal = (user: AdminUser) => {
  userToEdit.value = user
  newRole.value = user.role
  showRoleModal.value = true
}

const updateRole = async () => {
  if (!userToEdit.value) return
  
  await adminStore.updateUserRole(userToEdit.value.id, newRole.value)
  showRoleModal.value = false
  userToEdit.value = null
}

const confirmDelete = (user: AdminUser) => {
  userToDelete.value = user
  showDeleteModal.value = true
}

const deleteUser = async () => {
  if (!userToDelete.value) return
  
  // Prevent deleting yourself
  if (userToDelete.value.id === authStore.user?.id) {
    adminStore.error = 'Vous ne pouvez pas supprimer votre propre compte'
    showDeleteModal.value = false
    userToDelete.value = null
    return
  }
  
  await adminStore.deleteUser(userToDelete.value.id)
  showDeleteModal.value = false
  userToDelete.value = null
}

onMounted(() => {
  adminStore.fetchAllUsers()
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
            {{ pageTitle }}
          </h1>
          <p class="text-gray-600 mt-1">
            {{ pageDescription }}
          </p>
        </div>
        <div class="mt-4 md:mt-0">
          <router-link to="/admin">
            <BaseButton variant="outline">
              ← Retour au tableau de bord
            </BaseButton>
          </router-link>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher par nom ou email..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
            />
          </div>
          
          <!-- Filter Buttons -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="filter in filters"
              :key="filter.value"
              @click="activeFilter = filter.value"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeFilter === filter.value
                  ? 'bg-nuit-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="adminStore.loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <!-- Error Message -->
      <div v-else-if="adminStore.error" class="bg-alerte-50 border border-alerte-200 rounded-lg p-4 mb-6">
        <p class="text-alerte-700">{{ adminStore.error }}</p>
      </div>

      <!-- Users Table -->
      <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'inscription
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-nuit-100 flex items-center justify-center">
                      <span class="text-nuit-600 font-medium">{{ user.username.charAt(0).toUpperCase() }}</span>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ user.username }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">{{ user.email }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="['px-3 py-1 rounded-full text-xs font-medium', getRoleBadgeClass(user.role)]">
                    {{ getRoleLabel(user.role) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">{{ formatDate(user.created_at) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-2">
                    <button
                      @click="openRoleModal(user)"
                      class="text-nuit-600 hover:text-nuit-800"
                      title="Modifier le rôle"
                    >
                      ✏️
                    </button>
                    <button
                      @click="confirmDelete(user)"
                      class="text-alerte-600 hover:text-alerte-800"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredUsers.length === 0" class="text-center py-12">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Aucun utilisateur trouvé
          </h3>
          <p class="text-gray-600">
            {{ searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Aucun utilisateur n\'a encore été enregistré' }}
          </p>
        </div>
      </div>

      <!-- Role Modal -->
      <div v-if="showRoleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Modifier le rôle de {{ userToEdit?.username }}
          </h3>
          
          <div class="space-y-3 mb-6">
            <label
              v-for="role in ['user', 'journalist', 'admin']"
              :key="role"
              class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              :class="newRole === role ? 'border-nuit-500 bg-nuit-50' : 'border-gray-300'"
            >
              <input
                v-model="newRole"
                type="radio"
                :value="role"
                class="h-4 w-4 text-nuit-600 focus:ring-nuit-500"
              />
              <span class="ml-3 text-sm font-medium text-gray-900">
                {{ getRoleLabel(role) }}
              </span>
            </label>
          </div>
          
          <div class="flex justify-end gap-3">
            <BaseButton variant="outline" @click="showRoleModal = false">
              Annuler
            </BaseButton>
            <BaseButton variant="primary" @click="updateRole">
              Enregistrer
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Confirmer la suppression
          </h3>
          <p class="text-gray-600 mb-6">
            Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{{ userToDelete?.username }}</strong> ?
            Cette action est irréversible.
          </p>
          <div class="flex justify-end gap-3">
            <BaseButton variant="outline" @click="showDeleteModal = false">
              Annuler
            </BaseButton>
            <BaseButton variant="primary" class="bg-alerte-600 hover:bg-alerte-700" @click="deleteUser">
              Supprimer
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
