import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Import views (will be created later)
const HomeView = () => import('../views/HomeView.vue')
const LoginView = () => import('../views/LoginView.vue')
const RegisterView = () => import('../views/RegisterView.vue')
const JournalistRegisterView = () => import('../views/JournalistRegisterView.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const ReportFormView = () => import('../views/ReportFormView.vue')
const JournalistDashboardView = () => import('../views/JournalistDashboardView.vue')
const JournalistPendingView = () => import('../views/JournalistPendingView.vue')
const JournalistVerifyView = () => import('../views/JournalistVerifyView.vue')
const InvestigationDetailsView = () => import('../views/InvestigationDetailsView.vue')
const SettingsView = () => import('../views/SettingsView.vue')

// Admin views
const AdminDashboardView = () => import('../views/AdminDashboardView.vue')
const AdminUsersView = () => import('../views/AdminUsersView.vue')
const AdminReportsView = () => import('../views/AdminReportsView.vue')
const AdminInvestigationsView = () => import('../views/AdminInvestigationsView.vue')
const AdminMediaView = () => import('../views/AdminMediaView.vue')
const AdminLoginView = () => import('../views/AdminLoginView.vue')
const AdminJournalistApplicationsView = () => import('../views/AdminJournalistApplicationsView.vue')

// Journalist application status view
const JournalistApplicationStatusView = () => import('../views/JournalistApplicationStatusView.vue')

export type RouteRole = 'public' | 'auth' | 'user' | 'journalist' | 'admin'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { role: 'public' as RouteRole },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { role: 'public' as RouteRole },
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { role: 'public' as RouteRole },
  },
  {
    path: '/journalistes/register',
    name: 'journalist-register',
    component: JournalistRegisterView,
    meta: { role: 'public' as RouteRole },
  },
  {
    path: '/users/dashboard',
    name: 'user-dashboard',
    component: DashboardView,
    meta: { role: 'user' as RouteRole },
  },
  {
    path: '/journalistes/dashboard',
    name: 'journalist-dashboard',
    component: JournalistDashboardView,
    meta: { role: 'journalist' as RouteRole },
  },
  {
    path: '/journalistes/application-status',
    name: 'journalist-application-status',
    component: JournalistApplicationStatusView,
    meta: { role: 'auth' as RouteRole },
  },
  // Public route for one-click approval from email
  {
    path: '/approve-journalist',
    name: 'approve-journalist',
    component: JournalistApplicationStatusView,
    meta: { role: 'public' as RouteRole },
  },
  {
    path: '/signaler/:type?',
    name: 'report-form',
    component: ReportFormView,
    meta: { role: 'auth' as RouteRole },
  },
  {
    path: '/verifier/:type?',
    name: 'verify',
    component: ReportFormView,
    meta: { role: 'auth' as RouteRole },
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { role: 'auth' as RouteRole },
  },
  {
    path: '/journaliste/pending',
    name: 'journalist-pending',
    component: JournalistPendingView,
    meta: { role: 'journalist' as RouteRole },
  },
  {
    path: '/journaliste/verify',
    name: 'journalist-verify',
    component: JournalistVerifyView,
    meta: { role: 'journalist' as RouteRole },
  },
  {
    path: '/journaliste/verify/pending',
    name: 'journalist-verify-pending',
    component: JournalistPendingView,
    meta: { role: 'journalist' as RouteRole },
  },
  {
    path: '/journaliste/verify/verify',
    name: 'journalist-verify-verify',
    component: JournalistVerifyView,
    meta: { role: 'journalist' as RouteRole },
  },
  {
    path: '/investigation/:id',
    name: 'investigation-details',
    component: InvestigationDetailsView,
    meta: { role: 'auth' as RouteRole },
  },
  // Redirect legacy routes
  { path: '/dashboard', redirect: '/users/dashboard' },
  { path: '/report', redirect: '/signaler' },
  { path: '/journalist', redirect: '/journalistes/dashboard' },
  // Static pages
  {
    path: '/legal',
    name: 'legal',
    component: HomeView,
    meta: { role: 'public' as RouteRole },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: HomeView,
    meta: { role: 'public' as RouteRole },
  },
  {
    path: '/contact',
    name: 'contact',
    component: HomeView,
    meta: { role: 'public' as RouteRole },
  },
  // Admin routes
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLoginView,
    meta: { role: 'public' as RouteRole },
  },
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: AdminDashboardView,
    meta: { role: 'admin' as RouteRole },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: AdminUsersView,
    meta: { role: 'admin' as RouteRole },
  },
  {
    path: '/admin/users/reports',
    name: 'admin-users-reports',
    component: AdminReportsView,
    meta: { role: 'admin' as RouteRole },
  },
  {
    path: '/admin/users/investigations',
    name: 'admin-users-investigations',
    component: AdminInvestigationsView,
    meta: { role: 'admin' as RouteRole },
  },
  {
    path: '/admin/users/media',
    name: 'admin-users-media',
    component: AdminMediaView,
    meta: { role: 'admin' as RouteRole },
  },
  // Additional User Management routes
  {
    path: '/admin/users/create',
    name: 'admin-users-create',
    component: AdminUsersView,
    meta: { role: 'admin' as RouteRole },
  },
  // Journalist Management routes
  {
    path: '/admin/journalists',
    name: 'admin-journalists',
    component: AdminUsersView,
    meta: { role: 'admin' as RouteRole },
  },
  // Admin user profile editing route
  {
    path: '/admin/user/:id/edit',
    name: 'admin-user-edit',
    component: SettingsView,
    meta: { role: 'admin' as RouteRole },
  },
  {
    path: '/admin/journalists/media',
    name: 'admin-journalists-media',
    component: AdminMediaView,
    meta: { role: 'admin' as RouteRole },
  },
  {
    path: '/admin/journalists/approvals',
    name: 'admin-journalists-approvals',
    component: AdminJournalistApplicationsView,
    meta: { role: 'admin' as RouteRole },
  },
  {
    path: '/admin/reports',
    name: 'admin-reports',
    component: AdminReportsView,
    meta: { role: 'admin' as RouteRole },
  },
  {
    path: '/admin/investigations',
    name: 'admin-investigations',
    component: AdminInvestigationsView,
    meta: { role: 'admin' as RouteRole },
  },
  {
    path: '/admin/settings',
    name: 'admin-settings',
    component: SettingsView,
    meta: { role: 'admin' as RouteRole },
  },
]

const router = createRouter({
  history: createWebHashHistory('/Verifinvistigation/'),
  routes,
})

// Navigation guards
router.beforeEach(async (to, _from) => {
  const authStore = useAuthStore()
  
  // Initialize auth if not done yet
  if (!authStore.user && !authStore.loading) {
    await authStore.initialize()
  }

  // Handle legacy /dashboard route - redirect based on user role
  if (to.path === '/dashboard') {
    if (!authStore.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (authStore.isJournalist) {
      return { name: 'journalist-dashboard' }
    }
    return { name: 'user-dashboard' }
  }

  const requiredRole = to.meta.role as RouteRole

  if (requiredRole === 'public') {
    return true
  }

  if (requiredRole === 'auth') {
    if (!authStore.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    // Additional check: verify email is confirmed for authenticated users
    // This handles the case where user might have a session but email not confirmed
    const isConfirmed = await authStore.isEmailConfirmed()
    if (!isConfirmed) {
      // User is logged in but email not confirmed - redirect to login with message
      return { name: 'login', query: { redirect: to.fullPath, unconfirmed: '1' } }
    }
    return true
  }

  // Handle 'user' role - standard authenticated users
  if (requiredRole === 'user') {
    if (!authStore.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    // Standard users cannot access journalist routes - redirect to their dashboard
    if (authStore.isJournalist) {
      return { name: 'journalist-dashboard' }
    }
    // Check email confirmation
    const isConfirmed = await authStore.isEmailConfirmed()
    if (!isConfirmed) {
      return { name: 'login', query: { redirect: to.fullPath, unconfirmed: '1' } }
    }
    return true
  }

  if (requiredRole === 'journalist') {
    if (!authStore.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    // Check if user has journalist role (not admin, not standard user)
    // Use isJournalist computed property which handles undefined role safely
    if (!authStore.isJournalist) {
      // Non-journalist users trying to access journalist route should go to their dashboard
      return { name: 'user-dashboard' }
    }
    // Check email confirmation for journalist role
    const isConfirmed = await authStore.isEmailConfirmed()
    if (!isConfirmed) {
      return { name: 'login', query: { unconfirmed: '1' } }
    }
    return true
  }

  if (requiredRole === 'admin') {
    // First check if user is authenticated at all
    if (!authStore.isAuthenticated) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
    // Then check if user has admin role
    if (!authStore.isAdmin) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
    // Check email confirmation for admin role
    const isConfirmed = await authStore.isEmailConfirmed()
    if (!isConfirmed) {
      return { name: 'admin-login', query: { redirect: to.fullPath, unconfirmed: '1' } }
    }
    return true
  }

  return true
})

export default router