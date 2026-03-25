<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Types
interface DropdownItem {
  name: string
  to: string
}

interface DropdownMenu {
  name: string
  items: DropdownItem[]
}

// Router and Auth
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Refs for mobile menu and dropdowns
const isMobileMenuOpen = ref(false)
const isProfileDropdownOpen = ref(false)
const isSignalementsDropdownOpen = ref(false)
const isVerificationDropdownOpen = ref(false)

// Computed properties
const user = computed(() => authStore.user)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isJournalist = computed(() => authStore.isJournalist)

// Standard user navigation configuration (non-journalist authenticated users)
const standardUserNavItems = computed<{ name: string; to?: string; dropdown?: DropdownMenu }[]>(() => {
  if (isJournalist.value || !isAuthenticated.value) return []
  
  return [
    {
      name: 'Tableau de bord',
      to: '/users/dashboard'
    },
    {
      name: 'Signalements',
      dropdown: {
        name: 'Signalements',
        items: [
          { name: 'Nouveau', to: '/signaler' },
          { name: 'Mes signalements', to: '/users/signalements' }
        ]
      }
    },
    {
      name: 'Vérification',
      dropdown: {
        name: 'Vérification',
        items: [
          { name: 'Nouvelle', to: '/verifier' },
          { name: 'Mes vérifications', to: '/users/verifications' }
        ]
      }
    }
  ]
})

// Journalist navigation configuration
const journalistNavItems = computed<{ name: string; to?: string; dropdown?: DropdownMenu }[]>(() => {
  if (!isJournalist.value) return []
  
  return [
    {
      name: 'Tableau de bord',
      to: '/journalistes/dashboard'
    },
    {
      name: 'Signalements',
      dropdown: {
        name: 'Signalements',
        items: [
          { name: 'En attente', to: '/journaliste/pending' },
          { name: 'Verifier', to: '/journaliste/verify' }
        ]
      }
    },
    {
      name: 'Vérification',
      dropdown: {
        name: 'Vérification',
        items: [
          { name: 'En attente', to: '/journaliste/verify/pending' },
          { name: 'Vérifier', to: '/journaliste/verify/verify' }
        ]
      }
    }
  ]
})

// User menu items
const userMenuItems = computed(() => {
  const items: { name: string; to: string; icon: string }[] = [
    { name: 'Paramètres', to: '/settings', icon: 'settings' }
  ]
  return items
})

// Check if route is active
function isActiveRoute(path: string): boolean {
  return route.path === path
}

// Check if any dropdown item is active
function isDropdownItemActive(dropdown: DropdownMenu): boolean {
  return dropdown.items.some(item => route.path === item.to)
}

// Toggle functions
function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  if (isMobileMenuOpen.value) {
    isProfileDropdownOpen.value = false
    closeAllDropdowns()
  }
}

function toggleProfileDropdown() {
  isProfileDropdownOpen.value = !isProfileDropdownOpen.value
  if (isProfileDropdownOpen.value) {
    closeAllDropdowns()
  }
}

function toggleSignalementsDropdown() {
  isSignalementsDropdownOpen.value = !isSignalementsDropdownOpen.value
  if (isSignalementsDropdownOpen.value) {
    isProfileDropdownOpen.value = false
    isVerificationDropdownOpen.value = false
  }
}

function toggleVerificationDropdown() {
  isVerificationDropdownOpen.value = !isVerificationDropdownOpen.value
  if (isVerificationDropdownOpen.value) {
    isProfileDropdownOpen.value = false
    isSignalementsDropdownOpen.value = false
  }
}

function closeAllDropdowns() {
  isSignalementsDropdownOpen.value = false
  isVerificationDropdownOpen.value = false
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function closeAllMenus() {
  isMobileMenuOpen.value = false
  isProfileDropdownOpen.value = false
  closeAllDropdowns()
}

// Handle logout
async function handleLogout() {
  isProfileDropdownOpen.value = false
  closeMobileMenu()
  await authStore.logout()
  router.push('/')
}

// Handle click outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.dropdown-container')) {
    isProfileDropdownOpen.value = false
    closeAllDropdowns()
  }
}

// Handle keyboard events
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeAllMenus()
  }
}

// Watch for route changes to close mobile menu
watch(() => route.path, () => {
  closeMobileMenu()
})

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <nav 
    class="bg-nuit-700 shadow-lg sticky top-0 z-50" 
    role="navigation" 
    aria-label="Navigation principale"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- Logo -->
        <div class="shrink-0 flex items-center">
          <router-link 
            to="/" 
            class="flex items-center space-x-2" 
            @click="closeAllMenus"
          >
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span class="text-white font-bold text-xl">Verifinvestigation</span>
          </router-link>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-1">
          <!-- Standard User Navigation -->
          <template v-if="isAuthenticated && !isJournalist">
            <!-- Tableau de bord - Direct link -->
            <router-link
              v-for="item in standardUserNavItems.filter(i => !i.dropdown)"
              :key="item.name"
              :to="item.to!"
              class="text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              :class="{ 'bg-nuit-600 text-white': isActiveRoute(item.to!) }"
              :aria-current="isActiveRoute(item.to!) ? 'page' : undefined"
              @click="closeAllMenus"
            >
              {{ item.name }}
            </router-link>

            <!-- Signalements Dropdown for Standard Users -->
            <div class="relative dropdown-container">
              <button
                @click.stop="toggleSignalementsDropdown"
                @keydown.enter.stop="toggleSignalementsDropdown"
                @keydown.escape="isSignalementsDropdownOpen = false"
                class="flex items-center text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                :class="{ 
                  'bg-nuit-600 text-white': isSignalementsDropdownOpen || isDropdownItemActive(standardUserNavItems.find(i => i.name === 'Signalements')?.dropdown!) 
                }"
                :aria-expanded="isSignalementsDropdownOpen"
                aria-haspopup="true"
                aria-label="Menu Signalements"
              >
                Signalements
                <svg 
                  class="h-4 w-4 ml-1 transition-transform duration-200" 
                  :class="{ 'rotate-180': isSignalementsDropdownOpen }" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div 
                  v-if="isSignalementsDropdownOpen" 
                  class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                  role="menu"
                  aria-label="Sous-menu Signalements"
                >
                  <router-link
                    v-for="item in standardUserNavItems.find(i => i.name === 'Signalements')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    :class="{ 'bg-blue-50 text-blue-600': isActiveRoute(item.to) }"
                    role="menuitem"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- Vérification Dropdown for Standard Users -->
            <div class="relative dropdown-container">
              <button
                @click.stop="toggleVerificationDropdown"
                @keydown.enter.stop="toggleVerificationDropdown"
                @keydown.escape="isVerificationDropdownOpen = false"
                class="flex items-center text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                :class="{ 
                  'bg-nuit-600 text-white': isVerificationDropdownOpen || isDropdownItemActive(standardUserNavItems.find(i => i.name === 'Vérification')?.dropdown!) 
                }"
                :aria-expanded="isVerificationDropdownOpen"
                aria-haspopup="true"
                aria-label="Menu Vérification"
              >
                Vérification
                <svg 
                  class="h-4 w-4 ml-1 transition-transform duration-200" 
                  :class="{ 'rotate-180': isVerificationDropdownOpen }" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div 
                  v-if="isVerificationDropdownOpen" 
                  class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                  role="menu"
                  aria-label="Sous-menu Vérification"
                >
                  <router-link
                    v-for="item in standardUserNavItems.find(i => i.name === 'Vérification')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    :class="{ 'bg-blue-50 text-blue-600': isActiveRoute(item.to) }"
                    role="menuitem"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>
          </template>

          <!-- Journalist Navigation -->
          <template v-if="isJournalist">
            <!-- Tableau de bord - Direct link -->
            <router-link
              v-for="item in journalistNavItems.filter(i => !i.dropdown)"
              :key="item.name"
              :to="item.to!"
              class="text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              :class="{ 'bg-nuit-600 text-white': isActiveRoute(item.to!) }"
              :aria-current="isActiveRoute(item.to!) ? 'page' : undefined"
              @click="closeAllMenus"
            >
              {{ item.name }}
            </router-link>

            <!-- Signalements Dropdown -->
            <div class="relative dropdown-container">
              <button
                @click.stop="toggleSignalementsDropdown"
                @keydown.enter.stop="toggleSignalementsDropdown"
                @keydown.escape="isSignalementsDropdownOpen = false"
                class="flex items-center text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                :class="{ 
                  'bg-nuit-600 text-white': isSignalementsDropdownOpen || isDropdownItemActive(journalistNavItems.find(i => i.name === 'Signalements')!.dropdown!) 
                }"
                :aria-expanded="isSignalementsDropdownOpen"
                aria-haspopup="true"
                aria-label="Menu Signalements"
              >
                Signalements
                <svg 
                  class="h-4 w-4 ml-1 transition-transform duration-200" 
                  :class="{ 'rotate-180': isSignalementsDropdownOpen }" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div 
                  v-if="isSignalementsDropdownOpen" 
                  class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                  role="menu"
                  aria-label="Sous-menu Signalements"
                >
                  <router-link
                    v-for="item in journalistNavItems.find(i => i.name === 'Signalements')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    :class="{ 'bg-blue-50 text-blue-600': isActiveRoute(item.to) }"
                    role="menuitem"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- Verification Dropdown -->
            <div class="relative dropdown-container">
              <button
                @click.stop="toggleVerificationDropdown"
                @keydown.enter.stop="toggleVerificationDropdown"
                @keydown.escape="isVerificationDropdownOpen = false"
                class="flex items-center text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                :class="{ 
                  'bg-nuit-600 text-white': isVerificationDropdownOpen || isDropdownItemActive(journalistNavItems.find(i => i.name === 'Verification')!.dropdown!) 
                }"
                :aria-expanded="isVerificationDropdownOpen"
                aria-haspopup="true"
                aria-label="Menu Vérification"
              >
                Vérification
                <svg 
                  class="h-4 w-4 ml-1 transition-transform duration-200" 
                  :class="{ 'rotate-180': isVerificationDropdownOpen }" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div 
                  v-if="isVerificationDropdownOpen" 
                  class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                  role="menu"
                  aria-label="Sous-menu Vérification"
                >
                  <router-link
                    v-for="item in journalistNavItems.find(i => i.name === 'Verification')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    :class="{ 'bg-blue-50 text-blue-600': isActiveRoute(item.to) }"
                    role="menuitem"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>
          </template>
        </div>

        <!-- Desktop Auth Section -->
        <div class="hidden md:flex items-center space-x-3">
          <!-- Not authenticated - Show Login and Register -->
          <template v-if="!isAuthenticated">
            <router-link
              to="/register"
              class="bg-nuit-600 hover:bg-nuit-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Inscription
            </router-link>
            <router-link
              to="/login"
              class="border border-nuit-400 text-nuit-100 hover:text-white hover:border-nuit-600 hover:bg-nuit-600 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Connexion
            </router-link>
          </template>

          <!-- Authenticated - Show User Profile Dropdown -->
          <template v-else>
            <div class="relative dropdown-container">
              <button
                @click.stop="toggleProfileDropdown"
                @keydown.enter.stop="toggleProfileDropdown"
                @keydown.escape="isProfileDropdownOpen = false"
                class="flex items-center space-x-2 text-nuit-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-white rounded-md transition-colors duration-200"
                :class="{ 'text-white': isProfileDropdownOpen }"
                :aria-expanded="isProfileDropdownOpen"
                aria-haspopup="true"
                aria-label="Menu utilisateur"
              >
                <div class="w-8 h-8 rounded-full bg-nuit-500 flex items-center justify-center">
                  <span class="text-sm font-medium text-white">
                    {{ user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U' }}
                  </span>
                </div>
                <span class="text-sm font-medium hidden lg:block">{{ user?.username || user?.email?.split('@')[0] }}</span>
                <svg 
                  class="h-4 w-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': isProfileDropdownOpen }" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Profile Dropdown Menu -->
              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div
                  v-if="isProfileDropdownOpen"
                  class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50"
                  role="menu"
                  aria-label="Menu de profil"
                >
                  <!-- User Info -->
                  <div class="px-4 py-3 border-b border-gray-100">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ user?.username }}</p>
                    <p class="text-xs text-gray-500 capitalize">{{ user?.role === 'admin' ? 'Administrateur' : user?.role === 'journalist' ? 'Journaliste' : 'Utilisateur' }}</p>
                  </div>

                  <!-- Menu Items -->
                  <router-link
                    v-for="item in userMenuItems"
                    :key="item.name"
                    :to="item.to"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    role="menuitem"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>

                  <div class="border-t border-gray-100"></div>

                  <!-- Logout -->
                  <button
                    @click="handleLogout"
                    class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors duration-150"
                    role="menuitem"
                  >
                    Déconnexion
                  </button>
                </div>
              </transition>
            </div>
          </template>
        </div>

        <!-- Mobile menu button -->
        <div class="flex items-center md:hidden">
          <button
            @click="toggleMobileMenu"
            @keydown.enter="toggleMobileMenu"
            @keydown.space.prevent="toggleMobileMenu"
            class="text-nuit-100 hover:text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors duration-200"
            :aria-expanded="isMobileMenuOpen"
            aria-controls="mobile-menu"
            aria-label="Menu de navigation"
          >
            <svg v-if="!isMobileMenuOpen" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div 
        v-if="isMobileMenuOpen" 
        id="mobile-menu" 
        class="md:hidden bg-nuit-700" 
        role="menu" 
        aria-label="Menu mobile"
      >
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <!-- Standard User Mobile Navigation -->
          <template v-if="isAuthenticated && !isJournalist">
            <!-- Mobile Direct Links -->
            <router-link
              v-for="item in standardUserNavItems.filter(i => !i.dropdown)"
              :key="item.name"
              :to="item.to!"
              class="text-nuit-100 hover:text-white hover:bg-nuit-600 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              :class="{ 'bg-nuit-600 text-white': isActiveRoute(item.to!) }"
              :aria-current="isActiveRoute(item.to!) ? 'page' : undefined"
              role="menuitem"
              @click="closeAllMenus"
            >
              {{ item.name }}
            </router-link>

            <!-- Mobile Signalements Dropdown -->
            <div class="border-t border-nuit-600 pt-3 mt-3">
              <button
                @click.stop="toggleSignalementsDropdown"
                class="flex items-center justify-between w-full text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                :class="{ 'bg-nuit-600 text-white': isSignalementsDropdownOpen || isDropdownItemActive(standardUserNavItems.find(i => i.name === 'Signalements')?.dropdown!) }"
                :aria-expanded="isSignalementsDropdownOpen"
                aria-haspopup="true"
              >
                <span>Signalements</span>
                <svg 
                  class="h-4 w-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': isSignalementsDropdownOpen }" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-40"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 max-h-40"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="isSignalementsDropdownOpen" class="mt-1 overflow-hidden">
                  <router-link
                    v-for="item in standardUserNavItems.find(i => i.name === 'Signalements')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block pl-6 pr-3 py-2 text-nuit-200 hover:text-white hover:bg-nuit-600 rounded-md text-base font-medium transition-colors duration-200"
                    :class="{ 'bg-nuit-600 text-white': isActiveRoute(item.to) }"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- Mobile Vérification Dropdown -->
            <div class="border-t border-nuit-600 pt-3 mt-3">
              <button
                @click.stop="toggleVerificationDropdown"
                class="flex items-center justify-between w-full text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                :class="{ 'bg-nuit-600 text-white': isVerificationDropdownOpen || isDropdownItemActive(standardUserNavItems.find(i => i.name === 'Vérification')?.dropdown!) }"
                :aria-expanded="isVerificationDropdownOpen"
                aria-haspopup="true"
              >
                <span>Vérification</span>
                <svg 
                  class="h-4 w-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': isVerificationDropdownOpen }" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-40"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 max-h-40"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="isVerificationDropdownOpen" class="mt-1 overflow-hidden">
                  <router-link
                    v-for="item in standardUserNavItems.find(i => i.name === 'Vérification')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block pl-6 pr-3 py-2 text-nuit-200 hover:text-white hover:bg-nuit-600 rounded-md text-base font-medium transition-colors duration-200"
                    :class="{ 'bg-nuit-600 text-white': isActiveRoute(item.to) }"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>
          </template>

          <!-- Journalist Mobile Navigation -->
          <template v-if="isJournalist">
            <!-- Mobile Direct Links -->
            <router-link
              v-for="item in journalistNavItems.filter(i => !i.dropdown)"
              :key="item.name"
              :to="item.to!"
              class="text-nuit-100 hover:text-white hover:bg-nuit-600 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              :class="{ 'bg-nuit-600 text-white': isActiveRoute(item.to!) }"
              :aria-current="isActiveRoute(item.to!) ? 'page' : undefined"
              role="menuitem"
              @click="closeAllMenus"
            >
              {{ item.name }}
            </router-link>

            <!-- Mobile Signalements Dropdown -->
            <div class="border-t border-nuit-600 pt-3 mt-3">
              <button
                @click.stop="toggleSignalementsDropdown"
                class="flex items-center justify-between w-full text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                :class="{ 'bg-nuit-600 text-white': isSignalementsDropdownOpen || isDropdownItemActive(journalistNavItems.find(i => i.name === 'Signalements')!.dropdown!) }"
                :aria-expanded="isSignalementsDropdownOpen"
                aria-haspopup="true"
              >
                <span>Signalements</span>
                <svg 
                  class="h-4 w-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': isSignalementsDropdownOpen }" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-40"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 max-h-40"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="isSignalementsDropdownOpen" class="mt-1 overflow-hidden">
                  <router-link
                    v-for="item in journalistNavItems.find(i => i.name === 'Signalements')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block pl-6 pr-3 py-2 text-nuit-200 hover:text-white hover:bg-nuit-600 rounded-md text-base font-medium transition-colors duration-200"
                    :class="{ 'bg-nuit-600 text-white': isActiveRoute(item.to) }"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- Mobile Verification Dropdown -->
            <div class="border-t border-nuit-600 pt-3 mt-3">
              <button
                @click.stop="toggleVerificationDropdown"
                class="flex items-center justify-between w-full text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                :class="{ 'bg-nuit-600 text-white': isVerificationDropdownOpen || isDropdownItemActive(journalistNavItems.find(i => i.name === 'Verification')!.dropdown!) }"
                :aria-expanded="isVerificationDropdownOpen"
                aria-haspopup="true"
              >
                <span>Vérification</span>
                <svg 
                  class="h-4 w-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': isVerificationDropdownOpen }" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-40"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 max-h-40"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="isVerificationDropdownOpen" class="mt-1 overflow-hidden">
                  <router-link
                    v-for="item in journalistNavItems.find(i => i.name === 'Verification')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block pl-6 pr-3 py-2 text-nuit-200 hover:text-white hover:bg-nuit-600 rounded-md text-base font-medium transition-colors duration-200"
                    :class="{ 'bg-nuit-600 text-white': isActiveRoute(item.to) }"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>
          </template>
        </div>

        <!-- Mobile Auth Section -->
        <div class="pt-4 pb-4 border-t border-nuit-600 px-4 space-y-3">
          <template v-if="!isAuthenticated">
            <router-link
              to="/register"
              class="block w-full text-center bg-nuit-600 hover:bg-nuit-700 text-white px-4 py-2 rounded-md text-base font-medium transition-colors duration-200"
              @click="closeAllMenus"
            >
              Inscription
            </router-link>
            <router-link
              to="/login"
              class="block w-full text-center border border-nuit-400 text-nuit-100 hover:text-white hover:border-nuit-600 hover:bg-nuit-600 px-4 py-2 rounded-md text-base font-medium transition-colors duration-200"
              @click="closeAllMenus"
            >
              Connexion
            </router-link>
          </template>

          <template v-else>
            <!-- User Info -->
            <div class="flex items-center space-x-3 px-3">
              <div class="w-10 h-10 rounded-full bg-nuit-500 flex items-center justify-center">
                <span class="text-sm font-medium text-white">
                  {{ user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U' }}
                </span>
              </div>
              <div class="flex-1">
                <p class="text-nuit-100 text-sm font-medium">{{ user?.username || user?.email?.split('@')[0] }}</p>
                <p class="text-nuit-200 text-xs">{{ user?.role === 'admin' ? 'Administrateur' : user?.role === 'journalist' ? 'Journaliste' : 'Utilisateur' }}</p>
              </div>
            </div>

            <div class="border-t border-nuit-600 pt-3">
              <router-link
                v-for="item in userMenuItems"
                :key="item.name"
                :to="item.to"
                class="block text-nuit-100 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                @click="closeAllMenus"
              >
                {{ item.name }}
              </router-link>
            </div>

            <button
              @click="handleLogout"
              class="block w-full text-center text-red-400 hover:text-red-300 px-4 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Déconnexion
            </button>
          </template>
        </div>
      </div>
    </transition>
  </nav>
</template>
