<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '../stores/admin'
import type { Investigation } from '../stores/investigations'
import BaseButton from '../components/BaseButton.vue'

const adminStore = useAdminStore()

const activeFilter = ref<string>('all')
const searchQuery = ref('')
const showDeleteModal = ref(false)
const investigationToDelete = ref<Investigation | null>(null)
const expandedInvestigation = ref<string | null>(null)

const filters = [
  { value: 'all', label: 'Toutes' },
  { value: 'public', label: 'Publiées' },
  { value: 'private', label: 'Brouillon' }
]

const filteredInvestigations = computed(() => {
  // Always exclude signalements - show only verification investigations
  let investigations = adminStore.investigations.filter(i => i.report_type === 'verification')
  
  if (activeFilter.value === 'public') {
    investigations = investigations.filter(i => i.is_public)
  } else if (activeFilter.value === 'private') {
    investigations = investigations.filter(i => !i.is_public)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    investigations = investigations.filter(i => 
      i.title.toLowerCase().includes(query) ||
      i.content.toLowerCase().includes(query) ||
      i.journalist_username?.toLowerCase().includes(query)
    )
  }
  
  return investigations
})

const getPublishBadgeClass = (isPublic: boolean) => {
  return isPublic 
    ? 'bg-vert-100 text-vert-700' 
    : 'bg-gray-100 text-gray-700'
}

const getPublishLabel = (isPublic: boolean) => {
  return isPublic ? 'Publiée' : 'Brouillon'
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const togglePublish = async (investigation: Investigation) => {
  await adminStore.toggleInvestigationPublish(investigation.id, !investigation.is_public)
}

const toggleExpand = (id: string) => {
  expandedInvestigation.value = expandedInvestigation.value === id ? null : id
}

const confirmDelete = (investigation: Investigation) => {
  investigationToDelete.value = investigation
  showDeleteModal.value = true
}

const deleteInvestigation = async () => {
  if (!investigationToDelete.value) return
  
  await adminStore.deleteInvestigation(investigationToDelete.value.id)
  showDeleteModal.value = false
  investigationToDelete.value = null
}

onMounted(() => {
  adminStore.fetchAllInvestigations()
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
            Gestion des Vérifications
          </h1>
          <p class="text-gray-600 mt-1">
            Gérer les résultats d'investigation
          </p>
        </div>
        <div class="mt-4 md:mt-0">
          <router-link to="/admin">
            <BaseButton variant="outline">
              ← Retour au tableau de bord
            </BaseButton>
          </router-link>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 border border-gray-200">
          <div class="text-sm text-gray-500">Total</div>
          <div class="text-2xl font-bold text-gray-900">{{ adminStore.investigations.filter(i => i.report_type === 'verification').length }}</div>
        </div>
        <div class="bg-vert-50 rounded-lg p-4 border border-vert-200">
          <div class="text-sm text-vert-700">Publiées</div>
          <div class="text-2xl font-bold text-vert-700">{{ adminStore.investigations.filter(i => i.is_public && i.report_type === 'verification').length }}</div>
        </div>
        <div class="bg-gray-100 rounded-lg p-4 border border-gray-200">
          <div class="text-sm text-gray-700">Brouillons</div>
          <div class="text-2xl font-bold text-gray-700">{{ adminStore.investigations.filter(i => !i.is_public && i.report_type === 'verification').length }}</div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher par titre, contenu ou auteur..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
            />
          </div>
          
          <!-- Filter Buttons -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="filter in filters"
              :key="filter.value"
              @click="activeFilter = filter.value"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeFilter === filter.value
                  ? 'bg-nuit-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="adminStore.loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <!-- Error Message -->
      <div v-else-if="adminStore.error" class="bg-alerte-50 border border-alerte-200 rounded-lg p-4 mb-6">
        <p class="text-alerte-700">{{ adminStore.error }}</p>
      </div>

      <!-- Investigations List -->
      <div v-else class="space-y-4">
        <div
          v-for="investigation in filteredInvestigations"
          :key="investigation.id"
          class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <!-- Investigation Header -->
          <div 
            class="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            @click="toggleExpand(investigation.id)"
          >
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-semibold text-gray-900">
                    {{ investigation.title }}
                  </h3>
                  <span :class="['px-3 py-1 rounded-full text-xs font-medium', getPublishBadgeClass(investigation.is_public)]">
                    {{ getPublishLabel(investigation.is_public) }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>Par: {{ investigation.journalist_username || 'Inconnu' }}</span>
                  <span>Créé le: {{ formatDate(investigation.created_at) }}</span>
                  <span v-if="investigation.published_at">
                    Publié le: {{ formatDate(investigation.published_at) }}
                  </span>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <button
                  @click.stop="togglePublish(investigation)"
                  :class="[
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    investigation.is_public
                      ? 'bg-jaune-100 text-jaune-700 hover:bg-jaune-200'
                      : 'bg-vert-100 text-vert-700 hover:bg-vert-200'
                  ]"
                >
                  {{ investigation.is_public ? '📤 Dépublier' : '📢 Publier' }}
                </button>
                <button
                  @click.stop="$router.push(`/investigation/${investigation.report_id}`)"
                  class="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  👁️ Voir
                </button>
                <button
                  @click.stop="confirmDelete(investigation)"
                  class="px-4 py-2 text-sm font-medium rounded-lg bg-alerte-100 text-alerte-700 hover:bg-alerte-200"
                >
                  🗑️
                </button>
                <span class="text-gray-400">
                  {{ expandedInvestigation === investigation.id ? '▲' : '▼' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Expanded Content -->
          <div v-if="expandedInvestigation === investigation.id" class="border-t border-gray-200 bg-gray-50 p-6">
            <div class="grid gap-6">
              <!-- Content -->
              <div>
                <h4 class="text-sm font-medium text-gray-500 mb-2">Contenu</h4>
                <div class="bg-white rounded-lg p-4 border border-gray-200 text-gray-700 whitespace-pre-wrap">
                  {{ investigation.content }}
                </div>
              </div>
              
              <!-- Findings -->
              <div v-if="investigation.findings">
                <h4 class="text-sm font-medium text-gray-500 mb-2">Conclusions</h4>
                <div class="bg-white rounded-lg p-4 border border-gray-200 text-gray-700 whitespace-pre-wrap">
                  {{ investigation.findings }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredInvestigations.length === 0" class="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div class="text-6xl mb-4">🔍</div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Aucune enquête trouvée
          </h3>
          <p class="text-gray-600">
            {{ searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Aucune enquête n\'a encore été créée' }}
          </p>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Confirmer la suppression
          </h3>
          <p class="text-gray-600 mb-6">
            Êtes-vous sûr de vouloir supprimer l'enquête <strong>{{ investigationToDelete?.title }}</strong> ?
            Cette action est irréversible.
          </p>
          <div class="flex justify-end gap-3">
            <BaseButton variant="outline" @click="showDeleteModal = false">
              Annuler
            </BaseButton>
            <BaseButton variant="primary" class="bg-alerte-600 hover:bg-alerte-700" @click="deleteInvestigation">
              Supprimer
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
