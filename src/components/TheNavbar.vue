<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isMenuOpen = ref(false)
const isProfileDropdownOpen = ref(false)

// Separate dropdown states for each admin category
const isDashboardDropdownOpen = ref(false)
const isUsersDropdownOpen = ref(false)
const isJournalistDropdownOpen = ref(false)

// Use auth store directly instead of props
const user = computed(() => authStore.user)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isJournalist = computed(() => authStore.isJournalist)
const isAdmin = computed(() => authStore.isAdmin)

// Navigation items based on authentication and role
type UserRole = 'user' | 'journalist' | 'admin'

interface NavItem {
  name: string
  to: string
  requiresAuth: boolean
  roles: UserRole[]
}

const navigation = computed<NavItem[]>(() => {
  const items: NavItem[] = []

  // Regular user items - visible to authenticated users only (NOT admins)
  if (isAuthenticated.value && !isAdmin.value) {
    items.push(
      { name: 'Tableau de bord', to: '/users/dashboard', requiresAuth: true, roles: ['user', 'journalist'] },
      { name: 'Signaler', to: '/signaler', requiresAuth: true, roles: ['user', 'journalist'] },
      { name: 'Verifier', to: '/verifier', requiresAuth: true, roles: ['user', 'journalist'] }
    )
  }

  // Journalist items - visible to journalists only (not admins)
  if (isJournalist.value && !isAdmin.value) {
    items.push(
      { name: 'Espace Journaliste', to: '/journalistes/dashboard', requiresAuth: true, roles: ['journalist'] },
      { name: 'Signalements en attente', to: '/journaliste/pending', requiresAuth: true, roles: ['journalist'] },
      { name: 'Vérifier les signalements', to: '/journaliste/verify', requiresAuth: true, roles: ['journalist'] }
    )
  }

  return items
})

// Admin navigation categories with dropdown
const adminCategories = computed(() => {
  if (!isAdmin.value) return []
  
  return [
    {
      name: 'Tableau de bord',
      icon: 'dashboard',
      items: [
        { name: 'Tableau de bord admin', to: '/admin', requiresAuth: true, roles: ['admin'] }
      ]
    },
    {
      name: 'Espace Journaliste',
      icon: 'journalist',
      items: [
        { name: 'Journalistes', to: '/admin/journalists', requiresAuth: true, roles: ['admin'] },
        { name: 'Signalement', to: '/journaliste/reports', requiresAuth: true, roles: ['admin'] },
        { name: 'Verification', to: '/journaliste/investigations', requiresAuth: true, roles: ['admin'] },
        { name: 'Medias', to: '/journaliste/media', requiresAuth: true, roles: ['admin'] }
      ]
    },
    {
      name: 'Espace Utilisateur',
      icon: 'users',
      items: [
        { name: 'Utilisateurs', to: '/admin/users', requiresAuth: true, roles: ['admin'] },
        { name: 'Signalements', to: '/admin/users/reports', requiresAuth: true, roles: ['admin'] },
        { name: 'Vérification', to: '/admin/users/investigations', requiresAuth: true, roles: ['admin'] },
        { name: 'Médias Utilisateurs', to: '/admin/users/media', requiresAuth: true, roles: ['admin'] }
      ]
    }
  ]
})
const filteredNav = computed(() => {
  return navigation.value.filter(item => {
    // If item has role restrictions, check if user has one of those roles
    if (item.roles.length > 0) {
      const userRole = user.value?.role as UserRole | undefined
      return userRole ? item.roles.includes(userRole) : false
    }
    return true
  })
})

// User dropdown menu items based on role
const userMenuItems = computed(() => {
  const items = [
    { name: 'Paramètres', to: '/settings', icon: 'settings' },
  ]

  // Add journalist link for journalists
  if (isJournalist.value && !isAdmin.value) {
    items.push({ name: 'Espace Journaliste', to: '/journalistes/dashboard', icon: 'journalist' })
  }

  return items
})

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value) {
    isProfileDropdownOpen.value = false
    closeAllAdminDropdowns()
  }
}

function toggleProfileDropdown() {
  isProfileDropdownOpen.value = !isProfileDropdownOpen.value
  if (isProfileDropdownOpen.value) {
    closeAllAdminDropdowns()
  }
}

// Toggle functions for each admin category dropdown
function toggleDashboardDropdown() {
  isDashboardDropdownOpen.value = !isDashboardDropdownOpen.value
  if (isDashboardDropdownOpen.value) {
    isProfileDropdownOpen.value = false
    closeOtherAdminDropdowns('dashboard')
  }
}

function toggleUsersDropdown() {
  isUsersDropdownOpen.value = !isUsersDropdownOpen.value
  if (isUsersDropdownOpen.value) {
    isProfileDropdownOpen.value = false
    closeOtherAdminDropdowns('users')
  }
}

function toggleJournalistDropdown() {
  isJournalistDropdownOpen.value = !isJournalistDropdownOpen.value
  if (isJournalistDropdownOpen.value) {
    isProfileDropdownOpen.value = false
    closeOtherAdminDropdowns('journalist')
  }
}


function closeAllAdminDropdowns() {
  isDashboardDropdownOpen.value = false
  isUsersDropdownOpen.value = false
  isJournalistDropdownOpen.value = false
}

function closeOtherAdminDropdowns(exclude: string) {
  if (exclude !== 'dashboard') isDashboardDropdownOpen.value = false
  if (exclude !== 'users') isUsersDropdownOpen.value = false
  if (exclude !== 'journalist') isJournalistDropdownOpen.value = false
}

async function handleLogout() {
  isProfileDropdownOpen.value = false
  isMenuOpen.value = false
  await authStore.logout()
  router.push('/')
}

function closeMenus() {
  isMenuOpen.value = false
  isProfileDropdownOpen.value = false
  closeAllAdminDropdowns()
}

// Close dropdowns when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.dropdown-container')) {
    isProfileDropdownOpen.value = false
    closeAllAdminDropdowns()
  }
}

// Watch for auth state changes to close menus
watch(isAuthenticated, (newVal, oldVal) => {
  if (oldVal !== newVal) {
    closeMenus()
  }
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <nav class="bg-nuit-700 shadow-lg sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- Logo -->
        <div class="shrink-0 flex items-center">
          <router-link to="/" class="flex items-center space-x-2" @click="closeMenus">
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span class="text-white font-bold text-xl">Verifinvestigation</span>
          </router-link>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-2">
          <!-- Regular navigation items -->
          <router-link
            v-for="item in filteredNav"
            :key="item.name"
            :to="item.to"
            class="text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            :class="{ 'bg-nuit-600 text-white': $route.path === item.to }"
            @click="closeMenus"
          >
            {{ item.name }}
          </router-link>

          <!-- Admin Dashboard Dropdown -->
          <div v-if="isAdmin" class="relative dropdown-container">
            <button
              @click.stop="toggleDashboardDropdown"
              class="flex items-center text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              :class="{ 'bg-nuit-600 text-white': isDashboardDropdownOpen }"
            >
              <svg class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Tableau de bord
              <svg class="h-4 w-4 ml-1 transition-transform duration-200" :class="{ 'rotate-180': isDashboardDropdownOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div v-if="isDashboardDropdownOpen" class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <router-link
                  v-for="item in adminCategories[0].items"
                  :key="item.name"
                  :to="item.to"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                  :class="{ 'bg-blue-50 text-blue-600': $route.path === item.to }"
                  @click="closeMenus"
                >
                  {{ item.name }}
                </router-link>
              </div>
            </transition>
          </div>

          <!-- Admin Journaliste Dropdown -->
          <div v-if="isAdmin" class="relative dropdown-container">
            <button
              @click.stop="toggleUsersDropdown"
              class="flex items-center text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              :class="{ 'bg-nuit-600 text-white': isUsersDropdownOpen }"
            >
              <svg class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Espace Journaliste
              <svg class="h-4 w-4 ml-1 transition-transform duration-200" :class="{ 'rotate-180': isUsersDropdownOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div v-if="isUsersDropdownOpen" class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <router-link
                  v-for="item in adminCategories[1].items"
                  :key="item.name"
                  :to="item.to"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                  :class="{ 'bg-blue-50 text-blue-600': $route.path === item.to }"
                  @click="closeMenus"
                >
                  {{ item.name }}
                </router-link>
              </div>
            </transition>
          </div>

          <!-- Admin Espace Utilisateur Dropdown -->
          <div v-if="isAdmin" class="relative dropdown-container">
            <button
              @click.stop="toggleJournalistDropdown"
              class="flex items-center text-nuit-100 hover:text-white hover:bg-nuit-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              :class="{ 'bg-nuit-600 text-white': isJournalistDropdownOpen }"
            >
              <svg class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Espace Utilisateur
              <svg class="h-4 w-4 ml-1 transition-transform duration-200" :class="{ 'rotate-180': isJournalistDropdownOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div v-if="isJournalistDropdownOpen" class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <router-link
                  v-for="item in adminCategories[2].items"
                  :key="item.name"
                  :to="item.to"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                  :class="{ 'bg-blue-50 text-blue-600': $route.path === item.to }"
                  @click="closeMenus"
                >
                  {{ item.name }}
                </router-link>
              </div>
            </transition>
          </div>
        </div>


        <!-- Desktop Auth Section -->
        <div class="hidden md:flex items-center space-x-3">
          <!-- Not authenticated - Show Login/Register -->
          <template v-if="!isAuthenticated">
            <router-link
              to="/login"
              class="text-nuit-100 hover:text-white hover:bg-nuit-600 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Connexion
            </router-link>
            <router-link
              to="/register"
              class="bg-white text-nuit-700 hover:bg-nuit-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Inscription
            </router-link>
          </template>

          <!-- Authenticated - Show User Menu -->
          <template v-else>
            <!-- User Dropdown -->
            <div class="relative dropdown-container">
              <button
                @click.stop="toggleProfileDropdown"
                class="flex items-center space-x-2 text-nuit-100 hover:text-white focus:outline-none transition-colors duration-200"
                :class="{ 'text-white': isProfileDropdownOpen }"
              >
                <div class="w-8 h-8 rounded-full bg-nuit-500 flex items-center justify-center">
                  <span class="text-sm font-medium text-white">
                    {{ user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U' }}
                  </span>
                </div>
                <span class="text-sm font-medium hidden lg:block">{{ user?.username || user?.email?.split('@')[0] }}</span>
                <svg class="h-4 w-4 transition-transform duration-200" :class="{ 'rotate-180': isProfileDropdownOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown Menu -->
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
                    @click="closeMenus"
                  >
                    {{ item.name }}
                  </router-link>

                  <div class="border-t border-gray-100"></div>

                  <!-- Logout -->
                  <button
                    @click="handleLogout"
                    class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors duration-150"
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
            @click="toggleMenu"
            class="text-nuit-100 hover:text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors duration-200"
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
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="isMenuOpen" class="md:hidden bg-nuit-700">
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <router-link
            v-for="item in filteredNav"
            :key="item.name"
            :to="item.to"
            class="text-nuit-100 hover:text-white hover:bg-nuit-600 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            :class="{ 'bg-nuit-600 text-white': $route.path === item.to }"
            @click="closeMenus"
          >
            {{ item.name }}
          </router-link>

          <!-- Mobile Admin Categories -->
          <div v-if="isAdmin" class="border-t border-nuit-600 pt-3 mt-3">
            <div class="px-3 py-2 text-xs font-semibold text-nuit-300 uppercase tracking-wider">
              Administration
            </div>
            <template v-for="category in adminCategories" :key="category.name">
              <div class="px-3 py-1 text-xs font-medium text-nuit-400">
                {{ category.name }}
              </div>
              <router-link
                v-for="item in category.items"
                :key="item.name"
                :to="item.to"
                class="block pl-6 pr-3 py-2 text-nuit-100 hover:text-white hover:bg-nuit-600 rounded-md text-base font-medium transition-colors duration-200"
                :class="{ 'bg-nuit-600 text-white': $route.path === item.to }"
                @click="closeMenus"
              >
                {{ item.name }}
              </router-link>
            </template>
          </div>
        </div>

        <!-- Mobile Auth Section -->
        <div class="pt-4 pb-4 border-t border-nuit-600 px-4 space-y-3">
          <template v-if="!isAuthenticated">
            <router-link
              to="/login"
              class="block w-full text-center text-nuit-100 hover:text-white px-4 py-2 rounded-md text-base font-medium transition-colors duration-200"
              @click="closeMenus"
            >
              Connexion
            </router-link>
            <router-link
              to="/register"
              class="block w-full text-center bg-white text-nuit-700 hover:bg-nuit-50 px-4 py-2 rounded-md text-base font-medium transition-colors duration-200"
              @click="closeMenus"
            >
              Inscription
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
                <p class="text-nuit-200 text-xs capitalize">{{ user?.role === 'admin' ? 'Administrateur' : user?.role === 'journalist' ? 'Journaliste' : 'Utilisateur' }}</p>
              </div>
            </div>

            <div class="border-t border-nuit-600 pt-3">
              <router-link
                v-for="item in userMenuItems"
                :key="item.name"
                :to="item.to"
                class="block text-nuit-100 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                @click="closeMenus"
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
