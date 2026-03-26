<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useReportsStore, type Report } from '../stores/reports'
import BaseBadge from '../components/BaseBadge.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const reportsStore = useReportsStore()

const loading = ref(false)
const error = ref<string | null>(null)

// Available in-progress reports for the journalist
const inProgressReports = ref<Report[]>([])

// Currently selected report
const currentReport = ref<Report | null>(null)

// Get report ID from query params
const reportId = computed(() => route.query.report as string | undefined)

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function selectReport(report: Report) {
  currentReport.value = report
}

onMounted(async () => {
  loading.value = true
  try {
    await reportsStore.fetchAllReports()
    
    // Filter in-progress reports assigned to current journalist
    inProgressReports.value = reportsStore.reports.filter(
      r => r.status === 'en_cours' && r.assigned_to === authStore.user?.id
    )
    
    // If report ID in query, select it
    if (reportId.value) {
      const report = inProgressReports.value.find(r => r.id === reportId.value)
      if (report) {
        currentReport.value = report
      }
    }
  } catch (e) {
    error.value = 'Erreur lors du chargement des signalements'
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/journaliste')
}
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
          Signalements à vérifier
        </h1>
        <p class="text-gray-600 mt-1">
          Consultez les signalements qui vous ont été assignés
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <!-- Main Content -->
      <div v-else class="grid gap-6 lg:grid-cols-3">
        <!-- Left Column: Report Selection -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl border border-gray-200 p-4">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Signalements en cours
            </h2>
            
            <div v-if="inProgressReports.length === 0" class="text-center py-8">
              <div class="text-4xl mb-2">📋</div>
              <p class="text-gray-600 text-sm">
                Aucun signalement en cours.
              </p>
              <router-link to="/journaliste/pending">
                <button class="mt-4 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Voir les signalements en attente
                </button>
              </router-link>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="report in inProgressReports"
                :key="report.id"
                class="p-3 rounded-lg border cursor-pointer transition-all"
                :class="[
                  currentReport?.id === report.id
                    ? 'border-nuit-600 bg-nuit-50 ring-1 ring-nuit-600'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                ]"
                @click="selectReport(report)"
              >
                <div class="flex items-center justify-between mb-1">
                  <span :class="[
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    report.type === 'signalement' ? 'bg-alerte-100 text-alerte-800' : 'bg-bleu-100 text-bleu-800'
                  ]">
                    {{ report.type === 'signalement' ? 'Signalement' : 'Vérification' }}
                  </span>
                  <BaseBadge status="en_cours">En cours</BaseBadge>
                </div>
                <h3 class="font-medium text-gray-900 text-sm truncate">{{ report.title }}</h3>
                <p class="text-xs text-gray-500 mt-1">
                  {{ formatDate(report.created_at) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Report Details (Read-Only) -->
        <div class="lg:col-span-2">
          <div v-if="!currentReport" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div class="text-6xl mb-4">🔍</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              Sélectionnez un signalement
            </h3>
            <p class="text-gray-600">
              Choisissez un signalement dans la liste de gauche pour voir les détails.
            </p>
          </div>

          <div v-else class="bg-white rounded-xl border border-gray-200 p-6">
            <!-- Selected Report Summary -->
            <div class="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 class="font-semibold text-gray-900">{{ currentReport.title }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ currentReport.description }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span :class="[
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  currentReport.type === 'signalement' ? 'bg-alerte-100 text-alerte-800' : 'bg-bleu-100 text-bleu-800'
                ]">
                  {{ currentReport.type === 'signalement' ? 'Signalement' : 'Vérification' }}
                </span>
                <BaseBadge status="en_cours">En cours</BaseBadge>
              </div>
            </div>

            <!-- Report Details -->
            <div class="space-y-6">
              <!-- Date -->
              <div>
                <h4 class="text-sm font-medium text-gray-500 mb-1">Date du signalement</h4>
                <p class="text-gray-900">{{ formatDate(currentReport.created_at) }}</p>
              </div>

              <!-- Submitted Evidence (Read-Only) -->
              <div v-if="currentReport.evidence">
                <h4 class="text-sm font-medium text-gray-500 mb-2">Preuces soumises</h4>
                <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p class="text-gray-900 whitespace-pre-wrap">{{ currentReport.evidence }}</p>
                </div>
              </div>

              <!-- Verification Comments (Read-Only) -->
              <div v-if="currentReport.verification_comments">
                <h4 class="text-sm font-medium text-gray-500 mb-2">Commentaires de vérification</h4>
                <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p class="text-gray-900 whitespace-pre-wrap">{{ currentReport.verification_comments }}</p>
                </div>
              </div>

              <!-- No Verification Data Yet -->
              <div v-if="!currentReport.evidence && !currentReport.verification_comments" class="text-center py-8">
                <div class="text-4xl mb-2">⏳</div>
                <p class="text-gray-600">
                  Aucune vérification n'a encore été soumise pour ce signalement.
                </p>
              </div>
            </div>

            <!-- Back Button -->
            <div class="mt-6 pt-6 border-t border-gray-200">
              <button
                @click="goBack"
                class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Retour au tableau de bord
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
