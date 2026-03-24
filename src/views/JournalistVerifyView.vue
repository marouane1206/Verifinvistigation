<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useReportsStore, type Report } from '../stores/reports'
import { useDocumentsStore } from '../stores/documents'
import BaseButton from '../components/BaseButton.vue'
import BaseTextarea from '../components/BaseTextarea.vue'
import BaseBadge from '../components/BaseBadge.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const reportsStore = useReportsStore()
const documentsStore = useDocumentsStore()

const loading = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

// Form fields
const evidence = ref('')
const comments = ref('')
const selectedDocumentIds = ref<string[]>([])

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
  // Reset form
  evidence.value = report.evidence || ''
  comments.value = report.verification_comments || ''
  selectedDocumentIds.value = report.verification_documents || []
}

async function handleSubmit() {
  if (!currentReport.value) return
  if (!evidence.value.trim()) {
    error.value = 'Veuillez fournir des preuves pour la vérification'
    return
  }

  error.value = null
  submitting.value = true

  try {
    await reportsStore.verifyReport(currentReport.value.id, {
      evidence: evidence.value,
      comments: comments.value || undefined,
      documentIds: selectedDocumentIds.value
    })
    
    success.value = true
    setTimeout(() => {
      router.push('/journaliste')
    }, 2000)
  } catch (e) {
    error.value = 'Erreur lors de la vérification du signalement'
  } finally {
    submitting.value = false
  }
}

function toggleDocument(documentId: string) {
  const index = selectedDocumentIds.value.indexOf(documentId)
  if (index === -1) {
    selectedDocumentIds.value.push(documentId)
  } else {
    selectedDocumentIds.value.splice(index, 1)
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      reportsStore.fetchAllReports(),
      documentsStore.fetchAllDocuments()
    ])
    
    // Filter in-progress reports assigned to current journalist
    inProgressReports.value = reportsStore.reports.filter(
      r => r.status === 'en_cours' && r.assigned_to === authStore.user?.id
    )
    
    // If report ID in query, select it
    if (reportId.value) {
      const report = inProgressReports.value.find(r => r.id === reportId.value)
      if (report) {
        currentReport.value = report
        evidence.value = report.evidence || ''
        comments.value = report.verification_comments || ''
        selectedDocumentIds.value = report.verification_documents || []
      }
    }
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
          Vérifier les signalements
        </h1>
        <p class="text-gray-600 mt-1">
          Sélectionnez un signalement et fournissez vos preuves de vérification
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
                <BaseButton variant="outline" size="sm" class="mt-4">
                  Voir les signalements en attente
                </BaseButton>
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

        <!-- Right Column: Verification Form -->
        <div class="lg:col-span-2">
          <div v-if="!currentReport" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div class="text-6xl mb-4">🔍</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              Sélectionnez un signalement
            </h3>
            <p class="text-gray-600">
              Choisissez un signalement dans la liste de gauche pour commencer la vérification.
            </p>
          </div>

          <div v-else class="bg-white rounded-xl border border-gray-200 p-6">
            <!-- Success Message -->
            <div v-if="success" class="text-center py-8">
              <div class="text-6xl mb-4">✅</div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">
                Signalement vérifié !
              </h3>
              <p class="text-gray-600">
                Redirection vers le tableau de bord...
              </p>
            </div>

            <!-- Form -->
            <form v-else @submit.prevent="handleSubmit">
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

              <!-- Error Message -->
              <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm text-red-600">{{ error }}</p>
              </div>

              <!-- Evidence Field -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Preuves <span class="text-red-500">*</span>
                </label>
                <BaseTextarea
                  v-model="evidence"
                  placeholder="Décrivez les preuves qui soutiennent votre vérification..."
                  :rows="6"
                  required
                />
                <p class="text-xs text-gray-500 mt-1">
                  Fournissez des détails précis sur les éléments qui vous ont permis de vérifier le signalement.
                </p>
              </div>

              <!-- Comments Field -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Commentaires supplémentaires
                </label>
                <BaseTextarea
                  v-model="comments"
                  placeholder="Ajoutez des commentaires supplémentaires si nécessaire..."
                  :rows="4"
                />
              </div>

              <!-- Document Upload Section -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Documents de support
                </label>
                <div v-if="documentsStore.documents.length === 0" class="p-4 bg-gray-50 rounded-lg text-center">
                  <p class="text-sm text-gray-500">
                   Aucun document disponible. Vous pouvez télécharger des documents dans la section Documents.
                  </p>
                </div>
                <div v-else class="grid gap-2 sm:grid-cols-2">
                  <div
                    v-for="doc in documentsStore.documents"
                    :key="doc.id"
                    class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer"
                    :class="[
                      selectedDocumentIds.includes(doc.id)
                        ? 'border-nuit-600 bg-nuit-50'
                        : 'border-gray-200 hover:border-gray-300'
                    ]"
                    @click="toggleDocument(doc.id)"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedDocumentIds.includes(doc.id)"
                      @click.stop="toggleDocument(doc.id)"
                      class="w-4 h-4 text-nuit-600 rounded border-gray-300"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ doc.file_name }}</p>
                      <p class="text-xs text-gray-500">{{ doc.file_url.split('.').pop() }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="flex gap-3">
                <BaseButton
                  type="submit"
                  variant="primary"
                  :disabled="submitting || !evidence.trim()"
                >
                  {{ submitting ? 'Traitement...' : 'Soumettre la vérification' }}
                </BaseButton>
                <BaseButton
                  type="button"
                  variant="outline"
                  @click="router.push('/journaliste')"
                >
                  Annuler
                </BaseButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
