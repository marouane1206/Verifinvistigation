import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Import views (will be created later)
const HomeView = () => import('../views/HomeView.vue')
const LoginView = () => import('../views/LoginView.vue')
const RegisterView = () => import('../views/RegisterView.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const ReportFormView = () => import('../views/ReportFormView.vue')
const JournalistDashboardView = () => import('../views/JournalistDashboardView.vue')
const InvestigationDetailsView = () => import('../views/InvestigationDetailsView.vue')

export type RouteRole = 'public' | 'auth' | 'journalist' | 'admin'

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
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { role: 'auth' as RouteRole },
  },
  {
    path: '/signaler',
    name: 'report-form',
    component: ReportFormView,
    meta: { role: 'auth' as RouteRole },
  },
  {
    path: '/journaliste',
    name: 'journalist-dashboard',
    component: JournalistDashboardView,
    meta: { role: 'journalist' as RouteRole },
  },
  {
    path: '/investigation/:id',
    name: 'investigation-details',
    component: InvestigationDetailsView,
    meta: { role: 'auth' as RouteRole },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  
  // Initialize auth if not done yet
  if (!authStore.user && !authStore.loading) {
    await authStore.initialize()
  }

  const requiredRole = to.meta.role as RouteRole

  if (requiredRole === 'public') {
    next()
    return
  }

  if (requiredRole === 'auth') {
    if (!authStore.isAuthenticated) {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }
    next()
    return
  }

  if (requiredRole === 'journalist') {
    if (!authStore.isJournalist) {
      next({ name: 'dashboard' })
      return
    }
    next()
    return
  }

  if (requiredRole === 'admin') {
    if (!authStore.isAdmin) {
      next({ name: 'dashboard' })
      return
    }
    next()
    return
  }

  next()
})

export default router