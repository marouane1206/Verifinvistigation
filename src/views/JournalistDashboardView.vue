<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import ReportCard from '../components/ReportCard.vue'
import BaseButton from '../components/BaseButton.vue'
import BaseBadge from '../components/BaseBadge.vue'
import { supabase } from '../lib/supabase'

const authStore = useAuthStore()

interface Report {
  id: string
  title: string
  description: string
  type: 'signalement' | 'verification'
  status: 'en_attente' | 'en_cours' | 'termine'
  is_anonymous: boolean
  user_id: string
  assigned_to: string | null
  created_at: string
  updated_at: string
  profiles?: {
    username: string
    email: string
  }
}

const reports = ref<Report[]>([])
const loading = ref(true)
const activeFilter = ref<string>('all')
const selectedReport = ref<Report | null>(null)

const filters = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
]

const stats = computed(() => {
  const total = reports.value.length
  const pending = reports.value.filter(r => r.status === 'en_attente').length
  const inProgress = reports.value.filter(r => r.status === 'en_cours').length
  const completed = reports.value.filter(r => r.status === 'termine').length
  return { total, pending, inProgress, completed }
})

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
      .select(`
        *,
        profiles (
          username,
          email
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    reports.value = data || []
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    loading.value = false
  }
}

async function assignToMe(report: Report) {
  try {
    const { error } = await supabase
      .from('reports')
      .update({ 
        assigned_to: authStore.user?.id,
        status: 'en_cours'
      })
      .eq('id', report.id)

    if (error) throw error
    
    // Update local state
    report.assigned_to = authStore.user?.id || null
    report.status = 'en_cours'
  } catch (error) {
    console.error('Erreur:', error)
  }
}

async function updateStatus(report: Report, newStatus: string) {
  try {
    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', report.id)

    if (error) throw error
    
    // Update local state
    report.status = newStatus as 'en_attente' | 'en_cours' | 'termine'
  } catch (error) {
    console.error('Erreur:', error)
  }
}

function getStatusBadgeVariant(status: string): 'warning' | 'info' | 'success' {
  switch (status) {
    case 'en_attente': return 'warning'
    case 'en_cours': return 'info'
    case 'termine': return 'success'
    default: return 'warning'
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

onMounted(() => {
  fetchReports()
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
          Gérez les signalements et vérifications
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="text-3xl font-bold text-nuit-600">{{ stats.total }}</div>
          <div class="text-sm text-gray-600">Total</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="text-3xl font-bold text-jaune-500">{{ stats.pending }}</div>
          <div class="text-sm text-gray-600">En attente</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="text-3xl font-bold text-bleu-500">{{ stats.inProgress }}</div>
          <div class="text-sm text-gray-600">En cours</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="text-3xl font-bold text-vert-500">{{ stats.completed }}</div>
          <div class="text-sm text-gray-600">Terminés</div>
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

      <!-- Reports Table -->
      <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Titre</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Statut</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Auteur</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="report in filteredReports"
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
                  <BaseBadge :status="report.status">
                    {{ filters.find(f => f.value === report.status)?.label }}
                  </BaseBadge>
                </td>
                <td class="px-4 py-4 text-sm text-gray-600">
                  {{ formatDate(report.created_at) }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-600">
                  <template v-if="report.is_anonymous">
                    <span class="italic">Anonyme</span>
                  </template>
                  <template v-else>
                    {{ report.profiles?.username || 'Inconnu' }}
                  </template>
                </td>
                <td class="px-4 py-4">
                  <div class="flex flex-col gap-2">
                    <router-link :to="`/investigation/${report.id}`">
                      <BaseButton variant="outline" size="sm">
                        Voir
                      </BaseButton>
                    </router-link>
                    <BaseButton
                      v-if="!report.assigned_to && report.status === 'en_attente'"
                      variant="primary"
                      size="sm"
                      @click="assignToMe(report)"
                    >
                      Assigner
                    </BaseButton>
                    <div v-if="report.assigned_to === authStore.user?.id" class="flex gap-1">
                      <BaseButton
                        v-if="report.status !== 'en_cours'"
                        variant="primary"
                        size="sm"
                        @click="updateStatus(report, 'en_cours')"
                      >
                        En cours
                      </BaseButton>
                      <BaseButton
                        v-if="report.status !== 'termine'"
                        variant="secondary"
                        size="sm"
                        @click="updateStatus(report, 'termine')"
                      >
                        Terminer
                      </BaseButton>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredReports.length === 0" class="text-center py-12">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Aucun signalement
          </h3>
          <p class="text-gray-600">
            Aucun signalement ne correspond au filtre sélectionné.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>