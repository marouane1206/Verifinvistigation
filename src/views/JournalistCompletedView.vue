<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useReportsStore } from '../stores/reports'
import BaseButton from '../components/BaseButton.vue'
import BaseBadge from '../components/BaseBadge.vue'

const router = useRouter()
const reportsStore = useReportsStore()
const authStore = useAuthStore()

const loading = computed(() => reportsStore.loading)

// Show completed reports (status = 'termine') assigned to current journalist
const completedReports = computed(() => 
  reportsStore.reports.filter(r => r.status === 'termine' && r.assigned_to === authStore.user?.id)
)

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function viewReport(reportId: string) {
  router.push(`/investigation/${reportId}`)
}

onMounted(async () => {
  await reportsStore.fetchAllReports()
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
          Investigations terminées
        </h1>
        <p class="text-gray-600 mt-1">
          Liste des investigations que vous avez terminées.
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <!-- Reports Table -->
      <div v-else-if="completedReports.length > 0" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titre
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de création
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de fin
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auteur
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr 
                v-for="report in completedReports" 
                :key="report.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    report.type === 'signalement' ? 'bg-alerte-100 text-alerte-800' : 'bg-bleu-100 text-bleu-800'
                  ]">
                    {{ report.type === 'signalement' ? 'Signalement' : 'Vérification' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900 max-w-xs truncate">
                    {{ report.title }}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-600 max-w-md truncate">
                    {{ report.description }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <BaseBadge status="termine">Terminé</BaseBadge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">
                    {{ formatDate(report.created_at) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">
                    {{ report.updated_at ? formatDate(report.updated_at) : '-' }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">
                    <span v-if="!report.is_anonymous">
                      {{ report.profiles?.username || 'Inconnu' }}
                    </span>
                    <span v-else class="italic">Anonyme</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    @click="viewReport(report.id)"
                  >
                    Voir
                  </BaseButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12 bg-white rounded-xl border border-gray-200">
        <div class="text-6xl mb-4">✅</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          Aucune investigation terminée
        </h3>
        <p class="text-gray-600">
          Vous n'avez pas encore terminé d'investigations.
        </p>
      </div>
    </div>
  </div>
</template>