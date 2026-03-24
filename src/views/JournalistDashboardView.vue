<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useReportsStore } from '../stores/reports'
import BaseButton from '../components/BaseButton.vue'
import BaseBadge from '../components/BaseBadge.vue'

const router = useRouter()
const authStore = useAuthStore()
const reportsStore = useReportsStore()

const loading = ref(false)

// Get reports assigned to current journalist
const myInProgressReports = computed(() => 
  reportsStore.reports.filter(r => r.status === 'en_cours' && r.assigned_to === authStore.user?.id)
)

const myVerifiedReports = computed(() => 
  reportsStore.reports.filter(r => r.status === 'termine' && r.assigned_to === authStore.user?.id)
)

const stats = computed(() => ({
  total: myInProgressReports.value.length + myVerifiedReports.value.length,
  inProgress: myInProgressReports.value.length,
  verified: myVerifiedReports.value.length
}))

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function goToVerify(reportId: string) {
  router.push(`/journaliste/verify?report=${reportId}`)
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
          Gérez vos signalements en cours et vérifiés
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="text-3xl font-bold text-nuit-600">{{ stats.total }}</div>
          <div class="text-sm text-gray-600">Total</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="text-3xl font-bold text-bleu-500">{{ stats.inProgress }}</div>
          <div class="text-sm text-gray-600">En cours</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4 col-span-2 md:col-span-1">
          <div class="text-3xl font-bold text-vert-500">{{ stats.verified }}</div>
          <div class="text-sm text-gray-600">Vérifiés</div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <div v-else class="space-y-8">
        <!-- In Progress Section -->
        <section>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900">
              Signalements en cours
            </h2>
            <router-link to="/journaliste/pending">
              <BaseButton variant="outline" size="sm">
                Voir les signalements en attente
              </BaseButton>
            </router-link>
          </div>
          
          <div v-if="myInProgressReports.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div class="text-4xl mb-2">📋</div>
            <p class="text-gray-600">
              Vous n'avez aucun signalement en cours.
            </p>
            <router-link to="/journaliste/pending">
              <BaseButton variant="primary" class="mt-4">
                Sélectionner des signalements
              </BaseButton>
            </router-link>
          </div>

          <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="report in myInProgressReports"
              :key="report.id"
              class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              @click="goToVerify(report.id)"
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
                <span>{{ formatDate(report.created_at) }}</span>
                <span class="text-nuit-600 font-medium">Cliquez pour vérifier →</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Verified Section -->
        <section>
          <h2 class="text-xl font-semibold text-gray-900 mb-4">
            Signalements vérifiés
          </h2>
          
          <div v-if="myVerifiedReports.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div class="text-4xl mb-2">✅</div>
            <p class="text-gray-600">
              Vous n'avez pas encore vérifié de signalements.
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
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr
                    v-for="report in myVerifiedReports"
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
                      <BaseBadge status="termine">Vérifié</BaseBadge>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-600">
                      {{ formatDate(report.updated_at) }}
                    </td>
                    <td class="px-4 py-4">
                      <router-link :to="`/investigation/${report.id}`">
                        <BaseButton variant="outline" size="sm">
                          Voir
                        </BaseButton>
                      </router-link>
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
