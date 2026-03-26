<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

// Redirect authenticated users to their appropriate dashboard
onMounted(async () => {
  // Initialize auth if not done yet
  try {
    if (!authStore.user && !authStore.loading) {
      await authStore.initialize()
    }
    
    // After initialization, check if user is authenticated
    if (authStore.isAuthenticated) {
      // Redirect based on role - priority: admin > journalist > user
      if (authStore.isAdmin) {
        router.replace({ name: 'admin-dashboard' })
      } else if (authStore.isJournalist) {
        router.replace('/journalistes/dashboard')
      } else {
        router.replace('/users/dashboard')
      }
      return
    }
  } catch (error) {
    console.error('[HomeView] Auth initialization failed:', error)
  }
})

const stats = [
  { value: '1500+', label: 'Signalements traités' },
  { value: '200+', label: 'Journalistes partenaires' },
  { value: '98%', label: 'Taux de résolution' },
  { value: '24h', label: 'Temps de réponse moyen' },
]

const services = [
  {
    icon: '📢',
    title: 'Signalement',
    description: 'Signalez toute information suspecte, fraude ou activité illégale de manière sécurisée et anonyme.',
    link: '/signaler',
    cta: 'Faire un signalement',
  },
  {
    icon: '✓',
    title: 'Vérification',
    description: 'Faites vérifier vos informations par notre réseau de journalistes et experts.',
    link: '/signaler',
    cta: 'Demander une vérification',
  },
  {
    icon: '📰',
    title: 'Réseau Journalistes',
    description: 'Accédez à une plateforme collaborative pour les professionnels de l\'investigation.',
    link: '/journalistes/register',
    cta: 'Espace journaliste',
  },
]

function handleServiceClick(service: { title: string; link: string }) {
  // Special case: Réseau Journalistes card always navigates directly to registration
  if (service.title === 'Réseau Journalistes') {
    router.push('/journalistes/register')
    return
  }
  
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: service.link } })
  } else {
    router.push(service.link)
  }
}

function handleCtaClick(link: string) {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: link } })
  } else {
    router.push(link)
  }
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="relative bg-linear-to-br from-nuit-900 via-nuit-800 to-nuit-700 text-white overflow-hidden">
      <div class="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div class="text-center">
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Une plateforme intelligente pour signaler et vérifier l'information en temps réel.
          </h1>
          <p class="text-xl md:text-2xl text-nuit-200 mb-8 max-w-3xl mx-auto">
            Prenez une longueur d'avance contre la fraude, la corruption et la désinformation.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <BaseButton
              variant="primary"
              size="lg"
              @click="handleCtaClick('/signaler')"
            >
              Faire un signalement
            </BaseButton>
            <BaseButton
              variant="outline"
              size="lg"
              class="border-white! text-white hover:bg-white/10"
              @click="router.push('/login')"
            >
              Se connecter
            </BaseButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Statistics Section -->
    <section class="py-16 bg-ardoise-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="text-center"
          >
            <div class="text-3xl md:text-4xl font-bold text-nuit-600 mb-2">
              {{ stat.value }}
            </div>
            <div class="text-ardoise-600 text-sm md:text-base">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Nos Services
          </h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Des outils professionnels pour vous aider à signaler, vérifier et enquêteur sur les informations sensibles.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div
            v-for="service in services"
            :key="service.title"
            class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border border-gray-100"
          >
            <div class="text-4xl mb-4">{{ service.icon }}</div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">
              {{ service.title }}
            </h3>
            <p class="text-gray-600 mb-6">
              {{ service.description }}
            </p>
            <BaseButton
              variant="secondary"
              @click="handleServiceClick(service)"
            >
              {{ service.cta }}
            </BaseButton>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-nuit-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Prêt à contribuer ?
        </h2>
        <p class="text-lg text-gray-600 mb-8">
          Rejoignez notre communauté et aidez-nous à maintenir l'intégrité de l'information.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <BaseButton
            variant="primary"
            size="lg"
            @click="router.push('/register')"
          >
            Créer un compte
          </BaseButton>
          <BaseButton
            variant="outline"
            size="lg"
            @click="router.push('/login')"
          >
            Déjà inscrit ?
          </BaseButton>
        </div>
      </div>
    </section>

    <!-- Trust Section -->
    <section class="py-16 bg-ardoise-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-nuit-100 rounded-full mb-4">
              <svg class="w-8 h-8 text-nuit-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Sécurisé</h3>
            <p class="text-gray-600">Vos données sont protégées par un cryptage de bout en bout</p>
          </div>
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-nuit-100 rounded-full mb-4">
              <svg class="w-8 h-8 text-nuit-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Anonyme</h3>
            <p class="text-gray-600">Possibilité de signaler de manière totalement anonyme</p>
          </div>
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-nuit-100 rounded-full mb-4">
              <svg class="w-8 h-8 text-nuit-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Rapide</h3>
            <p class="text-gray-600">Traitement rapide de vos signalements par notre équipe</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>