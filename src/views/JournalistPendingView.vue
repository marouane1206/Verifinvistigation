<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useReportsStore } from '../stores/reports'
import BaseButton from '../components/BaseButton.vue'
import BaseBadge from '../components/BaseBadge.vue'

const authStore = useAuthStore()
const reportsStore = useReportsStore()

const selectedReports = ref<string[]>([])
const loading = ref(false)

const pendingReports = computed(() => 
  reportsStore.reports.filter(r => r.status === 'en_attente' && !r.assigned_to)
)

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function toggleSelect(reportId: string) {
  const index = selectedReports.value.indexOf(reportId)
  if (index === -1) {
    selectedReports.value.push(reportId)
  } else {
    selectedReports.value.splice(index, 1)
  }
}

function toggleSelectAll() {
  if (selectedReports.value.length === pendingReports.value.length) {
    selectedReports.value = []
  } else {
    selectedReports.value = pendingReports.value.map(r => r.id)
  }
}

async function startInvestigation() {
  if (selectedReports.value.length === 0) return
  
  loading.value = true
  try {
    await reportsStore.bulkAssignToInProgress(selectedReports.value, authStore.user!.id)
    selectedReports.value = []
    await reportsStore.fetchAllReports()
  } finally {
    loading.value = false
  }
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
          Signalements en attente
        </h1>
        <p class="text-gray-600 mt-1">
          Sélectionnez les signalements que vous souhaitez investiguer
        </p>
      </div>

      <!-- Actions Bar -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                :checked="selectedReports.length === pendingReports.length && pendingReports.length > 0"
                :indeterminate="selectedReports.length > 0 && selectedReports.length < pendingReports.length"
                @change="toggleSelectAll"
                class="w-5 h-5 text-nuit-600 rounded border-gray-300 focus:ring-nuit-500"
              />
              <span class="text-sm font-medium text-gray-700">
                Tout sélectionner ({{ selectedReports.length }}/{{ pendingReports.length }})
              </span>
            </label>
          </div>
          <BaseButton
            :disabled="selectedReports.length === 0 || loading"
            variant="primary"
            @click="startInvestigation"
          >
            {{ loading ? 'Traitement...' : `Commencer l'investigation (${selectedReports.length})` }}
          </BaseButton>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <!-- Reports Grid -->
      <div v-else-if="pendingReports.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="report in pendingReports"
          :key="report.id"
          class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          :class="{ 'ring-2 ring-nuit-600': selectedReports.includes(report.id) }"
          @click="toggleSelect(report.id)"
        >
          <div class="flex items-start gap-3">
            <input
              type="checkbox"
              :checked="selectedReports.includes(report.id)"
              @click.stop="toggleSelect(report.id)"
              class="mt-1 w-5 h-5 text-nuit-600 rounded border-gray-300 focus:ring-nuit-500"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-2">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  report.type === 'signalement' ? 'bg-alerte-100 text-alerte-800' : 'bg-bleu-100 text-bleu-800'
                ]">
                  {{ report.type === 'signalement' ? 'Signalement' : 'Vérification' }}
                </span>
                <BaseBadge status="en_attente">En attente</BaseBadge>
              </div>
              <h3 class="font-semibold text-gray-900 mb-1 truncate">{{ report.title }}</h3>
              <p class="text-sm text-gray-600 line-clamp-2 mb-2">{{ report.description }}</p>
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>{{ formatDate(report.created_at) }}</span>
                <span v-if="!report.is_anonymous">
                  Par {{ report.profiles?.username || 'Inconnu' }}
                </span>
                <span v-else class="italic">Anonyme</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12 bg-white rounded-xl border border-gray-200">
        <div class="text-6xl mb-4">📋</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          Aucun signalement en attente
        </h3>
        <p class="text-gray-600">
          Tous les signalements ont été assignés ou traités.
        </p>
      </div>
    </div>
  </div>
</template>
