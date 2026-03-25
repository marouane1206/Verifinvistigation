<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useReportsStore } from '../stores/reports'
import ReportCard from '../components/ReportCard.vue'
import BaseButton from '../components/BaseButton.vue'

const authStore = useAuthStore()
const reportsStore = useReportsStore()

const activeFilter = ref<string>('all')
const searchQuery = ref('')

const filters = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
]

// Get signalement reports for current user
const signalementReports = computed(() => {
  return reportsStore.reports.filter(r => r.type === 'signalement' || !r.type)
})

// Filter by status
const filteredReports = computed(() => {
  let reports = signalementReports.value
  
  if (activeFilter.value !== 'all') {
    reports = reports.filter(r => r.status === activeFilter.value)
  }
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    reports = reports.filter(r => 
      r.title?.toLowerCase().includes(query) || 
      r.description?.toLowerCase().includes(query)
    )
  }
  
  return reports
})

// Stats
const stats = computed(() => ({
  total: signalementReports.value.length,
  pending: signalementReports.value.filter(r => r.status === 'en_attente').length,
  inProgress: signalementReports.value.filter(r => r.status === 'en_cours').length,
  completed: signalementReports.value.filter(r => r.status === 'termine').length,
}))

onMounted(() => {
  if (authStore.user?.id) {
    reportsStore.fetchUserReports(authStore.user.id)
  }
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
            Mes Signalements
          </h1>
          <p class="text-gray-600 mt-1">
            Gérez vos signalements de contenus suspects
          </p>
        </div>
        <router-link to="/signaler" class="mt-4 md:mt-0">
          <BaseButton variant="primary">
            <span class="mr-2">➕</span>
            Nouveau signalement
          </BaseButton>
        </router-link>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <!-- Total -->
        <button
          @click="activeFilter = 'all'"
          :class="[
            'p-4 rounded-xl border-2 transition-all text-left',
            activeFilter === 'all'
              ? 'border-nuit-600 bg-nuit-50'
              : 'border-gray-200 bg-white hover:border-nuit-300'
          ]"
        >
          <div class="text-2xl font-bold" :class="activeFilter === 'all' ? 'text-nuit-600' : 'text-gray-600'">
            {{ stats.total }}
          </div>
          <div class="text-sm text-gray-500">Total</div>
        </button>
        
        <!-- En attente -->
        <button
          @click="activeFilter = 'en_attente'"
          :class="[
            'p-4 rounded-xl border-2 transition-all text-left',
            activeFilter === 'en_attente'
              ? 'border-jaune-500 bg-jaune-50'
              : 'border-gray-200 bg-white hover:border-jaune-300'
          ]"
        >
          <div class="text-2xl font-bold" :class="activeFilter === 'en_attente' ? 'text-jaune-600' : 'text-gray-600'">
            {{ stats.pending }}
          </div>
          <div class="text-sm text-gray-500">En attente</div>
        </button>
        
        <!-- En cours -->
        <button
          @click="activeFilter = 'en_cours'"
          :class="[
            'p-4 rounded-xl border-2 transition-all text-left',
            activeFilter === 'en_cours'
              ? 'border-bleu-500 bg-bleu-50'
              : 'border-gray-200 bg-white hover:border-bleu-300'
          ]"
        >
          <div class="text-2xl font-bold" :class="activeFilter === 'en_cours' ? 'text-bleu-600' : 'text-gray-600'">
            {{ stats.inProgress }}
          </div>
          <div class="text-sm text-gray-500">En cours</div>
        </button>
        
        <!-- Terminé -->
        <button
          @click="activeFilter = 'termine'"
          :class="[
            'p-4 rounded-xl border-2 transition-all text-left',
            activeFilter === 'termine'
              ? 'border-vert-500 bg-vert-50'
              : 'border-gray-200 bg-white hover:border-vert-300'
          ]"
        >
          <div class="text-2xl font-bold" :class="activeFilter === 'termine' ? 'text-vert-600' : 'text-gray-600'">
            {{ stats.completed }}
          </div>
          <div class="text-sm text-gray-500">Terminé</div>
        </button>
      </div>

      <!-- Search and Filters -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher dans vos signalements..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
          />
        </div>
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
            type: 'signalement',
            created_by: report.created_by
          }"
          @click="$router.push(`/investigation/${report.id}`)"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 bg-white rounded-xl border border-gray-200">
        <div class="text-6xl mb-4">🚨</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          Aucun signalement
        </h3>
        <p class="text-gray-600 mb-6 max-w-md mx-auto">
          {{ searchQuery || activeFilter !== 'all'
            ? 'Aucun signalement ne correspond à vos critères de recherche.'
            : 'Vous n\'avez pas encore fait de signalement. Commencez dès maintenant !' }}
        </p>
        <div class="flex justify-center gap-4">
          <router-link to="/signaler">
            <BaseButton variant="primary">
              Faire un signalement
            </BaseButton>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>