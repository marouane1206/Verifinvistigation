import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'

// Edge function URL for sending email notifications
const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-journalist-application-notification`
  : null

// Edge function URL for sending status notification emails
const STATUS_NOTIFICATION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-journalist-status-notification`
  : null

export interface JournalistApplication {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  media_outlet: string
  journalist_id_number: string | null
  years_experience: number | null
  specialization: string | null
  portfolio_url: string | null
  previous_work_samples: string | null
  motivation: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ApplicationData {
  full_name: string
  email: string
  phone?: string
  media_outlet: string
  journalist_id_number?: string
  years_experience?: number
  specialization?: string
  portfolio_url?: string
  previous_work_samples?: string
  motivation: string
}

export const useApplicationsStore = defineStore('applications', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentApplication = ref<JournalistApplication | null>(null)
  const allApplications = ref<JournalistApplication[]>([])

  // Computed properties
  const hasApplication = computed(() => !!currentApplication.value)
  const isPending = computed(() => currentApplication.value?.status === 'pending')
  const isApproved = computed(() => currentApplication.value?.status === 'approved')
  const isRejected = computed(() => currentApplication.value?.status === 'rejected')

  /**
   * Send email notification to admin when a new journalist application is submitted
   */
  async function sendEmailNotification(application: JournalistApplication): Promise<boolean> {
    if (!EDGE_FUNCTION_URL) {
      console.log('[Applications] Edge function URL not configured, skipping email notification')
      return false
    }

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({
          id: application.id,
          user_id: application.user_id,
          full_name: application.full_name,
          email: application.email,
          phone: application.phone,
          media_outlet: application.media_outlet,
          journalist_id_number: application.journalist_id_number,
          years_experience: application.years_experience,
          specialization: application.specialization,
          portfolio_url: application.portfolio_url,
          previous_work_samples: application.previous_work_samples,
          motivation: application.motivation,
          created_at: application.created_at
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Applications] Email notification error:', errorData)
        return false
      }

      const result = await response.json()
      console.log('[Applications] Email notification sent:', result)
      return true
    } catch (error) {
      console.error('[Applications] Failed to send email notification:', error)
      return false
    }
  }

  /**
   * Submit a new journalist application
   */
  async function submitApplication(data: ApplicationData): Promise<boolean> {
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      error.value = 'Vous devez être connecté pour soumettre une demande'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const { data: applicationData, error: insertError } = await supabase
        .from('journalist_applications')
        .insert({
          user_id: authStore.user.id,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          media_outlet: data.media_outlet,
          journalist_id_number: data.journalist_id_number || null,
          years_experience: data.years_experience || null,
          specialization: data.specialization || null,
          portfolio_url: data.portfolio_url || null,
          previous_work_samples: data.previous_work_samples || null,
          motivation: data.motivation,
          status: 'pending',
        })
        .select()
        .single()

      if (insertError) {
        console.error('[Applications] Insert error:', insertError)
        error.value = 'Erreur lors de la soumission de la demande'
        return false
      }

      currentApplication.value = applicationData
      
      // Send email notification to admin
      if (applicationData && EDGE_FUNCTION_URL) {
        const emailSent = await sendEmailNotification(applicationData)
        if (!emailSent) {
          console.warn('[Applications] Email notification failed - admin may not receive application alert')
        }
      }
      
      return true
    } catch (e: any) {
      console.error('[Applications] Unexpected error:', e)
      error.value = 'Une erreur inattendue est survenue'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Get the current user's application
   */
  async function getMyApplication(): Promise<JournalistApplication | null> {
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      currentApplication.value = null
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('journalist_applications')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No application found
          currentApplication.value = null
          return null
        }
        console.error('[Applications] Fetch error:', fetchError)
        error.value = 'Erreur lors de la récupération de la demande'
        return null
      }

      currentApplication.value = data
      return data
    } catch (e: any) {
      console.error('[Applications] Unexpected error:', e)
      error.value = 'Une erreur inattendue est survenue'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Check application status - returns 'pending', 'approved', 'rejected', or null
   */
  async function checkApplicationStatus(): Promise<'pending' | 'approved' | 'rejected' | null> {
    const application = await getMyApplication()
    
    if (!application) {
      return null
    }

    return application.status
  }

  /**
   * Check if user has a pending application
   */
  async function hasPendingApplication(): Promise<boolean> {
    const status = await checkApplicationStatus()
    return status === 'pending'
  }

  /**
   * Check if user has an approved application
   */
  async function hasApprovedApplication(): Promise<boolean> {
    const status = await checkApplicationStatus()
    return status === 'approved'
  }

  /**
   * Check if user has a rejected application
   */
  async function hasRejectedApplication(): Promise<boolean> {
    const status = await checkApplicationStatus()
    return status === 'rejected'
  }

  /**
   * Get all applications (for admin use)
   */
  async function getAllApplications(status?: 'pending' | 'approved' | 'rejected'): Promise<JournalistApplication[]> {
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('journalist_applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('[Applications] Fetch all error:', fetchError)
        error.value = 'Erreur lors de la récupération des demandes'
        return []
      }

      allApplications.value = data || []
      return data || []
    } catch (e: any) {
      console.error('[Applications] Unexpected error:', e)
      error.value = 'Une erreur inattendue est survenue'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Approve a journalist application (for admin use)
   */
  async function approveApplication(applicationId: string, adminNotes?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { error: approveError } = await supabase.rpc('approve_journalist_application', {
        p_application_id: applicationId,
        p_admin_notes: adminNotes || null,
      })

      if (approveError) {
        console.error('[Applications] Approve error:', approveError)
        error.value = 'Erreur lors de l\'approbation de la demande'
        return false
      }

      // Refresh current application if it's the one being approved
      if (currentApplication.value?.id === applicationId) {
        await getMyApplication()
      }

      return true
    } catch (e: any) {
      console.error('[Applications] Unexpected error:', e)
      error.value = 'Une erreur inattendue est survenue'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Reject a journalist application (for admin use)
   */
  async function rejectApplication(applicationId: string, adminNotes?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { error: rejectError } = await supabase.rpc('reject_journalist_application', {
        p_application_id: applicationId,
        p_admin_notes: adminNotes || null,
      })

      if (rejectError) {
        console.error('[Applications] Reject error:', rejectError)
        error.value = 'Erreur lors du rejet de la demande'
        return false
      }

      // Refresh current application if it's the one being rejected
      if (currentApplication.value?.id === applicationId) {
        await getMyApplication()
      }

      return true
    } catch (e: any) {
      console.error('[Applications] Unexpected error:', e)
      error.value = 'Une erreur inattendue est survenue'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear the current application (for logout)
   */
  function clearApplication() {
    currentApplication.value = null
    error.value = null
  }

  /**
   * Send status notification email to applicant after approval/rejection
   */
  async function sendStatusNotification(application: JournalistApplication): Promise<boolean> {
    if (!STATUS_NOTIFICATION_URL) {
      console.log('[Applications] Status notification URL not configured, skipping email')
      return false
    }

    try {
      const response = await fetch(STATUS_NOTIFICATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({
          id: application.id,
          user_id: application.user_id,
          full_name: application.full_name,
          email: application.email,
          phone: application.phone,
          media_outlet: application.media_outlet,
          status: application.status,
          admin_notes: application.admin_notes
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Applications] Status notification error:', errorData)
        return false
      }

      const result = await response.json()
      console.log('[Applications] Status notification sent:', result)
      return true
    } catch (error) {
      console.error('[Applications] Failed to send status notification:', error)
      return false
    }
  }

  return {
    // State
    loading,
    error,
    currentApplication,
    allApplications,
    // Computed
    hasApplication,
    isPending,
    isApproved,
    isRejected,
    // Methods
    submitApplication,
    getMyApplication,
    checkApplicationStatus,
    hasPendingApplication,
    hasApprovedApplication,
    hasRejectedApplication,
    getAllApplications,
    approveApplication,
    rejectApplication,
    clearApplication,
    sendStatusNotification,
  }
})
