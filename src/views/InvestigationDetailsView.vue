<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseButton from '../components/BaseButton.vue'
import BaseBadge from '../components/BaseBadge.vue'
import { supabase } from '../lib/supabase'

const route = useRoute()
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
  content: string
  conclusion: string
  created_at: string
  updated_at: string
}

const report = ref<Report | null>(null)
const investigation = ref<Investigation | null>(null)
const loading = ref(true)
const saving = ref(false)
const editingContent = ref(false)
const contentForm = ref({
  content: '',
  conclusion: '',
})

const isJournalist = computed(() => {
  return authStore.user?.role === 'journalist' || authStore.user?.role === 'admin'
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
        profiles (
          username,
          email
        )
      `)
      .eq('id', reportId)
      .single()

    if (reportError) throw reportError
    report.value = reportData

    // Fetch investigation if exists
    const { data: investigationData, error: investigationError } = await supabase
      .from('investigations')
      .select('*')
      .eq('report_id', reportId)
      .single()

    if (investigationError && investigationError.code !== 'PGRST116') {
      throw investigationError
    }
    investigation.value = investigationData

    if (investigationData) {
      contentForm.value.content = investigationData.content
      contentForm.value.conclusion = investigationData.conclusion
    }
  } catch (error) {
    console.error('Erreur:', error)
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
          content: contentForm.value.content,
          conclusion: contentForm.value.conclusion,
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
          content: contentForm.value.content,
          conclusion: contentForm.value.conclusion,
        })
        .select()
        .single()

      if (error) throw error
      investigation.value = data
    }

    editingContent.value = false
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    saving.value = false
  }
}

async function togglePublish() {
  if (!report.value) return

  try {
    const { error } = await supabase
      .from('reports')
      .update({
        is_published: !report.value.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.value.id)

    if (error) throw error

    report.value.is_published = !report.value.is_published
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
    hour: '2-digit',
    minute: '2-digit',
  })
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
            :to="authStore.user?.role === 'journalist' || authStore.user?.role === 'admin' ? '/journaliste' : '/dashboard'"
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
                <span v-if="report.is_published" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-vert-100 text-vert-800">
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
                :variant="report.is_published ? 'outline' : 'secondary'"
                size="sm"
                @click="togglePublish"
              >
                {{ report.is_published ? 'Dépublier' : 'Publier' }}
              </BaseButton>
            </div>
          </div>

          <!-- Description -->
          <div class="mt-6 pt-6 border-t border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            <p class="text-gray-700 whitespace-pre-wrap">{{ report.description }}</p>
          </div>
        </div>

        <!-- Investigation Section -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Enquête Journalistique</h2>

          <!-- View Mode -->
          <div v-if="!editingContent && investigation">
            <div class="mb-6">
              <h3 class="text-md font-medium text-gray-900 mb-2">Contenu</h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-gray-700 whitespace-pre-wrap">{{ investigation.content }}</p>
              </div>
            </div>
            <div v-if="investigation.conclusion">
              <h3 class="text-md font-medium text-gray-900 mb-2">Conclusion</h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-gray-700 whitespace-pre-wrap">{{ investigation.conclusion }}</p>
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
                Conclusion
              </label>
              <textarea
                v-model="contentForm.conclusion"
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