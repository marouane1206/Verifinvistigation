<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAdminStore } from '../stores/admin'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const adminStore = useAdminStore()

const stats = computed(() => adminStore.stats)

const menuItems = [
  {
    title: 'Utilisateurs',
    description: 'Gérer les utilisateurs, journalistes et administrateurs',
    icon: '👥',
    route: '/admin/users',
    color: 'bleu',
    count: computed(() => stats.value.totalUsers + stats.value.totalJournalists + stats.value.totalAdmins)
  },
  {
    title: 'Signalements',
    description: 'Gérer les signalements et demandes de vérification',
    icon: '📋',
    route: '/admin/users/reports',
    color: 'alerte',
    count: computed(() => stats.value.totalReports)
  },
  {
    title: 'Vérifications',
    description: 'Gérer les résultats d\'investigation',
    icon: '🔍',
    route: '/admin/users/investigations',
    color: 'nuit',
    count: computed(() => stats.value.totalInvestigations)
  },
  {
    title: 'Médiathèque',
    description: 'Gérer les images et fichiers uploadés',
    icon: '📁',
    route: '/admin/users/media',
    color: 'vert',
    count: computed(() => adminStore.mediaFiles.length)
  }
]

onMounted(async () => {
  await adminStore.fetchStats()
  await adminStore.fetchMediaFiles()
})
</script>

<template>
  <div class="min-h-screen bg-ardoise-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
          Administration
        </h1>
        <p class="text-gray-600 mt-1">
          Bienvenue dans le panneau d'administration, {{ authStore.user?.username || 'admin' }} !
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <!-- Users -->
        <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Utilisateurs</p>
              <p class="text-2xl font-bold text-nuit-600">{{ stats.totalUsers }}</p>
            </div>
            <div class="text-3xl">👤</div>
          </div>
        </div>

        <!-- Journalists -->
        <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Journalistes</p>
              <p class="text-2xl font-bold text-bleu-600">{{ stats.totalJournalists }}</p>
            </div>
            <div class="text-3xl">📰</div>
          </div>
        </div>

        <!-- Pending Reports -->
        <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">En attente</p>
              <p class="text-2xl font-bold text-alerte-600">{{ stats.pendingReports }}</p>
            </div>
            <div class="text-3xl">⏳</div>
          </div>
        </div>

        <!-- Published Investigations -->
        <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Publiées</p>
              <p class="text-2xl font-bold text-vert-600">{{ stats.publicInvestigations }}</p>
            </div>
            <div class="text-3xl">✅</div>
          </div>
        </div>
      </div>

      <!-- Menu Cards -->
      <div class="grid md:grid-cols-2 gap-6">
        <router-link
          v-for="item in menuItems"
          :key="item.route"
          :to="item.route"
          class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div class="flex items-start gap-4">
            <div class="text-4xl">{{ item.icon }}</div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-nuit-600 transition-colors">
                  {{ item.title }}
                </h3>
                <span 
                  v-if="item.count.value > 0"
                  class="px-3 py-1 rounded-full text-sm font-medium"
                  :class="{
                    'bg-bleu-100 text-bleu-700': item.color === 'bleu',
                    'bg-alerte-100 text-alerte-700': item.color === 'alerte',
                    'bg-nuit-100 text-nuit-700': item.color === 'nuit',
                    'bg-vert-100 text-vert-700': item.color === 'vert'
                  }"
                >
                  {{ item.count.value }}
                </span>
              </div>
              <p class="text-gray-600 mt-1 text-sm">
                {{ item.description }}
              </p>
            </div>
          </div>
        </router-link>
      </div>

      <!-- Quick Actions -->
      <div class="mt-8 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div class="flex flex-wrap gap-3">
          <BaseButton variant="outline" @click="router.push('/admin/users')">
            Voir les utilisateurs
          </BaseButton>
          <BaseButton variant="outline" @click="router.push('/admin/users/reports')">
            Gérer les signalements
          </BaseButton>
          <BaseButton variant="outline" @click="router.push('/admin/users/investigations')">
            Gérer les enquêtes
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
