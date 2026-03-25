<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '../stores/admin'
import { useApplicationsStore, type JournalistApplication } from '../stores/applications'
import BaseButton from '../components/BaseButton.vue'

const adminStore = useAdminStore()
const applicationsStore = useApplicationsStore()

// State
const activeFilter = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const searchQuery = ref('')
const selectedApplication = ref<JournalistApplication | null>(null)
const showDetailModal = ref(false)
const showRejectModal = ref(false)
const rejectNotes = ref('')
const processingId = ref<string | null>(null)

// Filters
const filters = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvées' },
  { value: 'rejected', label: 'Rejetées' }
]

// Computed
const filteredApplications = computed(() => {
  let apps: JournalistApplication[] = applicationsStore.allApplications || []
  
  if (activeFilter.value !== 'all') {
    apps = apps.filter((app: JournalistApplication) => app.status === activeFilter.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    apps = apps.filter((app: JournalistApplication) => 
      app.full_name.toLowerCase().includes(query) ||
      app.email.toLowerCase().includes(query) ||
      (app.media_outlet && app.media_outlet.toLowerCase().includes(query))
    )
  }
  
  return apps
})

const pendingCount = computed(() => {
  return applicationsStore.allApplications?.filter((app: JournalistApplication) => app.status === 'pending').length || 0
})

// Methods
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'approved':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'approved':
      return 'Approuvée'
    case 'rejected':
      return 'Rejetée'
    default:
      return status
  }
}

const openDetailModal = (application: JournalistApplication) => {
  selectedApplication.value = application
  showDetailModal.value = true
}

const closeDetailModal = () => {
  selectedApplication.value = null
  showDetailModal.value = false
}

const openRejectModal = (application: JournalistApplication) => {
  selectedApplication.value = application
  rejectNotes.value = ''
  showRejectModal.value = true
}

const closeRejectModal = () => {
  selectedApplication.value = null
  rejectNotes.value = ''
  showRejectModal.value = false
}

const approveApplication = async (applicationId: string) => {
  processingId.value = applicationId
  try {
    const success = await applicationsStore.approveApplication(applicationId)
    if (success) {
      await applicationsStore.getAllApplications()
      closeDetailModal()
    }
  } finally {
    processingId.value = null
  }
}

const rejectApplication = async () => {
  if (!selectedApplication.value) return
  
  processingId.value = selectedApplication.value.id
  try {
    const success = await applicationsStore.rejectApplication(selectedApplication.value.id, rejectNotes.value)
    if (success) {
      await applicationsStore.getAllApplications()
      closeRejectModal()
      closeDetailModal()
    }
  } finally {
    processingId.value = null
  }
}

// Lifecycle
onMounted(async () => {
  await applicationsStore.getAllApplications()
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
            Demandes de Journalistes
          </h1>
          <p class="text-gray-600 mt-1">
            Gérer les demandes d'inscription des journalistes
          </p>
        </div>
        <div class="mt-4 md:mt-0 flex items-center gap-3">
          <div v-if="pendingCount > 0" class="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium">
            {{ pendingCount }} demande{{ pendingCount > 1 ? 's' : '' }} en attente
          </div>
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
              placeholder="Rechercher par nom, email ou média..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
            />
          </div>
          
          <!-- Filter Tabs -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="filter in filters"
              :key="filter.value"
              @click="activeFilter = filter.value as 'all' | 'pending' | 'approved' | 'rejected'"
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

      <!-- Applications Table -->
      <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Média
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de demande
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr 
                v-for="app in filteredApplications" 
                :key="app.id" 
                class="hover:bg-gray-50 cursor-pointer"
                @click="openDetailModal(app)"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-nuit-100 flex items-center justify-center">
                      <span class="text-nuit-600 font-medium">{{ app.full_name.charAt(0).toUpperCase() }}</span>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ app.full_name }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">{{ app.email }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">{{ app.media_outlet || '-' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">{{ formatDate(app.created_at) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="['px-3 py-1 rounded-full text-xs font-medium', getStatusBadgeClass(app.status)]">
                    {{ getStatusLabel(app.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-2" @click.stop>
                    <button
                      v-if="app.status === 'pending'"
                      @click="openDetailModal(app)"
                      class="text-nuit-600 hover:text-nuit-800 px-3 py-1 text-sm"
                    >
                      Voir détails
                    </button>
                    <span v-else class="text-gray-400 text-sm">-</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredApplications.length === 0" class="text-center py-12">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Aucune demande trouvée
          </h3>
          <p class="text-gray-600">
            {{ searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Aucune demande de journaliste n\'a été soumise' }}
          </p>
        </div>
      </div>

      <!-- Detail Modal -->
      <div v-if="showDetailModal && selectedApplication" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-start mb-6">
            <h3 class="text-xl font-semibold text-gray-900">
              Détails de la demande
            </h3>
            <button @click="closeDetailModal" class="text-gray-400 hover:text-gray-600">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Application Info -->
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-500">Nom complet</label>
                <p class="text-gray-900">{{ selectedApplication.full_name }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Email</label>
                <p class="text-gray-900">{{ selectedApplication.email }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-500">Téléphone</label>
                <p class="text-gray-900">{{ selectedApplication.phone || '-' }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Média / Outlet</label>
                <p class="text-gray-900">{{ selectedApplication.media_outlet || '-' }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-500">Numéro de carte de presse</label>
                <p class="text-gray-900">{{ selectedApplication.journalist_id_number || '-' }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Années d'expérience</label>
                <p class="text-gray-900">{{ selectedApplication.years_experience || '-' }}</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-500">Spécialisation</label>
              <p class="text-gray-900">{{ selectedApplication.specialization || '-' }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-500">URL du portfolio</label>
              <p class="text-gray-900">
                <a v-if="selectedApplication.portfolio_url" :href="selectedApplication.portfolio_url" target="_blank" class="text-nuit-600 hover:underline">
                  {{ selectedApplication.portfolio_url }}
                </a>
                <span v-else>-</span>
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-500">Échantillons de travail précédent</label>
              <p class="text-gray-900 whitespace-pre-wrap">{{ selectedApplication.previous_work_samples || '-' }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-500">Motivation</label>
              <p class="text-gray-900 whitespace-pre-wrap">{{ selectedApplication.motivation }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label class="block text-sm font-medium text-gray-500">Date de soumission</label>
                <p class="text-gray-900">{{ formatDate(selectedApplication.created_at) }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Statut</label>
                <span :class="['px-3 py-1 rounded-full text-xs font-medium', getStatusBadgeClass(selectedApplication.status)]">
                  {{ getStatusLabel(selectedApplication.status) }}
                </span>
              </div>
            </div>

            <div v-if="selectedApplication.admin_notes">
              <label class="block text-sm font-medium text-gray-500">Notes de l'administrateur</label>
              <p class="text-gray-900 whitespace-pre-wrap">{{ selectedApplication.admin_notes }}</p>
            </div>

            <div v-if="selectedApplication.reviewed_at">
              <label class="block text-sm font-medium text-gray-500">Date de révision</label>
              <p class="text-gray-900">{{ formatDate(selectedApplication.reviewed_at) }}</p>
            </div>
          </div>

          <!-- Actions for Pending Applications -->
          <div v-if="selectedApplication.status === 'pending'" class="mt-6 pt-6 border-t flex justify-end gap-3">
            <BaseButton variant="outline" @click="openRejectModal(selectedApplication)">
              Rejeter
            </BaseButton>
            <BaseButton 
              variant="primary" 
              class="bg-green-600 hover:bg-green-700"
              :disabled="processingId === selectedApplication.id"
              @click="approveApplication(selectedApplication.id)"
            >
              {{ processingId === selectedApplication.id ? 'Traitement...' : 'Approuver' }}
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Reject Modal -->
      <div v-if="showRejectModal && selectedApplication" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Rejeter la demande
          </h3>
          <p class="text-gray-600 mb-4">
            Vous êtes sur le point de rejeter la demande de <strong>{{ selectedApplication.full_name }}</strong>.
          </p>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Motif du rejet (optionnel)
            </label>
            <textarea
              v-model="rejectNotes"
              rows="4"
              placeholder="Expliquez pourquoi cette demande est rejetée..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
            ></textarea>
          </div>
          
          <div class="flex justify-end gap-3">
            <BaseButton variant="outline" @click="closeRejectModal">
              Annuler
            </BaseButton>
            <BaseButton 
              variant="primary" 
              class="bg-red-600 hover:bg-red-700"
              :disabled="processingId === selectedApplication.id"
              @click="rejectApplication"
            >
              {{ processingId === selectedApplication.id ? 'Traitement...' : 'Confirmer le rejet' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
