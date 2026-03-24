<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDocumentsStore } from '../stores/documents'
import BaseButton from '../components/BaseButton.vue'
import BaseBadge from '../components/BaseBadge.vue'
import { supabase } from '../lib/supabase'

const route = useRoute()
const authStore = useAuthStore()
const documentsStore = useDocumentsStore()

interface Report {
  id: string
  title: string
  description: string
  type: 'signalement' | 'verification'
  status: 'en_attente' | 'en_cours' | 'termine'
  is_anonymous: boolean
  created_by: string
  assigned_to: string | null
  is_published: boolean
  created_at: string
  updated_at: string
  profiles?: {
    username: string
    email: string
  }
}

interface Investigation {
  id: string
  report_id: string
  title: string
  content: string
  findings: string
  is_public: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

interface Document {
  id: string
  report_id: string
  file_name: string
  file_url: string
  uploaded_by: string
  created_at: string
}

const report = ref<Report | null>(null)
const investigation = ref<Investigation | null>(null)
const documents = ref<Document[]>([])
const loading = ref(true)
const saving = ref(false)
const deletingDoc = ref<string | null>(null)
const editingContent = ref(false)
const contentForm = ref({
  title: '',
  content: '',
  findings: '',
})

const isJournalist = computed(() => {
  return authStore.user?.role === 'journalist' || authStore.user?.role === 'admin'
})

const canDeleteDocument = computed(() => {
  return (doc: Document) => {
    // User can delete if they uploaded it or are admin
    return doc.uploaded_by === authStore.user?.id || authStore.user?.role === 'admin'
  }
})

async function fetchData() {
  loading.value = true
  try {
    const reportId = route.params.id

    // Fetch report
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select(`
        *,
        profiles!created_by(
          username,
          email
        )
      `)
      .eq('id', reportId)
      .single()

    if (reportError) throw reportError
    report.value = reportData

    // Fetch investigation if exists
    const { data: investigationData } = await supabase
      .from('investigations')
      .select('*')
      .eq('report_id', reportId)
      .maybeSingle()

    investigation.value = investigationData

    if (investigationData) {
      contentForm.value.title = investigationData.title || ''
      contentForm.value.content = investigationData.content || ''
      contentForm.value.findings = investigationData.findings || ''
    }

    // Fetch documents for this report
    const { data: docsData } = await supabase
      .from('documents')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })

    documents.value = docsData || []
  } catch (error: any) {
    // Silent fail - investigation may not exist
  } finally {
    loading.value = false
  }
}

async function saveInvestigation() {
  if (!report.value) return

  saving.value = true
  try {
    if (investigation.value) {
      // Update existing investigation
      const { error } = await supabase
        .from('investigations')
        .update({
          title: contentForm.value.title,
          content: contentForm.value.content,
          findings: contentForm.value.findings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', investigation.value.id)

      if (error) throw error
    } else {
      // Create new investigation
      const { data, error } = await supabase
        .from('investigations')
        .insert({
          report_id: report.value.id,
          journalist_id: authStore.user?.id,
          title: contentForm.value.title,
          content: contentForm.value.content,
          findings: contentForm.value.findings,
          is_public: false,
        })
        .select()
        .single()

      if (error) throw error
      investigation.value = data
    }

    editingContent.value = false
  } catch (error: any) {
    alert('Erreur lors de l\'enregistrement: ' + error.message)
  } finally {
    saving.value = false
  }
}

async function togglePublish() {
  if (!investigation.value) return

  try {
    const isCurrentlyPublic = investigation.value.is_public
    const publishedAt = isCurrentlyPublic ? null : new Date().toISOString()

    const { error } = await supabase
      .from('investigations')
      .update({
        is_public: !isCurrentlyPublic,
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', investigation.value.id)

    if (error) throw error

    investigation.value.is_public = !isCurrentlyPublic
    investigation.value.published_at = publishedAt
  } catch (error: any) {
    alert('Erreur lors de la publication: ' + error.message)
  }
}

async function deleteDocument(docId: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

  deletingDoc.value = docId
  try {
    const success = await documentsStore.deleteDocument(docId)
    if (success) {
      documents.value = documents.value.filter(d => d.id !== docId)
    } else {
      alert('Erreur lors de la suppression du document')
    }
  } catch (error: any) {
    alert('Erreur: ' + error.message)
  } finally {
    deletingDoc.value = null
  }
}

function getDocumentUrl(fileUrl: string): string {
  return documentsStore.getDocumentUrl(fileUrl)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return '🖼️'
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext || '')) return '📝'
  return '📎'
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <template v-else-if="report">
        <!-- Back Button -->
        <div class="mb-6">
          <router-link
            :to="authStore.user?.role === 'journalist' || authStore.user?.role === 'admin' ? '/journalistes/dashboard' : '/users/dashboard'"
            class="text-nuit-600 hover:text-nuit-800 inline-flex items-center"
          >
            <span class="mr-2">←</span>
            Retour au tableau de bord
          </router-link>
        </div>

        <!-- Report Header -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 mb-2">
                {{ report.title }}
              </h1>
              <div class="flex flex-wrap gap-2 mb-4">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  report.type === 'signalement' ? 'bg-alerte-100 text-alerte-800' : 'bg-bleu-100 text-bleu-800'
                ]">
                  {{ report.type === 'signalement' ? 'Signalement' : 'Vérification' }}
                </span>
                <BaseBadge :status="report.status as 'en_attente' | 'en_cours' | 'termine'">
                  {{ report.status === 'en_attente' ? 'En attente' : report.status === 'en_cours' ? 'En cours' : 'Terminé' }}
                </BaseBadge>
                <span v-if="investigation?.is_public" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-vert-100 text-vert-800">
                  Publié
                </span>
              </div>
              <div class="text-sm text-gray-600">
                Soumis le {{ formatDate(report.created_at) }}
                <span v-if="!report.is_anonymous">
                  par {{ report.profiles?.username || 'Inconnu' }}
                </span>
                <span v-else class="italic">(Anonyme)</span>
              </div>
            </div>

            <!-- Actions for Journalists -->
            <div v-if="isJournalist" class="flex flex-col gap-2">
              <BaseButton
                variant="primary"
                size="sm"
                @click="editingContent = true"
              >
                {{ investigation ? 'Modifier' : 'Rédiger' }} l'enquête
              </BaseButton>
              <BaseButton
                v-if="investigation"
                :variant="investigation.is_public ? 'outline' : 'secondary'"
                size="sm"
                @click="togglePublish"
              >
                {{ investigation.is_public ? 'Dépublier' : 'Publier' }}
              </BaseButton>
            </div>
          </div>

          <!-- Description -->
          <div class="mt-6 pt-6 border-t border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            <p class="text-gray-700 whitespace-pre-wrap">{{ report.description }}</p>
          </div>
        </div>

        <!-- Documents Section -->
        <div v-if="documents.length > 0" class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Documents joints</h2>
          <div class="space-y-3">
            <div
              v-for="doc in documents"
              :key="doc.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ getFileIcon(doc.file_name) }}</span>
                <div>
                  <a
                    :href="getDocumentUrl(doc.file_url)"
                    target="_blank"
                    class="text-nuit-600 hover:text-nuit-800 font-medium"
                  >
                    {{ doc.file_name }}
                  </a>
                  <div class="text-xs text-gray-500">
                    Ajouté le {{ formatDate(doc.created_at) }}
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <a
                  :href="getDocumentUrl(doc.file_url)"
                  target="_blank"
                  class="text-bleu-600 hover:text-bleu-800 text-sm"
                >
                  Voir
                </a>
                <button
                  v-if="canDeleteDocument(doc)"
                  @click="deleteDocument(doc.id)"
                  :disabled="deletingDoc === doc.id"
                  class="text-alerte-600 hover:text-alerte-800 text-sm disabled:opacity-50"
                >
                  {{ deletingDoc === doc.id ? 'Suppression...' : 'Supprimer' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Investigation Section -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Enquête Journalistique</h2>

          <!-- View Mode -->
          <div v-if="!editingContent && investigation">
            <div class="mb-6">
              <h3 class="text-md font-medium text-gray-900 mb-2">Titre</h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-gray-700">{{ investigation.title }}</p>
              </div>
            </div>
            <div class="mb-6">
              <h3 class="text-md font-medium text-gray-900 mb-2">Contenu</h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-gray-700 whitespace-pre-wrap">{{ investigation.content }}</p>
              </div>
            </div>
            <div v-if="investigation.findings">
              <h3 class="text-md font-medium text-gray-900 mb-2">Conclusions</h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-gray-700 whitespace-pre-wrap">{{ investigation.findings }}</p>
              </div>
            </div>
            <div class="text-sm text-gray-500 mt-4">
              Dernière mise à jour : {{ formatDate(investigation.updated_at) }}
            </div>
          </div>

          <!-- No Investigation Yet -->
          <div v-else-if="!editingContent && isJournalist" class="text-center py-8">
            <div class="text-4xl mb-4">📝</div>
            <p class="text-gray-600 mb-4">
              Aucune enquête rédigée pour ce signalement.
            </p>
            <BaseButton variant="primary" @click="editingContent = true">
              Rédiger l'enquête
            </BaseButton>
          </div>

          <div v-else-if="!isJournalist && !investigation" class="text-center py-8">
            <div class="text-4xl mb-4">🔒</div>
            <p class="text-gray-600">
              L'enquête n'est pas encore disponible.
            </p>
          </div>

          <!-- Edit Mode -->
          <div v-if="editingContent" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Titre de l'enquête
              </label>
              <input
                v-model="contentForm.title"
                type="text"
                class="w-full rounded-lg border-gray-300 border px-4 py-2 focus:ring-nuit-500 focus:border-nuit-500"
                placeholder="Titre de l'enquête..."
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Contenu de l'enquête
              </label>
              <textarea
                v-model="contentForm.content"
                rows="10"
                class="w-full rounded-lg border-gray-300 border px-4 py-2 focus:ring-nuit-500 focus:border-nuit-500"
                placeholder="Décrivez votre enquête, les preuves collectées, les interviews..."
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Conclusions
              </label>
              <textarea
                v-model="contentForm.findings"
                rows="4"
                class="w-full rounded-lg border-gray-300 border px-4 py-2 focus:ring-nuit-500 focus:border-nuit-500"
                placeholder="Quelle est la conclusion de votre enquête ?"
              ></textarea>
            </div>
            <div class="flex gap-2">
              <BaseButton variant="primary" :loading="saving" @click="saveInvestigation">
                Enregistrer
              </BaseButton>
              <BaseButton variant="outline" @click="editingContent = false">
                Annuler
              </BaseButton>
            </div>
          </div>
        </div>
      </template>

      <!-- Not Found -->
      <div v-else class="text-center py-12">
        <div class="text-6xl mb-4">🔍</div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">
          Signalement non trouvé
        </h2>
        <p class="text-gray-600 mb-6">
          Le signalement demandé n'existe pas ou a été supprimé.
        </p>
        <router-link to="/">
          <BaseButton variant="primary">
            Retour à l'accueil
          </BaseButton>
        </router-link>
      </div>
    </div>
  </div>
</template>