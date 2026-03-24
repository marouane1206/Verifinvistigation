<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useReportsStore } from '../stores/reports'
import ReportCard from '../components/ReportCard.vue'
import BaseButton from '../components/BaseButton.vue'

const authStore = useAuthStore()
const reportsStore = useReportsStore()

const activeFilter = ref<string>('all')
const activeTypeFilter = ref<string>('all')
const activeModuleFilter = ref<{ signalement: string, verification: string }>({
  signalement: 'all',
  verification: 'all'
})

const filters = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
]

const typeFilters = [
  { value: 'all', label: 'Tous les types' },
  { value: 'signalement', label: 'Signalements' },
  { value: 'verification', label: 'Vérifications' },
]

// Filter reports by type
const signalementReports = computed(() => {
  return reportsStore.reports.filter(r => r.type === 'signalement' || !r.type)
})

const verificationReports = computed(() => {
  return reportsStore.reports.filter(r => r.type === 'verification')
})

// Get status counts for each module
const signalementStats = computed(() => ({
  total: signalementReports.value.length,
  pending: signalementReports.value.filter(r => r.status === 'en_attente').length,
  inProgress: signalementReports.value.filter(r => r.status === 'en_cours').length,
  completed: signalementReports.value.filter(r => r.status === 'termine').length,
}))

const verificationStats = computed(() => ({
  total: verificationReports.value.length,
  pending: verificationReports.value.filter(r => r.status === 'en_attente').length,
  inProgress: verificationReports.value.filter(r => r.status === 'en_cours').length,
  completed: verificationReports.value.filter(r => r.status === 'termine').length,
}))

// Filter reports by module status
const filteredSignalementReports = computed(() => {
  if (activeModuleFilter.value.signalement === 'all') {
    return signalementReports.value
  }
  return signalementReports.value.filter(r => r.status === activeModuleFilter.value.signalement)
})

const filteredVerificationReports = computed(() => {
  if (activeModuleFilter.value.verification === 'all') {
    return verificationReports.value
  }
  return verificationReports.value.filter(r => r.status === activeModuleFilter.value.verification)
})

// Combined filtered reports for activity section (status + type filter)
const filteredReports = computed(() => {
  let reports = reportsStore.reports
  
  // Filter by status
  if (activeFilter.value !== 'all') {
    reports = reports.filter(r => r.status === activeFilter.value)
  }
  
  // Filter by type
  if (activeTypeFilter.value !== 'all') {
    reports = reports.filter(r => {
      const reportType = r.type || 'signalement'
      return reportType === activeTypeFilter.value
    })
  }
  
  return reports
})

onMounted(() => {
  if (authStore.user?.id) {
    reportsStore.fetchUserReports(authStore.user.id)
  }
})

// Status configuration for display
const statusConfig = {
  en_attente: {
    label: 'En attente',
    bgColor: 'bg-jaune-100',
    textColor: 'text-jaune-800',
    borderColor: 'border-jaune-300',
    hoverBg: 'hover:bg-jaune-200',
    icon: '⏳'
  },
  en_cours: {
    label: 'En cours',
    bgColor: 'bg-bleu-100',
    textColor: 'text-bleu-800',
    borderColor: 'border-bleu-300',
    hoverBg: 'hover:bg-bleu-200',
    icon: '🔄'
  },
  termine: {
    label: 'Terminé',
    bgColor: 'bg-vert-100',
    textColor: 'text-vert-800',
    borderColor: 'border-vert-300',
    hoverBg: 'hover:bg-vert-200',
    icon: '✅'
  }
}

// Handle module status filter click
function setModuleFilter(type: 'signalement' | 'verification', status: string) {
  activeModuleFilter.value[type] = status
}
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
            Mon Tableau de Bord
          </h1>
          <p class="text-gray-600 mt-1">
            Bienvenue, {{ authStore.user?.username || 'utilisateur' }} !
          </p>
        </div>
      </div>

      <!-- Module Cards: Signaler & Verifier -->
      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <!-- Signaler Module -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="bg-linear-to-r from-nuit-600 to-nuit-700 px-6 py-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span class="text-2xl">🚨</span>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-white">Signaler</h2>
                <p class="text-nuit-200 text-sm">Signaler des contenus suspects</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <!-- Clickable Status Stats -->
            <div class="grid grid-cols-4 gap-2 mb-4">
              <!-- All -->
              <button
                @click="setModuleFilter('signalement', 'all')"
                :class="[
                  'text-center p-2 rounded-lg transition-all border-2',
                  activeModuleFilter.signalement === 'all'
                    ? 'border-nuit-600 bg-nuit-50'
                    : 'border-gray-100 bg-gray-50 hover:border-nuit-300'
                ]"
              >
                <div class="text-xl font-bold" :class="activeModuleFilter.signalement === 'all' ? 'text-nuit-600' : 'text-gray-600'">
                  {{ signalementStats.total }}
                </div>
                <div class="text-xs text-gray-500">Tous</div>
              </button>
              <!-- En attente -->
              <button
                @click="setModuleFilter('signalement', 'en_attente')"
                :class="[
                  'text-center p-2 rounded-lg transition-all border-2',
                  activeModuleFilter.signalement === 'en_attente'
                    ? 'border-jaune-500 bg-jaune-50'
                    : 'border-gray-100 bg-gray-50 hover:border-jaune-300'
                ]"
              >
                <div class="text-xl font-bold" :class="activeModuleFilter.signalement === 'en_attente' ? 'text-jaune-600' : 'text-gray-600'">
                  {{ signalementStats.pending }}
                </div>
                <div class="text-xs text-gray-500">En attente</div>
              </button>
              <!-- En cours -->
              <button
                @click="setModuleFilter('signalement', 'en_cours')"
                :class="[
                  'text-center p-2 rounded-lg transition-all border-2',
                  activeModuleFilter.signalement === 'en_cours'
                    ? 'border-bleu-500 bg-bleu-50'
                    : 'border-gray-100 bg-gray-50 hover:border-bleu-300'
                ]"
              >
                <div class="text-xl font-bold" :class="activeModuleFilter.signalement === 'en_cours' ? 'text-bleu-600' : 'text-gray-600'">
                  {{ signalementStats.inProgress }}
                </div>
                <div class="text-xs text-gray-500">En cours</div>
              </button>
              <!-- Terminé -->
              <button
                @click="setModuleFilter('signalement', 'termine')"
                :class="[
                  'text-center p-2 rounded-lg transition-all border-2',
                  activeModuleFilter.signalement === 'termine'
                    ? 'border-vert-500 bg-vert-50'
                    : 'border-gray-100 bg-gray-50 hover:border-vert-300'
                ]"
              >
                <div class="text-xl font-bold" :class="activeModuleFilter.signalement === 'termine' ? 'text-vert-600' : 'text-gray-600'">
                  {{ signalementStats.completed }}
                </div>
                <div class="text-xs text-gray-500">Terminé</div>
              </button>
            </div>
            
            <!-- Filtered Results Preview -->
            <div v-if="filteredSignalementReports.length > 0" class="mb-4 space-y-2 max-h-40 overflow-y-auto">
              <div
                v-for="report in filteredSignalementReports.slice(0, 3)"
                :key="report.id"
                class="text-sm p-2 bg-gray-50 rounded flex items-center justify-between cursor-pointer hover:bg-gray-100"
                @click="$router.push(`/investigation/${report.id}`)"
              >
                <span class="truncate flex-1">{{ report.title }}</span>
                <span :class="[
                  'text-xs px-2 py-0.5 rounded ml-2',
                  statusConfig[report.status].bgColor,
                  statusConfig[report.status].textColor
                ]">
                  {{ statusConfig[report.status].label }}
                </span>
              </div>
              <div v-if="filteredSignalementReports.length > 3" class="text-xs text-gray-500 text-center">
                + {{ filteredSignalementReports.length - 3 }} autres
              </div>
            </div>
            <div v-else class="mb-4 text-sm text-gray-500 text-center py-2">
              Aucun signalement
            </div>
            
            <!-- Action Button -->
            <router-link to="/signaler" class="block">
              <BaseButton variant="primary" size="lg" class="w-full">
                <span class="mr-2">➕</span>
                Nouveau signalement
              </BaseButton>
            </router-link>
          </div>
        </div>

        <!-- Verifier Module -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="bg-linear-to-r from-ardoise-600 to-ardoise-700 px-6 py-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span class="text-2xl">🔍</span>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-white">Verifier</h2>
                <p class="text-ardoise-200 text-sm">Vérifier des informations</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <!-- Clickable Status Stats -->
            <div class="grid grid-cols-4 gap-2 mb-4">
              <!-- All -->
              <button
                @click="setModuleFilter('verification', 'all')"
                :class="[
                  'text-center p-2 rounded-lg transition-all border-2',
                  activeModuleFilter.verification === 'all'
                    ? 'border-ardoise-600 bg-ardoise-50'
                    : 'border-gray-100 bg-gray-50 hover:border-ardoise-300'
                ]"
              >
                <div class="text-xl font-bold" :class="activeModuleFilter.verification === 'all' ? 'text-ardoise-600' : 'text-gray-600'">
                  {{ verificationStats.total }}
                </div>
                <div class="text-xs text-gray-500">Tous</div>
              </button>
              <!-- En attente -->
              <button
                @click="setModuleFilter('verification', 'en_attente')"
                :class="[
                  'text-center p-2 rounded-lg transition-all border-2',
                  activeModuleFilter.verification === 'en_attente'
                    ? 'border-jaune-500 bg-jaune-50'
                    : 'border-gray-100 bg-gray-50 hover:border-jaune-300'
                ]"
              >
                <div class="text-xl font-bold" :class="activeModuleFilter.verification === 'en_attente' ? 'text-jaune-600' : 'text-gray-600'">
                  {{ verificationStats.pending }}
                </div>
                <div class="text-xs text-gray-500">En attente</div>
              </button>
              <!-- En cours -->
              <button
                @click="setModuleFilter('verification', 'en_cours')"
                :class="[
                  'text-center p-2 rounded-lg transition-all border-2',
                  activeModuleFilter.verification === 'en_cours'
                    ? 'border-bleu-500 bg-bleu-50'
                    : 'border-gray-100 bg-gray-50 hover:border-bleu-300'
                ]"
              >
                <div class="text-xl font-bold" :class="activeModuleFilter.verification === 'en_cours' ? 'text-bleu-600' : 'text-gray-600'">
                  {{ verificationStats.inProgress }}
                </div>
                <div class="text-xs text-gray-500">En cours</div>
              </button>
              <!-- Terminé -->
              <button
                @click="setModuleFilter('verification', 'termine')"
                :class="[
                  'text-center p-2 rounded-lg transition-all border-2',
                  activeModuleFilter.verification === 'termine'
                    ? 'border-vert-500 bg-vert-50'
                    : 'border-gray-100 bg-gray-50 hover:border-vert-300'
                ]"
              >
                <div class="text-xl font-bold" :class="activeModuleFilter.verification === 'termine' ? 'text-vert-600' : 'text-gray-600'">
                  {{ verificationStats.completed }}
                </div>
                <div class="text-xs text-gray-500">Terminé</div>
              </button>
            </div>
            
            <!-- Filtered Results Preview -->
            <div v-if="filteredVerificationReports.length > 0" class="mb-4 space-y-2 max-h-40 overflow-y-auto">
              <div
                v-for="report in filteredVerificationReports.slice(0, 3)"
                :key="report.id"
                class="text-sm p-2 bg-gray-50 rounded flex items-center justify-between cursor-pointer hover:bg-gray-100"
                @click="$router.push(`/investigation/${report.id}`)"
              >
                <span class="truncate flex-1">{{ report.title }}</span>
                <span :class="[
                  'text-xs px-2 py-0.5 rounded ml-2',
                  statusConfig[report.status].bgColor,
                  statusConfig[report.status].textColor
                ]">
                  {{ statusConfig[report.status].label }}
                </span>
              </div>
              <div v-if="filteredVerificationReports.length > 3" class="text-xs text-gray-500 text-center">
                + {{ filteredVerificationReports.length - 3 }} autres
              </div>
            </div>
            <div v-else class="mb-4 text-sm text-gray-500 text-center py-2">
              Aucune vérification
            </div>
            
            <!-- Action Button -->
            <router-link to="/verifier" class="block">
              <BaseButton variant="secondary" size="lg" class="w-full">
                <span class="mr-2">🔎</span>
                Nouvelle vérification
              </BaseButton>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="border-t border-gray-200 my-8"></div>

      <!-- Recent Activity Section -->
      <div class="mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 class="text-xl font-semibold text-gray-900 mb-2 sm:mb-0">
            Activité récente
          </h3>
          
          <!-- Type Filter -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="typeFilter in typeFilters"
              :key="typeFilter.value"
              @click="activeTypeFilter = typeFilter.value"
              :class="[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeTypeFilter === typeFilter.value
                  ? 'bg-nuit-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              ]"
            >
              {{ typeFilter.label }}
            </button>
          </div>
        </div>
        
        <!-- Status Filters -->
        <div class="flex flex-wrap gap-2">
          <button
            v-for="filter in filters"
            :key="filter.value"
            @click="activeFilter = filter.value"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeFilter === filter.value
                ? 'bg-nuit-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            ]"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="reportsStore.loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <!-- Reports List -->
      <div v-else-if="filteredReports.length > 0" class="grid gap-4">
        <ReportCard
          v-for="report in filteredReports"
          :key="report.id"
          :report="{
            id: report.id,
            title: report.title,
            description: report.description,
            status: report.status as 'en_attente' | 'en_cours' | 'termine',
            created_at: report.created_at,
            type: report.type as 'signalement' | 'verification' | undefined,
            created_by: report.created_by
          }"
          @click="$router.push(`/investigation/${report.id}`)"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 bg-white rounded-xl border border-gray-200">
        <div class="text-6xl mb-4">📋</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          Aucun signalement
        </h3>
        <p class="text-gray-600 mb-6 max-w-md mx-auto">
          {{ (activeFilter !== 'all' || activeTypeFilter !== 'all')
            ? `Aucun ${activeTypeFilter === 'all' ? 'signalement' : (activeTypeFilter === 'signalement' ? 'signalement' : 'vérification')} avec le statut "${filters.find(f => f.value === activeFilter)?.label}".`
            : 'Vous n\'avez pas encore fait de signalement. Commencez dès maintenant !' }}
        </p>
        <div class="flex justify-center gap-4">
          <router-link to="/signaler">
            <BaseButton variant="primary">
              Faire un signalement
            </BaseButton>
          </router-link>
          <router-link to="/verifier">
            <BaseButton variant="secondary">
              Vérifier une information
            </BaseButton>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
