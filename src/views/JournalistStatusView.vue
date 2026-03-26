<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useReportsStore } from '../stores/reports'
import { useJournalistStatusView } from '../composables/useJournalistStatusView'
import BaseButton from '../components/BaseButton.vue'
import BaseBadge from '../components/BaseBadge.vue'

// Configuration for this view
const props = defineProps<{
  reportType: 'signalement' | 'verification'
  statusKey: 'disponible' | 'en-cours' | 'clos'
}>()

const authStore = useAuthStore()
const reportsStore = useReportsStore()

// Map status keys to actual status values
const statusMap = {
  'disponible': 'en_attente',
  'en-cours': 'en_cours',
  'clos': 'termine'
} as const

const status = computed(() => statusMap[props.statusKey])

// Get title and description based on type and status
const title = computed(() => {
  const typeLabel = props.reportType === 'signalement' ? 'Signalement' : 'Vérification'
  const statusLabel = props.statusKey === 'disponible' ? 'Disponibles' : 
                      props.statusKey === 'en-cours' ? 'En cours' : 'Clos'
  return `${typeLabel} ${statusLabel}`
})

const description = computed(() => {
  if (props.statusKey === 'disponible') {
    return props.reportType === 'signalement' 
      ? 'Sélectionnez les signalements disponibles que vous souhaitez investiguer'
      : 'Sélectionnez les vérifications disponibles que vous souhaitez investiguer'
  } else if (props.statusKey === 'en-cours') {
    return props.reportType === 'signalement'
      ? 'Suivez vos signalements en cours d\'investigation'
      : 'Suivez vos vérifications en cours d\'investigation'
  } else {
    return props.reportType === 'signalement'
      ? 'Consultez vos signalements clos'
      : 'Consultez vos vérifications closes'
  }
})

// Use the composable
const {
  loading,
  filters,
  pagination,
  selectedReports,
  allSelected,
  filteredReports,
  paginatedReports,
  totalPages,
  selectedCount,
  clearFilters,
  toggleSort,
  toggleSelectAll,
  toggleReportSelection,
  goToPage,
  formatDate,
  viewReportDetails,
  exportToCSV,
  fetchReports
} = useJournalistStatusView(
  props.reportType,
  status.value
)

// Badge status for display
const badgeStatus = computed(() => status.value)

// Determine if this view allows bulk actions (only for disponible)
const allowBulkActions = computed(() => props.statusKey === 'disponible')

// Start investigation for selected reports (only for disponible)
async function startInvestigation() {
  if (selectedCount.value === 0) return
  
  const reportIds = Array.from(selectedReports.value)
  const userId = authStore.user?.id
  
  if (!userId) return
  
  await reportsStore.bulkAssignToInProgress(reportIds, userId)
  selectedReports.value.clear()
  allSelected.value = false
  await fetchReports()
}

onMounted(async () => {
  await fetchReports()
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
          {{ title }}
        </h1>
        <p class="text-gray-600 mt-1">
          {{ description }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <div v-else>
        <!-- Filters and Actions Bar -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <!-- Search -->
            <div class="flex-1 max-w-md">
              <input
                v-model="filters.search"
                type="text"
                placeholder="Rechercher..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-600 focus:border-transparent"
              />
            </div>

            <!-- Date Filters -->
            <div class="flex items-center gap-2">
              <input
                v-model="filters.dateFrom"
                type="date"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-600 focus:border-transparent"
              />
              <span class="text-gray-500">à</span>
              <input
                v-model="filters.dateTo"
                type="date"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-600 focus:border-transparent"
              />
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <BaseButton variant="outline" size="sm" @click="clearFilters">
                Effacer
              </BaseButton>
              <BaseButton variant="outline" size="sm" @click="exportToCSV">
                Exporter CSV
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Selection Header (for disponible only) -->
        <div v-if="allowBulkActions && filteredReports.length > 0" class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex items-center">
              <input
                type="checkbox"
                id="selectAll"
                v-model="allSelected"
                @change="toggleSelectAll"
                class="h-5 w-5 text-nuit-600 border-gray-300 rounded focus:ring-nuit-600"
              />
              <label for="selectAll" class="ml-2 text-sm font-medium text-gray-700">
                Tout sélectionner ({{ filteredReports.length }})
              </label>
            </div>
            <div v-if="selectedCount > 0" class="flex items-center text-sm text-gray-600">
              <span class="font-medium text-nuit-600">{{ selectedCount }}</span>
              <span class="ml-1">sélectionné(s)</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredReports.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div class="text-6xl mb-4">
            {{ props.statusKey === 'disponible' ? '📭' : props.statusKey === 'en-cours' ? '🔍' : '✅' }}
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Aucun {{ props.reportType }} {{ props.statusKey === 'disponible' ? 'disponible' : props.statusKey === 'en-cours' ? 'en cours' : 'clos' }}
          </h3>
          <p class="text-gray-600">
            {{ props.statusKey === 'disponible' 
              ? 'Revenez plus tard pour de nouveaux signalements.' 
              : props.statusKey === 'en-cours'
              ? 'Vous n\'avez pas d\'investigations en cours.'
              : 'Vous n\'avez pas encore terminé d\'investigations.'
            }}
          </p>
        </div>

        <!-- Reports Table -->
        <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th v-if="allowBulkActions" class="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      :checked="allSelected"
                      @change="toggleSelectAll"
                      class="h-4 w-4 text-nuit-600 border-gray-300 rounded focus:ring-nuit-600"
                    />
                  </th>
                  <th 
                    class="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                    @click="toggleSort('title')"
                  >
                    Titre
                    <span v-if="filters.sortBy === 'title'" class="ml-1">
                      {{ filters.sortOrder === 'asc' ? '↑' : '↓' }}
                    </span>
                  </th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Statut</th>
                  <th 
                    class="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                    @click="toggleSort('created_at')"
                  >
                    Créé le
                    <span v-if="filters.sortBy === 'created_at'" class="ml-1">
                      {{ filters.sortOrder === 'asc' ? '↑' : '↓' }}
                    </span>
                  </th>
                  <th 
                    v-if="props.statusKey === 'clos'"
                    class="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                    @click="toggleSort('updated_at')"
                  >
                    Clôturé le
                    <span v-if="filters.sortBy === 'updated_at'" class="ml-1">
                      {{ filters.sortOrder === 'asc' ? '↑' : '↓' }}
                    </span>
                  </th>
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="report in paginatedReports"
                  :key="report.id"
                  class="hover:bg-gray-50"
                  :class="{ 'bg-blue-50': selectedReports.has(report.id) }"
                >
                  <td v-if="allowBulkActions" class="px-4 py-4">
                    <input
                      type="checkbox"
                      :checked="selectedReports.has(report.id)"
                      @change="toggleReportSelection(report.id)"
                      class="h-4 w-4 text-nuit-600 border-gray-300 rounded focus:ring-nuit-600"
                    />
                  </td>
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
                    <BaseBadge :status="badgeStatus" />
                  </td>
                  <td class="px-4 py-4 text-sm text-gray-600">
                    {{ formatDate(report.created_at) }}
                  </td>
                  <td v-if="props.statusKey === 'clos'" class="px-4 py-4 text-sm text-gray-600">
                    {{ formatDate(report.updated_at) }}
                  </td>
                  <td class="px-4 py-4 text-right">
                    <BaseButton variant="outline" size="sm" @click="viewReportDetails(report.id)">
                      Voir
                    </BaseButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div class="text-sm text-gray-600">
              Page {{ pagination.page }} sur {{ totalPages }}
              ({{ pagination.total }} résultat(s)])
            </div>
            <div class="flex items-center gap-2">
              <BaseButton 
                variant="outline" 
                size="sm" 
                :disabled="pagination.page === 1"
                @click="goToPage(pagination.page - 1)"
              >
                Précédent
              </BaseButton>
              <BaseButton 
                variant="outline" 
                size="sm" 
                :disabled="pagination.page === totalPages"
                @click="goToPage(pagination.page + 1)"
              >
                Suivant
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Bulk Action Button (for disponible only) -->
        <div v-if="allowBulkActions && selectedCount > 0" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="text-sm text-gray-600">
              <span class="font-medium text-nuit-600">{{ selectedCount }}</span>
              {{ props.reportType }}(s) sélectionné(s)
            </div>
            <BaseButton variant="primary" size="lg" @click="startInvestigation">
              Commencer l'investigation
            </BaseButton>
          </div>
        </div>
        
        <!-- Spacer for fixed button -->
        <div v-if="allowBulkActions && selectedCount > 0" class="h-24"></div>
      </div>
    </div>
  </div>
</template>
