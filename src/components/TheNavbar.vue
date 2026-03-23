<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

interface User {
  id: string
  email: string
  role: string
}

interface Props {
  user?: User | null
}

const props = defineProps<Props>()

const router = useRouter()
const isMenuOpen = ref(false)
const isDropdownOpen = ref(false)

const emit = defineEmits<{
  (e: 'logout'): void
}>()

const isLoggedIn = computed(() => !!props.user)
const isJournalist = computed(() => props.user?.role === 'journalist' || props.user?.role === 'admin')
const isAdmin = computed(() => props.user?.role === 'admin')

const navigation = computed(() => [
  { name: 'Accueil', to: '/', loggedIn: false },
  { name: 'Signaler', to: '/report', loggedIn: false },
  { name: 'Tableau de bord', to: '/dashboard', loggedIn: true },
  { name: 'Espace Journaliste', to: '/journalist', loggedIn: isJournalist.value },
])

const filteredNav = computed(() => 
  navigation.value.filter(item => !item.loggedIn || isLoggedIn.value)
)

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value) {
    isDropdownOpen.value = false
  }
}

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value
}

function handleLogout() {
  emit('logout')
  isDropdownOpen.value = false
  router.push('/')
}

function closeMenus() {
  isMenuOpen.value = false
  isDropdownOpen.value = false
}
</script>

<template>
  <nav class="bg-nuit-700 shadow-lg sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- Logo -->
        <div class="flex-shrink-0 flex items-center">
          <router-link to="/" class="flex items-center space-x-2" @click="closeMenus">
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span class="text-white font-bold text-xl">Verifinvestigation</span>
          </router-link>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-4">
          <router-link
            v-for="item in filteredNav"
            :key="item.name"
            :to="item.to"
            class="text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            @click="closeMenus"
          >
            {{ item.name }}
          </router-link>
        </div>

        <!-- Desktop Auth Buttons -->
        <div class="hidden md:flex items-center space-x-3">
          <template v-if="!isLoggedIn">
            <router-link
              to="/login"
              class="text-nuit-100 hover:text-white hover:bg-nuit-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Connexion
            </router-link>
            <router-link
              to="/register"
              class="bg-white text-nuit-700 hover:bg-nuit-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Inscription
            </router-link>
          </template>
          <template v-else>
            <div class="relative">
              <button
                @click="toggleDropdown"
                class="flex items-center space-x-2 text-nuit-100 hover:text-white focus:outline-none"
              >
                <span class="text-sm font-medium">{{ user?.email }}</span>
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                v-if="isDropdownOpen"
                class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
              >
                <button
                  @click="handleLogout"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Mobile menu button -->
        <div class="flex items-center md:hidden">
          <button
            @click="toggleMenu"
            class="text-nuit-100 hover:text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          >
            <svg v-if="!isMenuOpen" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-if="isMenuOpen" class="md:hidden bg-nuit-700">
      <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
        <router-link
          v-for="item in filteredNav"
          :key="item.name"
          :to="item.to"
          class="text-nuit-100 hover:text-white hover:bg-nuit-600 block px-3 py-2 rounded-md text-base font-medium"
          @click="closeMenus"
        >
          {{ item.name }}
        </router-link>
      </div>
      <div class="pt-4 pb-4 border-t border-nuit-600 px-4 space-y-3">
        <template v-if="!isLoggedIn">
          <router-link
            to="/login"
            class="block w-full text-center text-nuit-100 hover:text-white px-4 py-2 rounded-md text-base font-medium"
            @click="closeMenus"
          >
            Connexion
          </router-link>
          <router-link
            to="/register"
            class="block w-full text-center bg-white text-nuit-700 hover:bg-nuit-50 px-4 py-2 rounded-md text-base font-medium"
            @click="closeMenus"
          >
            Inscription
          </router-link>
        </template>
        <template v-else>
          <div class="text-nuit-100 text-sm">{{ user?.email }}</div>
          <button
            @click="handleLogout"
            class="block w-full text-center text-nuit-100 hover:text-white px-4 py-2 rounded-md text-base font-medium"
          >
            Déconnexion
          </button>
        </template>
      </div>
    </div>
  </nav>
</template>
