<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useReportsStore, type ReportStatus } from '../stores/reports'
import BaseButton from '../components/BaseButton.vue'
import BaseBadge from '../components/BaseBadge.vue'

const router = useRouter()
const authStore = useAuthStore()
const reportsStore = useReportsStore()

const loading = ref(false)

// Filter state
const filters = ref({
  dateFrom: '',
  dateTo: '',
  status: '' as ReportStatus | '',
  type: '' as 'signalement' | 'verification' | ''
})

// Available reports (en_attente status - not assigned to anyone)
const availableReports = computed(() => 
  reportsStore.reports.filter(r => r.status === 'en_attente' && !r.assigned_to)
)

// My in-progress investigations (assigned to current user)
const myInProgressReports = computed(() => 
  reportsStore.reports.filter(r => r.status === 'en_cours' && r.assigned_to === authStore.user?.id)
)

// My completed investigations (assigned to current user)
const myCompletedReports = computed(() => 
  reportsStore.reports.filter(r => r.status === 'termine' && r.assigned_to === authStore.user?.id)
)

// Type-specific Signalement reports
const availableSignalements = computed(() => 
  availableReports.value.filter(r => r.type === 'signalement')
)

const inProgressSignalements = computed(() => 
  myInProgressReports.value.filter(r => r.type === 'signalement')
)

const completedSignalements = computed(() => 
  myCompletedReports.value.filter(r => r.type === 'signalement')
)

// Type-specific Vérification reports
const availableVerifications = computed(() => 
  availableReports.value.filter(r => r.type === 'verification')
)

const inProgressVerifications = computed(() => 
  myInProgressReports.value.filter(r => r.type === 'verification')
)

const completedVerifications = computed(() => 
  myCompletedReports.value.filter(r => r.type === 'verification')
)

// Filtered reports based on filter criteria
const filteredAvailableReports = computed(() => {
  return availableReports.value.filter(report => {
    // Filter by date from
    if (filters.value.dateFrom) {
      const reportDate = new Date(report.created_at)
      const fromDate = new Date(filters.value.dateFrom)
      if (reportDate < fromDate) return false
    }
    // Filter by date to
    if (filters.value.dateTo) {
      const reportDate = new Date(report.created_at)
      const toDate = new Date(filters.value.dateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      if (reportDate > toDate) return false
    }
    // Filter by status
    if (filters.value.status && report.status !== filters.value.status) return false
    // Filter by type
    if (filters.value.type && report.type !== filters.value.type) return false
    return true
  })
})

const filteredInProgressReports = computed(() => {
  return myInProgressReports.value.filter(report => {
    if (filters.value.dateFrom) {
      const reportDate = new Date(report.created_at)
      const fromDate = new Date(filters.value.dateFrom)
      if (reportDate < fromDate) return false
    }
    if (filters.value.dateTo) {
      const reportDate = new Date(report.created_at)
      const toDate = new Date(filters.value.dateTo)
      toDate.setHours(23, 59, 59, 999)
      if (reportDate > toDate) return false
    }
    if (filters.value.status && report.status !== filters.value.status) return false
    if (filters.value.type && report.type !== filters.value.type) return false
    return true
  })
})

const filteredCompletedReports = computed(() => {
  return myCompletedReports.value.filter(report => {
    if (filters.value.dateFrom) {
      const reportDate = new Date(report.created_at)
      const fromDate = new Date(filters.value.dateFrom)
      if (reportDate < fromDate) return false
    }
    if (filters.value.dateTo) {
      const reportDate = new Date(report.created_at)
      const toDate = new Date(filters.value.dateTo)
      toDate.setHours(23, 59, 59, 999)
      if (reportDate > toDate) return false
    }
    if (filters.value.status && report.status !== filters.value.status) return false
    if (filters.value.type && report.type !== filters.value.type) return false
    return true
  })
})

// Statistics
const stats = computed(() => ({
  pending: availableReports.value.length,
  inProgress: myInProgressReports.value.length,
  completed: myCompletedReports.value.length
}))

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function clearFilters() {
  filters.value = {
    dateFrom: '',
    dateTo: '',
    status: '',
    type: ''
  }
}

function viewReportDetails(reportId: string) {
  router.push(`/investigation/${reportId}`)
}

onMounted(async () => {
  loading.value = true
  try {
    await reportsStore.fetchAllReports()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
          Tableau de Bord Journaliste
        </h1>
        <p class="text-gray-600 mt-1">
          Consultez les signalements disponibles et le suivi de vos investigations
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-3xl font-bold text-jaune-600">{{ stats.pending }}</div>
              <div class="text-sm text-gray-600">En attente d'investigation</div>
            </div>
            <div class="text-4xl">📋</div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-3xl font-bold text-bleu-500">{{ stats.inProgress }}</div>
              <div class="text-sm text-gray-600">En cours</div>
            </div>
            <div class="text-4xl">🔍</div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-3xl font-bold text-vert-500">{{ stats.completed }}</div>
              <div class="text-sm text-gray-600">Terminés</div>
            </div>
            <div class="text-4xl">✅</div>
          </div>
        </div>
      </div>

      <!-- Quick Access Cards -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Accès rapide</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Signalement Section -->
          <div class="bg-white rounded-xl border border-gray-200 p-4">
            <h3 class="font-semibold text-gray-900 mb-3 flex items-center">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-alerte-100 text-alerte-800 mr-2">Signalement</span>
            </h3>
            <div class="space-y-2">
              <router-link to="/journaliste/signalement/disponible" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <span class="text-sm text-gray-700">Disponibles</span>
                <span class="text-sm font-medium text-nuit-600">{{ availableSignalements.length }}</span>
              </router-link>
              <router-link to="/journaliste/signalement/en-cours" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <span class="text-sm text-gray-700">En cours</span>
                <span class="text-sm font-medium text-bleu-500">{{ inProgressSignalements.length }}</span>
              </router-link>
              <router-link to="/journaliste/signalement/clos" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <span class="text-sm text-gray-700">Clos</span>
                <span class="text-sm font-medium text-vert-500">{{ completedSignalements.length }}</span>
              </router-link>
            </div>
          </div>

          <!-- Vérification Section -->
          <div class="bg-white rounded-xl border border-gray-200 p-4">
            <h3 class="font-semibold text-gray-900 mb-3 flex items-center">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bleu-100 text-bleu-800 mr-2">Vérification</span>
            </h3>
            <div class="space-y-2">
              <router-link to="/journaliste/verification/disponible" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <span class="text-sm text-gray-700">Disponibles</span>
                <span class="text-sm font-medium text-nuit-600">{{ availableVerifications.length }}</span>
              </router-link>
              <router-link to="/journaliste/verification/en-cours" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <span class="text-sm text-gray-700">En cours</span>
                <span class="text-sm font-medium text-bleu-500">{{ inProgressVerifications.length }}</span>
              </router-link>
              <router-link to="/journaliste/verification/clos" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <span class="text-sm text-gray-700">Clos</span>
                <span class="text-sm font-medium text-vert-500">{{ completedVerifications.length }}</span>
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Filtres</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Date From -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <input
              v-model="filters.dateFrom"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-600 focus:border-transparent"
            />
          </div>
          <!-- Date To -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
            <input
              v-model="filters.dateTo"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-600 focus:border-transparent"
            />
          </div>
          <!-- Status -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              v-model="filters.status"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-600 focus:border-transparent"
            >
              <option value="">Tous</option>
              <option value="en_attente">En attente</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
            </select>
          </div>
          <!-- Report Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Type de rapport</label>
            <select
              v-model="filters.type"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-600 focus:border-transparent"
            >
              <option value="">Tous</option>
              <option value="signalement">Signalement</option>
              <option value="verification">Vérification</option>
            </select>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <BaseButton variant="outline" size="sm" @click="clearFilters">
            Effacer les filtres
          </BaseButton>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <div v-else class="space-y-8">
        <!-- Available Reports Section -->
        <section>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900">
              Signalements disponibles ({{ filteredAvailableReports.length }})
            </h2>
          </div>
          
          <div v-if="filteredAvailableReports.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div class="text-4xl mb-2">📭</div>
            <p class="text-gray-600">
              Aucun signalement disponible pour investigation.
            </p>
          </div>

          <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Titre</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Statut</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Créé le</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr
                    v-for="report in filteredAvailableReports"
                    :key="report.id"
                    class="hover:bg-gray-50"
                  >
                    <td class="px-4 py-4">
                      <div class="font-medium text-gray-900">{{ report.title }}</div>
                      <div class="text-sm text-gray-500 truncate max-w-xs">{{ report.description }}</div>
                    </td>
                    <td class="px-4 py-4">
                      <span :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        report.type === 'signalement' ? 'bg-alerte-100 text-alerte-800' : 'bg-bleu-100 text-bleu-800'
                      ]">
                        {{ report.type === 'signalement' ? 'Signalement' : 'Vérification' }}
                      </span>
                    </td>
                    <td class="px-4 py-4">
                      <BaseBadge status="en_attente">En attente</BaseBadge>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-600">
                      {{ formatDateShort(report.created_at) }}
                    </td>
                    <td class="px-4 py-4">
                      <BaseButton variant="outline" size="sm" @click="viewReportDetails(report.id)">
                        Voir
                      </BaseButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- In Progress Section -->
        <section>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900">
              Investigations en cours ({{ filteredInProgressReports.length }})
            </h2>
          </div>
          
          <div v-if="filteredInProgressReports.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div class="text-4xl mb-2">🔍</div>
            <p class="text-gray-600">
              Vous n'avez aucune investigation en cours.
            </p>
          </div>

          <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="report in filteredInProgressReports"
              :key="report.id"
              class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              @click="viewReportDetails(report.id)"
            >
              <div class="flex items-center justify-between mb-2">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  report.type === 'signalement' ? 'bg-alerte-100 text-alerte-800' : 'bg-bleu-100 text-bleu-800'
                ]">
                  {{ report.type === 'signalement' ? 'Signalement' : 'Vérification' }}
                </span>
                <BaseBadge status="en_cours">En cours</BaseBadge>
              </div>
              <h3 class="font-semibold text-gray-900 mb-1 truncate">{{ report.title }}</h3>
              <p class="text-sm text-gray-600 line-clamp-2 mb-2">{{ report.description }}</p>
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>Assigné: {{ report.assigned_username || 'N/A' }}</span>
                <span>{{ formatDateShort(report.updated_at) }}</span>
              </div>
              <div class="mt-2 text-xs text-nuit-600 font-medium">
                Cliquez pour voir les détails →
              </div>
            </div>
          </div>
        </section>

        <!-- Completed Section -->
        <section>
          <h2 class="text-xl font-semibold text-gray-900 mb-4">
            Investigations terminées ({{ filteredCompletedReports.length }})
          </h2>
          
          <div v-if="filteredCompletedReports.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div class="text-4xl mb-2">✅</div>
            <p class="text-gray-600">
              Vous n'avez pas encore terminé d'investigations.
            </p>
          </div>

          <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Titre</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Statut</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date de création</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date de fin</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Preuves</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr
                    v-for="report in filteredCompletedReports"
                    :key="report.id"
                    class="hover:bg-gray-50"
                  >
                    <td class="px-4 py-4">
                      <div class="font-medium text-gray-900">{{ report.title }}</div>
                      <div class="text-sm text-gray-500 truncate max-w-xs">{{ report.description }}</div>
                    </td>
                    <td class="px-4 py-4">
                      <span :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        report.type === 'signalement' ? 'bg-alerte-100 text-alerte-800' : 'bg-bleu-100 text-bleu-800'
                      ]">
                        {{ report.type === 'signalement' ? 'Signalement' : 'Vérification' }}
                      </span>
                    </td>
                    <td class="px-4 py-4">
                      <BaseBadge status="termine">Terminé</BaseBadge>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-600">
                      {{ formatDateShort(report.created_at) }}
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-600">
                      {{ formatDate(report.updated_at) }}
                    </td>
                    <td class="px-4 py-4">
                      <div v-if="report.evidence" class="text-sm text-gray-600">
                        <span class="font-medium">Preuves:</span> {{ report.evidence.substring(0, 50) }}{{ report.evidence.length > 50 ? '...' : '' }}
                      </div>
                      <div v-if="report.verification_comments" class="text-sm text-gray-500 mt-1">
                        <span class="font-medium">Commentaires:</span> {{ report.verification_comments.substring(0, 50) }}{{ report.verification_comments.length > 50 ? '...' : '' }}
                      </div>
                      <span v-if="!report.evidence && !report.verification_comments" class="text-sm text-gray-400">
                        -
                      </span>
                    </td>
                    <td class="px-4 py-4">
                      <BaseButton variant="outline" size="sm" @click="viewReportDetails(report.id)">
                        Voir
                      </BaseButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
