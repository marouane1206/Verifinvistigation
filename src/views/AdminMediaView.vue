<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore, type MediaFile } from '../stores/admin'
import BaseButton from '../components/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const showDeleteModal = ref(false)
const fileToDelete = ref<MediaFile | null>(null)
const selectedFile = ref<MediaFile | null>(null)
const previewUrl = ref<string | null>(null)

// Determine context based on route path
const mediaContext = computed(() => {
  const path = route.path
  if (path.includes('/journalists/media')) {
    return 'journalist'
  }
  return 'user'
})

// Fetch media files based on current context
const fetchMedia = () => {
  const filterRole = mediaContext.value === 'journalist' ? 'journalist' : 'user'
  adminStore.fetchMediaFiles(filterRole)
}

// Watch route path changes to re-fetch media when switching between user roles
watch(() => route.path, () => {
  fetchMedia()
})

// Page title based on context
const pageTitle = computed(() => {
  return mediaContext.value === 'journalist' 
    ? 'Médiathèque Journalistes' 
    : 'Médiathèque Utilisateurs'
})

// Description based on context
const pageDescription = computed(() => {
  return mediaContext.value === 'journalist'
    ? 'Gérer les fichiers uploadés par les journalistes'
    : 'Gérer les fichiers uploadés par les utilisateurs (non-admins et non-journalistes)'
})

const filteredFiles = computed(() => {
  if (!searchQuery.value) return adminStore.mediaFiles
  
  const query = searchQuery.value.toLowerCase()
  return adminStore.mediaFiles.filter(f => 
    f.name.toLowerCase().includes(query) ||
    f.report_title?.toLowerCase().includes(query) ||
    f.uploader_username?.toLowerCase().includes(query)
  )
})

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) return '🖼️'
  if (contentType.startsWith('video/')) return '🎬'
  if (contentType.startsWith('audio/')) return '🎵'
  if (contentType.includes('pdf')) return '📄'
  if (contentType.includes('word') || contentType.includes('document')) return '📝'
  if (contentType.includes('sheet') || contentType.includes('excel')) return '📊'
  if (contentType.includes('zip') || contentType.includes('archive')) return '📦'
  return '📁'
}

const getFileExtension = (filename: string) => {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()?.toUpperCase() : 'FILE'
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

const getPostType = (type: string | null | undefined): string => {
  if (type === 'signalement') return 'Signalement'
  if (type === 'verification') return 'Vérification'
  return '-'
}

const getPostTypeClass = (type: string | null | undefined): string => {
  if (type === 'signalement') return 'bg-alerte-100 text-alerte-800'
  if (type === 'verification') return 'bg-bleu-100 text-bleu-800'
  return 'bg-gray-100 text-gray-800'
}

// Navigation functions
const navigateToDocument = (file: MediaFile) => {
  if (file.report_id) {
    // Navigate to document management for the related report
    router.push({ name: 'admin-reports', query: { documentId: file.id } })
  }
}

const navigateToUser = (file: MediaFile) => {
  if (file.uploaded_by) {
    router.push({ name: 'admin-users', query: { userId: file.uploaded_by } })
  }
}

const navigateToReport = (file: MediaFile) => {
  if (file.report_id) {
    router.push({ name: 'admin-reports', query: { reportId: file.report_id } })
  }
}

const openPreview = async (file: MediaFile) => {
  selectedFile.value = file
  
  // For images, try to get a preview URL
  if (file.content_type.startsWith('image/') && file.public_url) {
    previewUrl.value = file.public_url
  } else {
    previewUrl.value = null
  }
}

const closePreview = () => {
  selectedFile.value = null
  previewUrl.value = null
}

const confirmDelete = (file: MediaFile) => {
  fileToDelete.value = file
  showDeleteModal.value = true
}

const deleteFile = async () => {
  if (!fileToDelete.value) return
  
  await adminStore.deleteMediaFile(fileToDelete.value.id)
  showDeleteModal.value = false
  fileToDelete.value = null
}

const copyUrl = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    alert('URL copiée dans le presse-papiers !')
  } catch (e) {
    console.error('Failed to copy URL:', e)
  }
}

onMounted(() => {
  fetchMedia()
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
            {{ pageTitle }}
          </h1>
          <p class="text-gray-600 mt-1">
            {{ pageDescription }}
          </p>
        </div>
        <div class="mt-4 md:mt-0 flex gap-3">
          <router-link to="/admin">
            <BaseButton variant="outline">
              ← Retour au tableau de bord
            </BaseButton>
          </router-link>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 border border-gray-200">
          <div class="text-sm text-gray-500">Total fichiers</div>
          <div class="text-2xl font-bold text-gray-900">{{ adminStore.mediaFiles.length }}</div>
        </div>
        <div class="bg-white rounded-lg p-4 border border-gray-200">
          <div class="text-sm text-gray-500">Images</div>
          <div class="text-2xl font-bold text-gray-900">
            {{ adminStore.mediaFiles.filter(f => f.content_type.startsWith('image/')).length }}
          </div>
        </div>
        <div class="bg-white rounded-lg p-4 border border-gray-200">
          <div class="text-sm text-gray-500">Documents</div>
          <div class="text-2xl font-bold text-gray-900">
            {{ adminStore.mediaFiles.filter(f => !f.content_type.startsWith('image/')).length }}
          </div>
        </div>
      </div>

      <!-- Filters and View Toggle -->
      <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher par nom de fichier..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nuit-500 focus:border-nuit-500"
            />
          </div>
          
          <!-- View Toggle -->
          <div class="flex gap-2">
            <button
              @click="viewMode = 'grid'"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'grid'
                  ? 'bg-nuit-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              ▦ Grille
            </button>
            <button
              @click="viewMode = 'list'"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-nuit-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              ☰ Liste
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

      <!-- Grid View -->
      <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          class="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
          @click="openPreview(file)"
        >
          <!-- Thumbnail -->
          <div class="aspect-square bg-gray-100 flex items-center justify-center relative">
            <img
              v-if="file.content_type.startsWith('image/') && file.public_url"
              :src="file.public_url"
              :alt="file.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="text-4xl">
              {{ getFileIcon(file.content_type) }}
            </div>
            
            <!-- Hover overlay -->
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <span class="text-white opacity-0 group-hover:opacity-100 font-medium">
                Voir
              </span>
            </div>
          </div>
          
          <!-- File info -->
          <div class="p-3">
            <p class="text-sm font-medium text-gray-900 truncate" :title="file.name">
              {{ file.name }}
            </p>
            <div class="flex items-center gap-2 mt-1">
              <span 
                :class="[
                  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                  getPostTypeClass(file.report_type)
                ]"
              >
                {{ getPostType(file.report_type) }}
              </span>
              <span class="text-xs text-gray-500">
                {{ getFileExtension(file.name) }}
              </span>
            </div>
            <p v-if="file.uploader_username" class="text-xs text-gray-500 mt-1">
              {{ file.uploader_username }}
            </p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredFiles.length === 0" class="col-span-full text-center py-16 bg-white rounded-xl border border-gray-200">
          <div class="text-6xl mb-4">📁</div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Aucun fichier trouvé
          </h3>
          <p class="text-gray-600">
            {{ searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Aucun fichier n\'a encore été uploadé' }}
          </p>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fichier
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Titre du signalement
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date d'upload
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="file in filteredFiles" :key="file.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center cursor-pointer" @click="navigateToDocument(file)">
                  <!-- Thumbnail for images -->
                  <div v-if="file.content_type.startsWith('image/') && file.public_url" class="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                    <img :src="file.public_url" :alt="file.name" class="w-full h-full object-cover" />
                  </div>
                  <!-- Icon for non-image files -->
                  <div v-else class="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
                    {{ getFileIcon(file.content_type) }}
                  </div>
                  <div class="ml-3">
                    <div class="text-sm font-medium text-gray-900 truncate max-w-50" :title="file.name">{{ file.name }}</div>
                    <div class="text-xs text-gray-500">{{ getFileExtension(file.name) }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getPostTypeClass(file.report_type)
                  ]"
                >
                  {{ getPostType(file.report_type) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <button 
                  v-if="file.uploader_username && file.uploaded_by"
                  @click="navigateToUser(file)"
                  class="text-nuit-600 hover:text-nuit-800 font-medium text-sm"
                >
                  {{ file.uploader_username }}
                </button>
                <span v-else class="text-gray-500">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <button 
                  v-if="file.report_id && file.report_title"
                  @click="navigateToReport(file)"
                  class="text-nuit-600 hover:text-nuit-800 font-medium text-sm truncate max-w-50 block"
                  :title="file.report_title"
                >
                  {{ file.report_title }}
                </button>
                <span v-else class="text-gray-500">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ formatDate(file.created_at) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end gap-2">
                  <button
                    @click="openPreview(file)"
                    class="text-nuit-600 hover:text-nuit-800"
                    title="Voir"
                  >
                    👁️
                  </button>
                  <button
                    v-if="file.public_url"
                    @click.stop="copyUrl(file.public_url)"
                    class="text-bleu-600 hover:text-bleu-800"
                    title="Copier l'URL"
                  >
                    🔗
                  </button>
                  <button
                    @click.stop="confirmDelete(file)"
                    class="text-alerte-600 hover:text-alerte-800"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div v-if="filteredFiles.length === 0" class="text-center py-16">
          <div class="text-6xl mb-4">📁</div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Aucun fichier trouvé
          </h3>
          <p class="text-gray-600">
            {{ searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Aucun fichier n\'a encore été uploadé' }}
          </p>
        </div>
      </div>

      <!-- Preview Modal -->
      <div v-if="selectedFile" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" @click="closePreview">
        <div class="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto" @click.stop>
          <!-- Preview Image -->
          <div v-if="previewUrl" class="bg-gray-900 flex items-center justify-center p-4">
            <img :src="previewUrl" :alt="selectedFile.name" class="max-w-full max-h-[60vh] object-contain" />
          </div>
          
          <!-- File Info -->
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">{{ selectedFile.name }}</h3>
                <p class="text-sm text-gray-500">{{ selectedFile.content_type }}</p>
              </div>
              <button @click="closePreview" class="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p class="text-sm text-gray-500">Type</p>
                <p class="text-sm font-medium text-gray-900">{{ selectedFile.content_type }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Date d'upload</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(selectedFile.created_at) }}</p>
              </div>
            </div>
            
            <div class="flex gap-3">
              <BaseButton 
                v-if="selectedFile.public_url" 
                variant="outline" 
                @click="copyUrl(selectedFile.public_url || '')"
              >
                🔗 Copier l'URL
              </BaseButton>
              <BaseButton 
                variant="primary" 
                class="bg-alerte-600 hover:bg-alerte-700"
                @click="confirmDelete(selectedFile); closePreview()"
              >
                🗑️ Supprimer
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Confirmer la suppression
          </h3>
          <p class="text-gray-600 mb-6">
            Êtes-vous sûr de vouloir supprimer le fichier <strong>{{ fileToDelete?.name }}</strong> ?
            Cette action est irréversible.
          </p>
          <div class="flex justify-end gap-3">
            <BaseButton variant="outline" @click="showDeleteModal = false">
              Annuler
            </BaseButton>
            <BaseButton variant="primary" class="bg-alerte-600 hover:bg-alerte-700" @click="deleteFile">
              Supprimer
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
