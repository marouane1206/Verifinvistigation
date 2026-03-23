<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import ReportCard from '../components/ReportCard.vue'
import BaseButton from '../components/BaseButton.vue'
import { supabase } from '../lib/supabase'

const authStore = useAuthStore()

interface Report {
  id: string
  title: string
  description: string
  type: 'signalement' | 'verification'
  status: 'en_attente' | 'en_cours' | 'termine'
  is_anonymous: boolean
  created_at: string
  updated_at: string
}

const reports = ref<Report[]>([])
const loading = ref(true)
const activeFilter = ref<string>('all')

const filters = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
]

const filteredReports = computed(() => {
  if (activeFilter.value === 'all') {
    return reports.value
  }
  return reports.value.filter(r => r.status === activeFilter.value)
})

async function fetchReports() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', authStore.user?.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    reports.value = data || []
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReports()
})
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
        <div class="mt-4 md:mt-0">
          <router-link to="/signaler">
            <BaseButton variant="primary">
              Nouveau signalement
            </BaseButton>
          </router-link>
        </div>
      </div>

      <!-- Filters -->
      <div class="mb-6">
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
      <div v-if="loading" class="flex justify-center py-12">
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
            status: report.status,
            created_at: report.created_at
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
          {{ activeFilter === 'all' 
            ? 'Vous n\'avez pas encore fait de signalement. Commencez dès maintenant !' 
            : `Aucun signalement avec le statut "${filters.find(f => f.value === activeFilter)?.label}".` }}
        </p>
        <router-link to="/signaler">
          <BaseButton variant="primary">
            Faire un signalement
          </BaseButton>
        </router-link>
      </div>
    </div>
  </div>
</template>