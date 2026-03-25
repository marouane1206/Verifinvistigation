import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'journalist' | 'admin'
  status: 'active' | 'pending' | 'rejected'
  created_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const emailConfirmationPending = ref(false)
  const forcePasswordChange = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isJournalist = computed(() => user.value?.role === 'journalist')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isStandardUser = computed(() => user.value?.role === 'user')
  
  // Status checking
  const isPending = computed(() => user.value?.status === 'pending')
  const isRejected = computed(() => user.value?.status === 'rejected')
  const isActive = computed(() => user.value?.status === 'active')
  
  // Check if user's email is confirmed
  async function isEmailConfirmed(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.error('[AUTH] Error checking email confirmation:', error)
        return false
      }
      return data?.user?.email_confirmed_at ? true : false
    } catch (e) {
      console.error('[AUTH] Error checking email confirmation:', e)
      return false
    }
  }

  async function initialize() {
    loading.value = true
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[AUTH] Session error:', sessionError)
      }
      
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
    } catch (e) {
      console.error('[AUTH] Error initializing auth:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchUserProfile(userId: string) {
    // First, let's check if the user exists in auth.users
    const { data: authData, error: authError } = await supabase.auth.getUser()
    
    // Handle JWT validation errors - token is malformed or expired
    if (authError?.message?.includes('invalid JWT') || authError?.message?.includes('token is malformed')) {
      console.warn('[AUTH] Invalid JWT detected, clearing corrupted session...')
      // Clear the corrupted session
      await supabase.auth.signOut()
      user.value = null
      console.log('[AUTH] Session cleared due to invalid JWT')
      return
    }
    
    if (authError) {
      console.error('[AUTH] Auth error:', authError)
      // If getUser fails for other reasons, still try to fetch profile
    }
    
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('[AUTH] Error fetching user profile:', fetchError)
      console.error('[AUTH] Error code:', fetchError.code)
      console.error('[AUTH] Error details:', fetchError.details)
      
      // Handle 406 error - profile might not exist, try to create it
      if (fetchError.code === '406' || fetchError.code === 'PGRST116') {
        console.warn('[AUTH] Profile not found, attempting to create it...')
        
        // Try to create the profile
        const email = authData?.user?.email || ''
        const username = authData?.user?.email?.split('@')[0] || 'user'
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            username,
            role: 'user',
          })
        
        if (insertError) {
          console.error('[AUTH] Failed to create profile:', insertError)
          return
        }
        
        // Fetch the newly created profile
        const { data: newData, error: newFetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (newFetchError) {
          console.error('[AUTH] Error fetching newly created profile:', newFetchError)
          return
        }
        
        if (newData) {
          // Ensure role has a valid value - fallback to 'user' if null/undefined
          const createdRole = newData.role || 'user'
          // Ensure status has a valid value - fallback to 'active' if null/undefined
          const createdStatus = newData.status || 'active'
          user.value = {
            id: newData.id,
            email: newData.email || email,
            username: newData.username,
            role: createdRole,
            status: createdStatus,
            created_at: newData.created_at,
          }
        }
        return
      }
      return
    }

    if (data) {
      // Ensure role has a valid value - fallback to 'user' if null/undefined
      const finalRole = data.role || 'user'
      // Ensure status has a valid value - fallback to 'active' if null/undefined
      const finalStatus = data.status || 'active'
      
      user.value = {
        id: data.id,
        // Get email from profile or fallback to auth
        email: data.email || authData?.user?.email || '',
        username: data.username,
        role: finalRole,
        status: finalStatus,
        created_at: data.created_at,
      }
      
      // Check and set force password change flag
      forcePasswordChange.value = data.force_password_change === true
    }
  }

  // Check user status from profile
  async function checkUserStatus(): Promise<'active' | 'pending' | 'rejected' | null> {
    if (!user.value) return null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.value.id)
        .single()
      
      if (fetchError) {
        console.error('[AUTH] Error checking user status:', fetchError)
        return null
      }
      
      return (data.status as 'active' | 'pending' | 'rejected') || 'active'
    } catch (e) {
      console.error('[AUTH] Error checking user status:', e)
      return null
    }
  }

  // Check if user can access journalist features
  function canAccessJournalistFeatures(): boolean {
    if (!user.value) return false
    return user.value.role === 'journalist' && user.value.status === 'active'
  }

  // Check if user needs to change their password
  async function checkForcePasswordChange(): Promise<boolean> {
    if (!user.value) return false
    
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('force_password_change')
        .eq('id', user.value.id)
        .single()
      
      if (fetchError) {
        console.error('[AUTH] Error checking force password change:', fetchError)
        return false
      }
      
      forcePasswordChange.value = data?.force_password_change === true
      return forcePasswordChange.value
    } catch (e) {
      console.error('[AUTH] Error checking force password change:', e)
      return false
    }
  }

  // Update user password and clear force password change flag
  async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!user.value) {
      return { success: false, error: 'User not authenticated' }
    }
    
    loading.value = true
    error.value = null
    
    try {
      // First, update the password in Supabase auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      
      if (authError) {
        const errMsg = authError.message.toLowerCase()
        
        if (errMsg.includes('password') && errMsg.includes('least') && errMsg.includes('6')) {
          error.value = 'Le mot de passe doit contenir au moins 6 caractères'
        } else if (errMsg.includes('password') && errMsg.includes('must contain')) {
          if (errMsg.includes('uppercase')) {
            error.value = 'Le mot de passe doit contenir au moins une majuscule'
          } else if (errMsg.includes('number')) {
            error.value = 'Le mot de passe doit contenir au moins un chiffre'
          } else if (errMsg.includes('special')) {
            error.value = 'Le mot de passe doit contenir au moins un caractère spécial'
          } else {
            error.value = 'Le mot de passe ne respecte pas les critères de sécurité'
          }
        } else if (errMsg.includes('recent') || errMsg.includes('too soon')) {
          error.value = 'Vous avez récemment changé votre mot de passe. Veuillez patienter avant de le changer à nouveau.'
        } else {
          error.value = 'Erreur lors de la mise à jour du mot de passe'
          console.error('[AUTH] Password update error:', authError.message)
        }
        return { success: false, error: error.value }
      }
      
      // Then, update the profiles table to clear the force_password_change flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          force_password_change: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq('id', user.value.id)
      
      if (profileError) {
        console.error('[AUTH] Error updating profile force_password_change:', profileError)
        // Password was updated in auth, but profile update failed
        // Still return success but log the error
      }
      
      // Update local state
      forcePasswordChange.value = false
      
      return { success: true }
    } catch (e: any) {
      console.error('[AUTH] Unexpected password update error:', e)
      error.value = 'Une erreur inattendue est survenue lors de la mise à jour du mot de passe'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Clear force password change flag directly (useful if password changed through other means)
  async function clearForcePasswordChange(): Promise<boolean> {
    if (!user.value) return false
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          force_password_change: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq('id', user.value.id)
      
      if (updateError) {
        console.error('[AUTH] Error clearing force password change:', updateError)
        return false
      }
      
      forcePasswordChange.value = false
      return true
    } catch (e) {
      console.error('[AUTH] Error clearing force password change:', e)
      return false
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
        // Map specific error messages to user-friendly French messages
        const errMsg = authError.message.toLowerCase()
        
        if (errMsg.includes('invalid login') || errMsg.includes('invalid credentials') || errMsg.includes('invalid email or password')) {
          error.value = 'Email ou mot de passe incorrect'
        } else if (errMsg.includes('user not confirmed')) {
          error.value = 'Veuillez confirmer votre email avant de vous connecter'
        } else if (errMsg.includes('too many requests')) {
          error.value = 'Trop de tentatives. Veuillez patienter quelques instants'
        } else if (errMsg.includes('email not confirmed')) {
          error.value = 'Veuillez confirmer votre email avant de vous connecter'
        } else {
          // For any other errors, provide a French user-friendly message
          error.value = 'Une erreur est survenue lors de la connexion. Veuillez réessayer.'
          console.error('[AUTH] Login error:', authError.message)
        }
        return false
      }

      if (data.user) {
        // Check if user's email is confirmed before allowing login
        const isConfirmed = await isEmailConfirmed()
        if (!isConfirmed) {
          // Sign out the user since their email is not confirmed
          await supabase.auth.signOut()
          user.value = null
          error.value = 'Veuillez confirmer votre email avant de vous connecter'
          return false
        }
        
        await fetchUserProfile(data.user.id)
        return true
      }
      return false
    } catch (e: any) {
      // Catch any unexpected errors and translate to French
      console.error('[AUTH] Unexpected login error:', e)
      error.value = 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string, username: string, isJournalist: boolean = false) {
    loading.value = true
    error.value = null
    emailConfirmationPending.value = false // Reset the flag
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            // Ensure is_journalist is sent as a string for the database trigger
            is_journalist: isJournalist ? 'true' : 'false',
          },
        },
      })

      // Check specifically for 429 rate limit error
      if (authError && authError.status === 429) {
        error.value = 'Trop de demandes. Veuillez patienter quelques instants avant de réessayer.'
        return false
      }

      if (authError) {
        const errorMsg = authError.message.toLowerCase()
        
        // Check for various password-related error messages
        if (errorMsg.includes('password') && errorMsg.includes('least') && errorMsg.includes('6')) {
          error.value = 'Le mot de passe doit contenir au moins 6 caractères'
        } else if (errorMsg.includes('password') && errorMsg.includes('must contain')) {
          // Handle other Supabase password requirements
          if (errorMsg.includes('uppercase')) {
            error.value = 'Le mot de passe doit contenir au moins une majuscule'
          } else if (errorMsg.includes('number')) {
            error.value = 'Le mot de passe doit contenir au moins un chiffre'
          } else if (errorMsg.includes('special')) {
            error.value = 'Le mot de passe doit contenir au moins un caractère spécial'
          } else {
            error.value = 'Le mot de passe ne respecte pas les critères de sécurité'
          }
        } else if (errorMsg.includes('email') && (errorMsg.includes('already') || errorMsg.includes('exists') || errorMsg.includes('taken'))) {
          error.value = 'Cet email est déjà utilisé'
        } else if (errorMsg.includes('invalid email') || errorMsg.includes('invalid format')) {
          error.value = 'Format d\'email invalide'
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
          error.value = 'Trop de demandes. Veuillez patienter quelques instants avant de réessayer.'
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          error.value = 'Erreur de connexion. Veuillez vérifier votre connexion internet.'
        } else {
          // For any other errors, provide a French user-friendly message
          error.value = 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.'
          console.error('[AUTH] Registration error:', authError.message)
        }
        return false
      }

      if (data.user) {
        // Note: Profile is automatically created by the database trigger 
        // handle_new_user() based on is_journalist metadata
        // We just need to fetch the created profile to get the correct role
        
        // Wait a moment for the trigger to complete, then fetch the profile
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          console.error('[AUTH] Error fetching profile:', profileError)
        }

        const userRole = profileData?.role || (isJournalist ? 'journalist' : 'user')
        
        // Check if email confirmation is required
        
        // Check if email confirmation is required
        // If data.session is null, it means email confirmation is required
        if (!data.session) {
          // Email confirmation is required - don't log the user in
          user.value = null
          emailConfirmationPending.value = true
          // The user will need to confirm their email before logging in
          return true // Return true but don't set user - the UI will show a success message
        }
        
        user.value = {
          id: data.user.id,
          email: data.user.email!,
          username,
          role: userRole,
          status: profileData?.status || (isJournalist ? 'pending' : 'active'),
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

  async function updateUsername(newUsername: string) {
    if (!user.value) return
    
    loading.value = true
    error.value = null
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', user.value.id)

      if (updateError) {
        const errMsg = updateError.message.toLowerCase()
        if (errMsg.includes('unique') || errMsg.includes('already exists')) {
          error.value = 'Ce nom d\'utilisateur est déjà pris'
        } else if (errMsg.includes('network') || errMsg.includes('fetch')) {
          error.value = 'Erreur de connexion. Veuillez vérifier votre connexion internet.'
        } else {
          error.value = 'Erreur lors de la mise à jour du nom d\'utilisateur'
        }
        return
      }

      user.value.username = newUsername
    } catch (e) {
      error.value = 'Erreur lors de la mise à jour du nom d\'utilisateur'
    } finally {
      loading.value = false
    }
  }

  async function deleteAccount() {
    if (!user.value) return
    
    loading.value = true
    error.value = null
    try {
      // Delete user profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.value.id)

      if (profileError) {
        const errMsg = profileError.message.toLowerCase()
        if (errMsg.includes('network') || errMsg.includes('fetch')) {
          error.value = 'Erreur de connexion. Veuillez vérifier votre connexion internet.'
        } else {
          error.value = 'Erreur lors de la suppression du compte'
        }
        return
      }

      // Note: Full user deletion requires admin privileges or the user to be logged in
      // For now, we just delete the profile and sign out
      // In production, you'd need to call a backend function or use admin API
      await supabase.auth.signOut()
      user.value = null
    } catch (e) {
      error.value = 'Erreur lors de la suppression du compte'
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    emailConfirmationPending,
    forcePasswordChange,
    isAuthenticated,
    isJournalist,
    isAdmin,
    isStandardUser,
    isPending,
    isRejected,
    isActive,
    initialize,
    login,
    register,
    logout,
    updateUsername,
    deleteAccount,
    isEmailConfirmed,
    checkUserStatus,
    canAccessJournalistFeatures,
    checkForcePasswordChange,
    updatePassword,
    clearForcePasswordChange,
  }
})