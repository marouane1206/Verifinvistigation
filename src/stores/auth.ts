import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'journalist' | 'admin'
  created_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isJournalist = computed(() => 
    user.value?.role === 'journalist' || user.value?.role === 'admin'
  )
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function initialize() {
    loading.value = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
    } catch (e) {
      console.error('Error initializing auth:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchUserProfile(userId: string) {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching user profile:', fetchError)
      return
    }

    if (data) {
      user.value = {
        id: data.id,
        email: data.email,
        username: data.username,
        role: data.role,
        created_at: data.created_at,
      }
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        error.value = authError.message
        return false
      }

      if (data.user) {
        await fetchUserProfile(data.user.id)
        return true
      }
      return false
    } catch (e) {
      error.value = 'Une erreur est survenue lors de la connexion'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string, username: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      })

      if (authError) {
        error.value = authError.message
        return false
      }

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username,
            role: 'user',
          })

        if (profileError) {
          error.value = 'Erreur lors de la création du profil'
          return false
        }

        user.value = {
          id: data.user.id,
          email: data.user.email!,
          username,
          role: 'user',
          created_at: new Date().toISOString(),
        }
        return true
      }
      return false
    } catch (e) {
      error.value = 'Une erreur est survenue lors de l\'inscription'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    try {
      await supabase.auth.signOut()
      user.value = null
    } catch (e) {
      console.error('Error logging out:', e)
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isJournalist,
    isAdmin,
    initialize,
    login,
    register,
    logout,
  }
})