<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useReportsStore } from '../stores/reports'
import { supabase } from '../lib/supabase'
import BaseButton from '../components/BaseButton.vue'
import BaseBadge from '../components/BaseBadge.vue'

const router = useRouter()
const authStore = useAuthStore()
const reportsStore = useReportsStore()

const loading = ref(false)
const processing = ref(false)
const selectedReports = ref<Set<string>>(new Set())
const allSelected = ref(false)

// Fetch unassigned reports with "en_attente" status
const availableReports = computed(() => 
  reportsStore.reports.filter(r => r.status === 'en_attente' && !r.assigned_to)
)

// Count of selected reports
const selectedCount = computed(() => selectedReports.value.size)

// Toggle select all
function toggleSelectAll() {
  if (allSelected.value) {
    // Deselect all
    selectedReports.value.clear()
    allSelected.value = false
  } else {
    // Select all available reports
    availableReports.value.forEach(report => {
      selectedReports.value.add(report.id)
    })
    allSelected.value = true
  }
}

// Toggle individual report selection
function toggleReportSelection(reportId: string) {
  if (selectedReports.value.has(reportId)) {
    selectedReports.value.delete(reportId)
  } else {
    selectedReports.value.add(reportId)
  }
  // Update allSelected based on whether all are selected
  allSelected.value = selectedReports.value.size === availableReports.value.length
}

// Start investigation for selected reports
async function startInvestigation() {
  if (selectedReports.value.size === 0) return
  
  processing.value = true
  try {
    const reportIds = Array.from(selectedReports.value)
    const userId = authStore.user?.id
    
    if (!userId) {
      console.error('User ID not found')
      return
    }
    
    // Use bulkAssignToInProgress to assign reports and set status to en_cours
    await reportsStore.bulkAssignToInProgress(reportIds, userId)
    
    // Send notification to admin for each report
    await sendInvestigationNotification(reportIds)
    
    // Clear selection after successful assignment
    selectedReports.value.clear()
    allSelected.value = false
    
    // Refresh reports to get updated status
    await reportsStore.fetchAllReports()
    
    // Optionally navigate to in-progress section or show success message
    alert(`${reportIds.length} investigation(s) started successfully!`)
  } catch (error) {
    console.error('Error starting investigation:', error)
    alert('Error starting investigation. Please try again.')
  } finally {
    processing.value = false
  }
}

// Send notification to admin when investigation starts
async function sendInvestigationNotification(reportIds: string[]) {
  try {
    // Get the selected reports details
    const selectedReportsList = availableReports.value.filter(r => reportIds.includes(r.id))
    
    // Send notification for each report
    for (const report of selectedReportsList) {
      const notificationData = {
        report_id: report.id,
        report_title: report.title,
        journalist_name: authStore.user?.username || 'Unknown Journalist',
        journalist_email: authStore.user?.email || '',
        timestamp: new Date().toISOString()
      }

      const { data, error } = await supabase.functions.invoke(
        'notify-investigation-started',
        { body: notificationData }
      )

      if (error) {
        console.error('Error sending investigation notification:', error)
      } else {
        console.log('Investigation notification sent:', data)
      }
    }
  } catch (error) {
    console.error('Failed to send investigation notification:', error)
  }
}

function viewReportDetails(reportId: string) {
  router.push(`/investigation/${reportId}`)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
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
          Signalements Disponibles
        </h1>
        <p class="text-gray-600 mt-1">
          Sélectionnez les signalements que vous souhaitez investiguer
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600"></div>
      </div>

      <div v-else>
        <!-- Selection Header -->
        <div v-if="availableReports.length > 0" class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <!-- Select All Checkbox -->
            <div class="flex items-center">
              <input
                type="checkbox"
                id="selectAll"
                v-model="allSelected"
                @change="toggleSelectAll"
                class="h-5 w-5 text-nuit-600 border-gray-300 rounded focus:ring-nuit-600 cursor-pointer"
              />
              <label for="selectAll" class="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                Tout sélectionner ({{ availableReports.length }})
              </label>
            </div>
            
            <!-- Selection Counter -->
            <div v-if="selectedCount > 0" class="flex items-center text-sm text-gray-600">
              <span class="font-medium text-nuit-600">{{ selectedCount }}</span>
              <span class="ml-1">signalement(s) sélectionné(s)</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="availableReports.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div class="text-4xl mb-2">📭</div>
          <p class="text-gray-600">
            Aucun signalement disponible pour investigation.
          </p>
          <p class="text-sm text-gray-500 mt-2">
            Revenez plus tard ou contactez l'administrateur.
          </p>
        </div>

        <!-- Reports List -->
        <div v-else class="space-y-4 mb-8">
          <div
            v-for="report in availableReports"
            :key="report.id"
            class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            :class="{ 'ring-2 ring-nuit-600': selectedReports.has(report.id) }"
          >
            <div class="flex items-start gap-4">
              <!-- Individual Checkbox -->
              <div class="shrink-0 pt-1">
                <input
                  type="checkbox"
                  :id="`report-${report.id}`"
                  :checked="selectedReports.has(report.id)"
                  @change="toggleReportSelection(report.id)"
                  class="h-5 w-5 text-nuit-600 border-gray-300 rounded focus:ring-nuit-600 cursor-pointer"
                />
              </div>
              
              <!-- Report Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                  <span :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    report.type === 'signalement' ? 'bg-alerte-100 text-alerte-800' : 'bg-bleu-100 text-bleu-800'
                  ]">
                    {{ report.type === 'signalement' ? 'Signalement' : 'Vérification' }}
                  </span>
                  <BaseBadge status="en_attente">En attente</BaseBadge>
                </div>
                
                <h3 class="text-lg font-semibold text-gray-900 mb-1 truncate">
                  {{ report.title }}
                </h3>
                
                <p class="text-sm text-gray-600 line-clamp-2 mb-3">
                  {{ report.description }}
                </p>
                
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <span>Créé le {{ formatDate(report.created_at) }}</span>
                  <button 
                    class="text-nuit-600 hover:text-nuit-800 font-medium"
                    @click="viewReportDetails(report.id)"
                  >
                    Voir les détails →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Start Investigation Button -->
        <div v-if="selectedCount > 0" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="text-sm text-gray-600">
              <span class="font-medium text-nuit-600">{{ selectedCount }}</span>
              signalement(s) sélectionné(s)
            </div>
            <BaseButton
              variant="primary"
              size="lg"
              :loading="processing"
              :disabled="processing"
              @click="startInvestigation"
            >
              Commencer l'investigation
            </BaseButton>
          </div>
        </div>
        
        <!-- Spacer for fixed button -->
        <div v-if="selectedCount > 0" class="h-24"></div>
      </div>
    </div>
  </div>
</template>