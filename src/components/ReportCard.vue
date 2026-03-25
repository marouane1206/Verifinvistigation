<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useReportsStore } from '../stores/reports'
import BaseBadge from './BaseBadge.vue'

interface Report {
  id: string
  title: string
  description: string
  status: 'en_attente' | 'en_cours' | 'termine'
  created_at: string
  type?: 'signalement' | 'verification'
  created_by?: string
}

interface Props {
  report: Report
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const authStore = useAuthStore()
const reportsStore = useReportsStore()

const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

const formattedDate = computed(() => {
  const date = new Date(props.report.created_at)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const truncatedDescription = computed(() => {
  const maxLength = 120
  if (props.report.description.length <= maxLength) {
    return props.report.description
  }
  return props.report.description.substring(0, maxLength) + '...'
})

// Determine the post type
const postType = computed(() => {
  return props.report.type || 'signalement'
})

const typeConfig = {
  signalement: {
    label: 'Signaler',
    bgColor: 'bg-nuit-100',
    textColor: 'text-nuit-800',
    borderColor: 'border-nuit-300',
    icon: '🚨'
  },
  verification: {
    label: 'Verifier',
    bgColor: 'bg-ardoise-100',
    textColor: 'text-ardoise-800',
    borderColor: 'border-ardoise-300',
    icon: '🔍'
  }
}

const typeInfo = computed(() => typeConfig[postType.value])

// Check if user can delete (owner or admin)
const canDelete = computed(() => {
  if (!authStore.user) return false
  const isOwner = props.report.created_by === authStore.user.id
  const isAdmin = authStore.isAdmin
  return isOwner || isAdmin
})

async function handleDelete() {
  if (!authStore.user) return
  
  deleting.value = true
  deleteError.value = null
  
  const success = await reportsStore.deleteReport(
    props.report.id,
    authStore.user.id,
    authStore.isAdmin
  )
  
  deleting.value = false
  
  if (success) {
    showDeleteConfirm.value = false
  } else {
    deleteError.value = reportsStore.error || 'Erreur lors de la suppression'
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deleteError.value = null
}
</script>

<template>
  <div
    class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100 cursor-pointer"
    :class="{ 'cursor-default': showDeleteConfirm }"
    @click="$emit('click')"
  >
    <div class="p-5">
      <div class="flex items-start justify-between mb-3">
        <h3 class="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
          {{ report.title }}
        </h3>
        <div class="flex items-center gap-2 ml-2 shrink-0">
          <!-- Type Badge -->
          <span
            :class="[
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
              typeInfo.bgColor,
              typeInfo.textColor,
              typeInfo.borderColor
            ]"
          >
            <span class="mr-1">{{ typeInfo.icon }}</span>
            {{ typeInfo.label }}
          </span>
          <!-- Status Badge -->
          <BaseBadge :status="report.status" />
        </div>
      </div>
      
      <p class="text-gray-600 text-sm mb-4 line-clamp-3">
        {{ truncatedDescription }}
      </p>
      
      <div class="flex items-center justify-between">
        <div class="flex items-center text-sm text-gray-500">
          <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Créé le {{ formattedDate }}</span>
        </div>
        
        <!-- Delete Button -->
        <div v-if="canDelete && !showDeleteConfirm" class="relative">
          <button
            @click.stop="showDeleteConfirm = true"
            class="p-1.5 text-gray-400 hover:text-alerte-600 hover:bg-alerte-50 rounded transition-colors"
            title="Supprimer"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        
        <!-- Delete Confirmation -->
        <div v-if="showDeleteConfirm" class="flex items-center gap-2" @click.stop>
          <span class="text-sm text-alerte-600 font-medium">Supprimer?</span>
          <button
            @click="handleDelete"
            :disabled="deleting"
            class="px-2 py-1 text-xs bg-alerte-600 text-white rounded hover:bg-alerte-700 disabled:opacity-50 transition-colors"
          >
            {{ deleting ? '...' : 'Oui' }}
          </button>
          <button
            @click="cancelDelete"
            :disabled="deleting"
            class="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Non
          </button>
        </div>
      </div>
      
      <!-- Delete Error -->
      <div v-if="deleteError" class="mt-2 text-sm text-alerte-600">
        {{ deleteError }}
      </div>
    </div>
  </div>
</template>
