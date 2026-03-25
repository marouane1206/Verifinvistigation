<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAdminStore } from '../stores/admin'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Navigation item for direct links
 */
export interface NavItem {
  name: string
  to: string
  icon?: string
  badge?: string | number
}

/**
 * Dropdown menu item (sub-navigation)
 */
export interface DropdownItem {
  name: string
  to: string
  icon?: string
  badge?: string | number
}

/**
 * Dropdown menu configuration
 */
export interface DropdownMenu {
  name: string
  label: string
  items: DropdownItem[]
  icon?: string
}

/**
 * Complete navigation configuration
 */
export interface NavSection {
  name: string
  to?: string
  dropdown?: DropdownMenu
}

// ============================================================================
// Router and Auth
// ============================================================================

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const adminStore = useAdminStore()

// Pending applications count
const pendingApplicationsCount = ref(0)

const fetchPendingCount = async () => {
  pendingApplicationsCount.value = await adminStore.getPendingApplicationsCount()
}

// ============================================================================
// State
// ============================================================================

const isMobileMenuOpen = ref(false)
const isUsersDropdownOpen = ref(false)
const isJournalistsDropdownOpen = ref(false)
const isProfileDropdownOpen = ref(false)

// ============================================================================
// Computed Properties
// ============================================================================

const user = computed(() => authStore.user)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)

// ============================================================================
// Admin Navigation Configuration
// ============================================================================

const adminNavItems = computed<NavSection[]>(() => {
  if (!isAdmin.value) return []

  return [
    {
      name: 'Tableau de bord',
      to: '/admin'
    },
    {
      name: 'Utilisateurs',
      dropdown: {
        name: 'Utilisateurs',
        label: 'Menu Utilisateurs',
        items: [
          { name: 'Liste des utilisateurs', to: '/admin/users', icon: 'users' },
          { name: 'Créer un utilisateur', to: '/admin/users/create', icon: 'user-plus' },
          { name: 'Médias', to: '/admin/users/media', icon: 'image' },
          { name: 'Rôles et permissions', to: '/admin/users/roles', icon: 'shield' },
          { name: 'Journal d\'activité', to: '/admin/users/activity', icon: 'activity' }
        ]
      }
    },
    {
      name: 'Journalistes',
      dropdown: {
        name: 'Journalistes',
        label: 'Menu Journalistes',
        items: [
          { name: 'Liste des journalistes', to: '/admin/journalists', icon: 'user-check' },
          { name: 'Demandes d\'approbation', to: '/admin/journalists/approvals', icon: 'user-plus', badge: pendingApplicationsCount.value },
          { name: 'Médias', to: '/admin/journalists/media', icon: 'image' },
          { name: 'Gestion des articles', to: '/admin/journalists/articles', icon: 'file-text' },
          { name: 'Performance et stats', to: '/admin/journalists/performance', icon: 'bar-chart' }
        ]
      }
    },
    {
      name: 'Signalements',
      to: '/admin/reports'
    },
    {
      name: 'Vérification',
      to: '/admin/investigations'
    }
  ]
})

// Profile menu items
const profileMenuItems = computed(() => {
  const items: { name: string; to: string; icon: string }[] = [
    { name: 'Paramètres', to: '/admin/settings', icon: 'settings' }
  ]
  return items
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a route is currently active
 */
function isActiveRoute(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

/**
 * Check if any dropdown item is active
 */
function isDropdownItemActive(dropdown: DropdownMenu): boolean {
  return dropdown.items.some(item => isActiveRoute(item.to))
}

// ============================================================================
// Toggle Functions
// ============================================================================

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  if (isMobileMenuOpen.value) {
    isProfileDropdownOpen.value = false
    closeAllDropdowns()
  }
}

function toggleUsersDropdown() {
  isUsersDropdownOpen.value = !isUsersDropdownOpen.value
  if (isUsersDropdownOpen.value) {
    isJournalistsDropdownOpen.value = false
    isProfileDropdownOpen.value = false
  }
}

function toggleJournalistsDropdown() {
  isJournalistsDropdownOpen.value = !isJournalistsDropdownOpen.value
  if (isJournalistsDropdownOpen.value) {
    isUsersDropdownOpen.value = false
    isProfileDropdownOpen.value = false
  }
}

function toggleProfileDropdown() {
  isProfileDropdownOpen.value = !isProfileDropdownOpen.value
  if (isProfileDropdownOpen.value) {
    closeAllDropdowns()
  }
}

function closeAllDropdowns() {
  isUsersDropdownOpen.value = false
  isJournalistsDropdownOpen.value = false
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function closeAllMenus() {
  isMobileMenuOpen.value = false
  isProfileDropdownOpen.value = false
  closeAllDropdowns()
}

// ============================================================================
// Actions
// ============================================================================

async function handleLogout() {
  isProfileDropdownOpen.value = false
  closeMobileMenu()
  await authStore.logout()
  router.push('/')
}

// ============================================================================
// Event Handlers
// ============================================================================

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.dropdown-container')) {
    isProfileDropdownOpen.value = false
    closeAllDropdowns()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeAllMenus()
  }
}

// Handle route changes - close mobile menu and refresh badge when needed
function handleRouteChange(newPath: string) {
  closeMobileMenu()
  // Refresh pending count when navigating to approvals page
  if (newPath.includes('approvals')) {
    fetchPendingCount()
  }
}

// Watch route changes to close mobile menu and refresh badge
watch(() => route.path, handleRouteChange)

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  // Fetch pending applications count
  fetchPendingCount()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <nav 
    class="admin-nav bg-gray-900 shadow-lg sticky top-0 z-50" 
    role="navigation" 
    aria-label="Navigation administrateur"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- Logo -->
        <div class="shrink-0 flex items-center">
          <router-link 
            to="/admin" 
            class="flex items-center space-x-2" 
            @click="closeAllMenus"
          >
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span class="text-white font-bold text-xl">Admin Verifinvestigation</span>
          </router-link>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-1">
          <template v-if="isAdmin">
            <!-- Direct Links -->
            <router-link
              v-for="item in adminNavItems.filter(i => !i.dropdown)"
              :key="item.name"
              :to="item.to!"
              class="text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              :class="{ 'bg-gray-800 text-white': isActiveRoute(item.to!) }"
              :aria-current="isActiveRoute(item.to!) ? 'page' : undefined"
              @click="closeAllMenus"
            >
              {{ item.name }}
            </router-link>

            <!-- Users Dropdown -->
            <div class="relative dropdown-container">
              <button
                @click.stop="toggleUsersDropdown"
                @keydown.enter.stop="toggleUsersDropdown"
                @keydown.escape="isUsersDropdownOpen = false"
                class="flex items-center text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                :class="{ 
                  'bg-gray-800 text-white': isUsersDropdownOpen || isDropdownItemActive(adminNavItems.find(i => i.name === 'Utilisateurs')!.dropdown!) 
                }"
                :aria-expanded="isUsersDropdownOpen"
                aria-haspopup="true"
                aria-label="Menu Utilisateurs"
              >
                Utilisateurs
                <svg 
                  class="h-4 w-4 ml-1 transition-transform duration-200" 
                  :class="{ 'rotate-180': isUsersDropdownOpen }" 
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
                  v-if="isUsersDropdownOpen" 
                  class="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                  role="menu"
                  aria-label="Sous-menu Utilisateurs"
                >
                  <router-link
                    v-for="item in adminNavItems.find(i => i.name === 'Utilisateurs')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    :class="{ 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400': isActiveRoute(item.to) }"
                    role="menuitem"
                    @click="closeAllMenus"
                  >
                    <div class="flex items-center">
                      <!-- Icon -->
                      <svg v-if="item.icon === 'users'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <svg v-else-if="item.icon === 'user-plus'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <svg v-else-if="item.icon === 'shield'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <svg v-else-if="item.icon === 'image'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <svg v-else-if="item.icon === 'activity'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {{ item.name }}
                    </div>
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- Journalists Dropdown -->
            <div class="relative dropdown-container">
              <button
                @click.stop="toggleJournalistsDropdown"
                @keydown.enter.stop="toggleJournalistsDropdown"
                @keydown.escape="isJournalistsDropdownOpen = false"
                class="flex items-center text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                :class="{ 
                  'bg-gray-800 text-white': isJournalistsDropdownOpen || isDropdownItemActive(adminNavItems.find(i => i.name === 'Journalistes')!.dropdown!) 
                }"
                :aria-expanded="isJournalistsDropdownOpen"
                aria-haspopup="true"
                aria-label="Menu Journalistes"
              >
                Journalistes
                <svg 
                  class="h-4 w-4 ml-1 transition-transform duration-200" 
                  :class="{ 'rotate-180': isJournalistsDropdownOpen }" 
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
                  v-if="isJournalistsDropdownOpen" 
                  class="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                  role="menu"
                  aria-label="Sous-menu Journalistes"
                >
                  <router-link
                    v-for="item in adminNavItems.find(i => i.name === 'Journalistes')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    :class="{ 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400': isActiveRoute(item.to) }"
                    role="menuitem"
                    @click="closeAllMenus"
                  >
                    <div class="flex items-center">
                      <!-- Icons -->
                      <svg v-if="item.icon === 'user-check'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <svg v-else-if="item.icon === 'user-plus'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <svg v-else-if="item.icon === 'file-text'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <svg v-else-if="item.icon === 'image'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <svg v-else-if="item.icon === 'bar-chart'" class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {{ item.name }}
                      <!-- Badge -->
                      <span 
                        v-if="item.badge !== undefined && Number(item.badge) > 0"
                        class="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full"
                      >
                        {{ item.badge }}
                      </span>
                    </div>
                  </router-link>
                </div>
              </transition>
            </div>
          </template>
        </div>

        <!-- Desktop Auth Section -->
        <div class="hidden md:flex items-center space-x-3">
          <template v-if="isAuthenticated && isAdmin">
            <div class="relative dropdown-container">
              <button
                @click.stop="toggleProfileDropdown"
                @keydown.enter.stop="toggleProfileDropdown"
                @keydown.escape="isProfileDropdownOpen = false"
                class="flex items-center space-x-2 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-md transition-colors duration-200"
                :class="{ 'text-white': isProfileDropdownOpen }"
                :aria-expanded="isProfileDropdownOpen"
                aria-haspopup="true"
                aria-label="Menu administrateur"
              >
                <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <span class="text-sm font-medium text-white">
                    {{ user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'A' }}
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
                  class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                  role="menu"
                  aria-label="Menu de profil administrateur"
                >
                  <!-- User Info -->
                  <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ user?.username }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">Administrateur</p>
                  </div>

                  <!-- Menu Items -->
                  <router-link
                    v-for="item in profileMenuItems"
                    :key="item.name"
                    :to="item.to"
                    class="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    role="menuitem"
                    @click="closeAllMenus"
                  >
                    <div class="flex items-center">
                      <svg class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {{ item.name }}
                    </div>
                  </router-link>

                  <div class="border-t border-gray-100 dark:border-gray-700"></div>

                  <!-- Back to main site -->
                  <router-link
                    to="/"
                    class="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    role="menuitem"
                    @click="closeAllMenus"
                  >
                    <div class="flex items-center">
                      <svg class="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Retour au site
                    </div>
                  </router-link>

                  <div class="border-t border-gray-100 dark:border-gray-700"></div>

                  <!-- Logout -->
                  <button
                    @click="handleLogout"
                    class="block w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    role="menuitem"
                  >
                    <div class="flex items-center">
                      <svg class="h-4 w-4 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Déconnexion
                    </div>
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
            class="text-gray-300 hover:text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
            :aria-expanded="isMobileMenuOpen"
            aria-controls="mobile-menu"
            aria-label="Menu de navigation administrateur"
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
        class="md:hidden bg-gray-900" 
        role="menu" 
        aria-label="Menu mobile administrateur"
      >
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <template v-if="isAdmin">
            <!-- Mobile Direct Links -->
            <router-link
              v-for="item in adminNavItems.filter(i => !i.dropdown)"
              :key="item.name"
              :to="item.to!"
              class="text-gray-300 hover:text-white hover:bg-gray-800 block px-3 py-2.5 rounded-md text-base font-medium transition-colors duration-200"
              :class="{ 'bg-gray-800 text-white': isActiveRoute(item.to!) }"
              :aria-current="isActiveRoute(item.to!) ? 'page' : undefined"
              role="menuitem"
              @click="closeAllMenus"
            >
              {{ item.name }}
            </router-link>

            <!-- Mobile Users Dropdown -->
            <div class="border-t border-gray-800 pt-3 mt-3">
              <button
                @click.stop="toggleUsersDropdown"
                class="flex items-center justify-between w-full text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2.5 rounded-md text-base font-medium transition-colors duration-200"
                :class="{ 'bg-gray-800 text-white': isUsersDropdownOpen || isDropdownItemActive(adminNavItems.find(i => i.name === 'Utilisateurs')!.dropdown!) }"
                :aria-expanded="isUsersDropdownOpen"
                aria-haspopup="true"
              >
                <span>Utilisateurs</span>
                <svg 
                  class="h-4 w-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': isUsersDropdownOpen }" 
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
                enter-to-class="opacity-100 max-h-60"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 max-h-60"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="isUsersDropdownOpen" class="mt-1 overflow-hidden">
                  <router-link
                    v-for="item in adminNavItems.find(i => i.name === 'Utilisateurs')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block pl-6 pr-3 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md text-base font-medium transition-colors duration-200"
                    :class="{ 'bg-gray-800 text-white': isActiveRoute(item.to) }"
                    @click="closeAllMenus"
                  >
                    {{ item.name }}
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- Mobile Journalists Dropdown -->
            <div class="border-t border-gray-800 pt-3 mt-3">
              <button
                @click.stop="toggleJournalistsDropdown"
                class="flex items-center justify-between w-full text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2.5 rounded-md text-base font-medium transition-colors duration-200"
                :class="{ 'bg-gray-800 text-white': isJournalistsDropdownOpen || isDropdownItemActive(adminNavItems.find(i => i.name === 'Journalistes')!.dropdown!) }"
                :aria-expanded="isJournalistsDropdownOpen"
                aria-haspopup="true"
              >
                <span>Journalistes</span>
                <svg 
                  class="h-4 w-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': isJournalistsDropdownOpen }" 
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
                enter-to-class="opacity-100 max-h-60"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 max-h-60"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="isJournalistsDropdownOpen" class="mt-1 overflow-hidden">
                  <router-link
                    v-for="item in adminNavItems.find(i => i.name === 'Journalistes')?.dropdown?.items"
                    :key="item.name"
                    :to="item.to"
                    class="block pl-6 pr-3 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md text-base font-medium transition-colors duration-200"
                    :class="{ 'bg-gray-800 text-white': isActiveRoute(item.to) }"
                    @click="closeAllMenus"
                  >
                    <div class="flex items-center">
                      {{ item.name }}
                      <span 
                        v-if="item.badge !== undefined && Number(item.badge) > 0"
                        class="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full"
                      >
                        {{ item.badge }}
                      </span>
                    </div>
                  </router-link>
                </div>
              </transition>
            </div>
          </template>
        </div>

        <!-- Mobile Auth Section -->
        <div class="pt-4 pb-4 border-t border-gray-800 px-4 space-y-3">
          <template v-if="isAuthenticated && isAdmin">
            <!-- User Info -->
            <div class="flex items-center space-x-3 px-3">
              <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span class="text-sm font-medium text-white">
                  {{ user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'A' }}
                </span>
              </div>
              <div class="flex-1">
                <p class="text-gray-200 text-sm font-medium">{{ user?.username || user?.email?.split('@')[0] }}</p>
                <p class="text-gray-400 text-xs">Administrateur</p>
              </div>
            </div>

            <div class="border-t border-gray-800 pt-3">
              <router-link
                v-for="item in profileMenuItems"
                :key="item.name"
                :to="item.to"
                class="block text-gray-300 hover:text-white px-3 py-2.5 rounded-md text-base font-medium transition-colors duration-200"
                @click="closeAllMenus"
              >
                {{ item.name }}
              </router-link>
              
              <router-link
                to="/"
                class="block text-gray-300 hover:text-white px-3 py-2.5 rounded-md text-base font-medium transition-colors duration-200"
                @click="closeAllMenus"
              >
                Retour au site
              </router-link>
            </div>

            <button
              @click="handleLogout"
              class="block w-full text-center text-red-400 hover:text-red-300 px-4 py-2.5 rounded-md text-base font-medium transition-colors duration-200"
            >
              Déconnexion
            </button>
          </template>
        </div>
      </div>
    </transition>
  </nav>
</template>

<style scoped>
/* Additional scoped styles for the admin navigation */
.admin-nav {
  min-height: 64px;
}

/* Dark mode support via CSS custom properties */
@media (prefers-color-scheme: dark) {
  .admin-nav {
    background-color: #1a1a2e;
  }
}

/* Smooth transitions for dropdown menus */
.dropdown-menu-enter-active,
.dropdown-menu-leave-active {
  transition: all 0.15s ease-in-out;
}

.dropdown-menu-enter-from,
.dropdown-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Focus styles for accessibility */
button:focus-visible,
a:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Mobile menu animation */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.2s ease-in-out;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>