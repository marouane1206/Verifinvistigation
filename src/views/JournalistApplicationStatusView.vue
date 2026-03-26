<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApplicationsStore } from '../stores/applications'
import { useAuthStore } from '../stores/auth'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const applicationsStore = useApplicationsStore()
const authStore = useAuthStore()

const loading = ref(true)
const application = ref<any>(null)

const status = computed(() => application.value?.status || null)

const statusConfig = computed(() => {
  // First priority: Use status from the application if available
  if (status.value) {
    switch (status.value) {
      case 'pending':
        return {
          title: 'Votre demande est en cours d\'examen',
          description: 'Nous avons bien reçu votre demande d\'inscription en tant que journaliste. Notre équipe l\'examine actuellement. Ce processus peut prendre quelques jours.',
          icon: '⏳',
          color: 'yellow',
          showDashboardLink: false
        }
      case 'approved':
        return {
          title: 'Félicitations ! Votre demande a été approuvée',
          description: 'Votre inscription en tant que journaliste a été acceptée. Vous avez maintenant accès au tableau de bord journaliste et pouvez commencer à publier vos investigations.',
          icon: '🎉',
          color: 'green',
          showDashboardLink: true
        }
      case 'rejected':
        return {
          title: 'Votre demande a été rejetée',
          description: application.value?.admin_notes 
            ? `Motif: ${application.value.admin_notes}`
            : 'Nous regrettons de vous informer que votre demande d\'inscription en tant que journaliste n\'a pas pu être acceptée. Veuillez nous contacter pour plus d\'informations.',
          icon: '❌',
          color: 'red',
          showDashboardLink: false
        }
      default:
        break
    }
  }
  
  // Second priority: Check if user has journalist role with pending status (fallback from auth)
  // This handles the case where profile fetch failed but auth store has the correct status
  if (authStore.isJournalist && authStore.isPending) {
    return {
      title: 'Votre demande est en cours d\'examen',
      description: 'Votre compte journaliste est en attente d\'approbation par l\'administrateur. Vous recevrez une notification dès que votre demande sera traitée.',
      icon: '⏳',
      color: 'yellow',
      showDashboardLink: false
    }
  }
  
  // Default: No application found
  return {
    title: 'Aucune demande trouvée',
    description: 'Vous n\'avez pas de demande d\'inscription en tant que journaliste.',
    icon: '📋',
    color: 'gray',
    showDashboardLink: false
  }
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const goToDashboard = () => {
  router.push('/journalistes/dashboard')
}

const goToRegister = () => {
  router.push('/journalistes/register')
}

const goToHome = () => {
  router.push('/')
}

onMounted(async () => {
  try {
    application.value = await applicationsStore.getMyApplication()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50 flex flex-col">
    <!-- Main Content -->
    <main class="flex-1 flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full">
        <!-- Loading State -->
        <div v-if="loading" class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-nuit-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Chargement...</p>
        </div>

        <!-- Status Content -->
        <div v-else class="bg-white rounded-xl shadow-lg p-8 text-center">
          <!-- Icon -->
          <div 
            class="text-6xl mb-6"
            :class="{
              'animate-pulse': status === 'pending' || (authStore.isJournalist && authStore.isPending)
            }"
          >
            {{ statusConfig.icon }}
          </div>

          <!-- Title -->
          <h1 
            class="text-2xl font-bold mb-4"
            :class="{
              'text-yellow-600': statusConfig.color === 'yellow',
              'text-green-600': statusConfig.color === 'green',
              'text-red-600': statusConfig.color === 'red',
              'text-gray-600': statusConfig.color === 'gray'
            }"
          >
            {{ statusConfig.title }}
          </h1>

          <!-- Description -->
          <p class="text-gray-600 mb-6">
            {{ statusConfig.description }}
          </p>

          <!-- Application Details (if exists) -->
          <div v-if="application" class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Détails de votre demande</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Nom:</span>
                <span class="text-gray-900 font-medium">{{ application.full_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Média:</span>
                <span class="text-gray-900">{{ application.media_outlet || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Date de soumission:</span>
                <span class="text-gray-900">{{ formatDate(application.created_at) }}</span>
              </div>
              <div v-if="application.reviewed_at" class="flex justify-between">
                <span class="text-gray-500">Date de réponse:</span>
                <span class="text-gray-900">{{ formatDate(application.reviewed_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <BaseButton 
              v-if="statusConfig.showDashboardLink"
              variant="primary" 
              class="w-full"
              @click="goToDashboard"
            >
              Accéder au tableau de bord journaliste
            </BaseButton>
            
            <BaseButton 
              v-if="status === 'rejected'"
              variant="outline" 
              class="w-full"
              @click="goToRegister"
            >
              Soumettre une nouvelle demande
            </BaseButton>
            
            <BaseButton 
              v-if="!status || status === 'rejected'"
              variant="outline" 
              class="w-full"
              @click="goToHome"
            >
              Retour à l'accueil
            </BaseButton>
          </div>
        </div>

        <!-- Support Contact -->
        <div v-if="status === 'rejected'" class="mt-6 text-center">
          <p class="text-gray-600 text-sm">
            Vous avez des questions ? 
            <a href="mailto:support@verifinvestigation.org" class="text-nuit-600 hover:underline">
              Contactez notre équipe
            </a>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
