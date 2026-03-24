<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminStore, type AdminUser } from '../stores/admin'
import type { Report, ReportStatus } from '../stores/reports'
import BaseButton from '../components/BaseButton.vue'

const adminStore = useAdminStore()

const activeFilter = ref<string>('all')
const searchQuery = ref('')
const showDeleteModal = ref(false)
const reportToDelete = ref<Report | null>(null)
const showAssignModal = ref(false)
const reportToAssign = ref<Report | null>(null)
const selectedAssignee = ref<string>('')
const availableJournalists = ref<AdminUser[]>([])

const filters = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' }
]

const filteredReports = computed(() => {
  // Always exclude verification requests - show only signalements
  let reports = adminStore.reports.filter(r => r.type !== 'verification')
  
  if (activeFilter.value !== 'all') {
    reports = reports.filter(r => r.status === activeFilter.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    reports = reports.filter(r => 
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.username?.toLowerCase().includes(query)
    )
  }
  
  return reports
})

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'en_attente':
      return 'bg-jaune-100 text-jaune-700'
    case 'en_cours':
      return 'bg-bleu-100 text-bleu-700'
    case 'termine':
      return 'bg-vert-100 text-vert-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'en_attente':
      return 'En attente'
    case 'en_cours':
      return 'En cours'
    case 'termine':
      return 'Terminé'
    default:
      return status
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const updateStatus = async (report: Report, newStatus: ReportStatus) => {
  await adminStore.updateReportStatus(report.id, newStatus)
}

const openAssignModal = async (report: Report) => {
  reportToAssign.value = report
  selectedAssignee.value = report.assigned_to || ''
  
  // Fetch journalists for the dropdown
  await adminStore.fetchAllUsers()
  availableJournalists.value = adminStore.users.filter(u => u.role === 'journalist' || u.role === 'admin')
  
  showAssignModal.value = true
}

const assignReport = async () => {
  if (!reportToAssign.value) return
  
  await adminStore.assignReport(
    reportToAssign.value.id, 
    selectedAssignee.value || null
  )
  showAssignModal.value = false
  reportToAssign.value = null
  selectedAssignee.value = ''
}

const confirmDelete = (report: Report) => {
  reportToDelete.value = report
  showDeleteModal.value = true
}

const deleteReport = async () => {
  if (!reportToDelete.value) return
  
  await adminStore.deleteReport(reportToDelete.value.id)
  showDeleteModal.value = false
  reportToDelete.value = null
}

onMounted(() => {
  adminStore.fetchAllReports()
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
            Gestion des Signalements
          </h1>
          <p class="text-gray-600 mt-1">
            Gérer les signalements et demandes de vérification
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

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 border border-gray-200">
          <div class="text-sm text-gray-500">Total</div>
          <div class="text-2xl font-bold text-gray-900">{{ adminStore.reports.length }}</div>
        </div>
        <div class="bg-jaune-50 rounded-lg p-4 border border-jaune-200">
          <div class="text-sm text-jaune-700">En attente</div>
          <div class="text-2xl font-bold text-jaune-700">{{ adminStore.reports.filter(r => r.status === 'en_attente').length }}</div>
        </div>
        <div class="bg-bleu-50 rounded-lg p-4 border border-bleu-200">
          <div class="text-sm text-bleu-700">En cours</div>
          <div class="text-2xl font-bold text-bleu-700">{{ adminStore.reports.filter(r => r.status === 'en_cours').length }}</div>
        </div>
        <div class="bg-vert-50 rounded-lg p-4 border border-vert-200">
          <div class="text-sm text-vert-700">Terminés</div>
          <div class="text-2xl font-bold text-vert-700">{{ adminStore.reports.filter(r => r.status === 'termine').length }}</div>
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
              placeholder="Rechercher par titre, description ou auteur..."
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

      <!-- Reports List -->
      <div v-else class="space-y-4">
        <div
          v-for="report in filteredReports"
          :key="report.id"
          class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ report.title }}
                </h3>
                <span :class="['px-3 py-1 rounded-full text-xs font-medium', getStatusBadgeClass(report.status)]">
                  {{ getStatusLabel(report.status) }}
                </span>
              </div>
              <p class="text-gray-600 text-sm mb-3 line-clamp-2">
                {{ report.description }}
              </p>
              <div class="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>Par: {{ report.username || 'Anonyme' }}</span>
                <span>Créé le: {{ formatDate(report.created_at) }}</span>
                <span v-if="report.assigned_username">
                  Assigné à: {{ report.assigned_username }}
                </span>
              </div>
            </div>
            
            <div class="flex flex-col gap-2">
              <!-- Status Actions -->
              <div class="flex gap-2">
                <button
                  v-if="report.status !== 'en_attente'"
                  @click="updateStatus(report, 'en_attente')"
                  class="px-3 py-1 text-xs font-medium rounded-lg bg-jaune-100 text-jaune-700 hover:bg-jaune-200"
                  title="Marquer en attente"
                >
                  ⏳ En attente
                </button>
                <button
                  v-if="report.status !== 'en_cours'"
                  @click="updateStatus(report, 'en_cours')"
                  class="px-3 py-1 text-xs font-medium rounded-lg bg-bleu-100 text-bleu-700 hover:bg-bleu-200"
                  title="Marquer en cours"
                >
                  🔄 En cours
                </button>
                <button
                  v-if="report.status !== 'termine'"
                  @click="updateStatus(report, 'termine')"
                  class="px-3 py-1 text-xs font-medium rounded-lg bg-vert-100 text-vert-700 hover:bg-vert-200"
                  title="Marquer terminé"
                >
                  ✅ Terminé
                </button>
              </div>
              
              <div class="flex gap-2">
                <button
                  @click="openAssignModal(report)"
                  class="px-3 py-1 text-xs font-medium rounded-lg bg-nuit-100 text-nuit-700 hover:bg-nuit-200"
                  title="Assigner à un journaliste"
                >
                  👤 Assigner
                </button>
                <button
                  @click="$router.push(`/investigation/${report.id}`)"
                  class="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                  title="Voir les détails"
                >
                  👁️ Voir
                </button>
                <button
                  @click="confirmDelete(report)"
                  class="px-3 py-1 text-xs font-medium rounded-lg bg-alerte-100 text-alerte-700 hover:bg-alerte-200"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredReports.length === 0" class="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Aucun signalement trouvé
          </h3>
          <p class="text-gray-600">
            {{ searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Aucun signalement n\'a encore été créé' }}
          </p>
        </div>
      </div>

      <!-- Assign Modal -->
      <div v-if="showAssignModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Assigner le signalement
          </h3>
          <p class="text-gray-600 mb-4">
            {{ reportToAssign?.title }}
          </p>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Assigner à un journaliste
            </label>
            <select
              v-model="selectedAssignee"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
            >
              <option value="">Non assigné</option>
              <option
                v-for="journalist in availableJournalists"
                :key="journalist.id"
                :value="journalist.id"
              >
                {{ journalist.username }} ({{ journalist.role }})
              </option>
            </select>
          </div>
          
          <div class="flex justify-end gap-3">
            <BaseButton variant="outline" @click="showAssignModal = false">
              Annuler
            </BaseButton>
            <BaseButton variant="primary" @click="assignReport">
              Assigner
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
            Êtes-vous sûr de vouloir supprimer le signalement <strong>{{ reportToDelete?.title }}</strong> ?
            Cette action est irréversible et supprimera également toutes les données associées.
          </p>
          <div class="flex justify-end gap-3">
            <BaseButton variant="outline" @click="showDeleteModal = false">
              Annuler
            </BaseButton>
            <BaseButton variant="primary" class="bg-alerte-600 hover:bg-alerte-700" @click="deleteReport">
              Supprimer
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
