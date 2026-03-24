import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export type ReportStatus = 'en_attente' | 'en_cours' | 'termine'

export interface Report {
  id: string
  title: string
  description: string
  type?: 'signalement' | 'verification'
  status: ReportStatus
  created_by: string
  assigned_to: string | null
  is_anonymous?: boolean
  created_at: string
  updated_at: string
  // Verification fields
  evidence?: string
  verification_comments?: string
  verification_documents?: string[]
  // Additional fields from joined queries
  username?: string
  assigned_username?: string
  profiles?: {
    username: string
    email: string
  }
}

export interface VerificationData {
  evidence: string
  comments?: string
  documentIds?: string[]
}

export interface CreateReportData {
  title: string
  description: string
}

export const useReportsStore = defineStore('reports', () => {
  // State
  const reports = ref<Report[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentReport = ref<Report | null>(null)

  // Getters
  const pendingReports = computed(() => 
    reports.value.filter(r => r.status === 'en_attente')
  )

  const inProgressReports = computed(() => 
    reports.value.filter(r => r.status === 'en_cours')
  )

  const completedReports = computed(() => 
    reports.value.filter(r => r.status === 'termine')
  )

  // Actions
  async function fetchUserReports(userId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('created_by', userId)  // Fixed: was using non-existent 'user_id' column
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      reports.value = data || []
      return data || []
    } catch (e) {
      error.value = 'Erreur lors de la récupération des signalements'
      console.error('Error fetching user reports:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchAllReports() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:created_by (username),
          assigned_profile:assigned_to (username)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      // Flatten the joined data
      const flattenedData = data?.map(report => ({
        ...report,
        username: report.profiles?.username,
        assigned_username: report.assigned_profile?.username
      })) || []

      reports.value = flattenedData
      return flattenedData
    } catch (e) {
      error.value = 'Erreur lors de la récupération des signalements'
      console.error('Error fetching all reports:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchReportById(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:created_by (username),
          assigned_profile:assigned_to (username)
        `)
        .eq('id', id)
        .single()

      if (fetchError) {
        error.value = fetchError.message
        currentReport.value = null
        return null
      }

      if (data) {
        currentReport.value = {
          ...data,
          username: data.profiles?.username,
          assigned_username: data.assigned_profile?.username
        }
        return currentReport.value
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de la récupération du signalement'
      console.error('Error fetching report by id:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function createReport(reportData: CreateReportData, userId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('reports')
        .insert({
          title: reportData.title,
          description: reportData.description,
          created_by: userId,  // Changed from user_id to created_by
          status: 'en_attente'
        })
        .select()
        .single()

      if (insertError) {
        error.value = insertError.message
        return null
      }

      if (data) {
        reports.value.unshift(data)
        return data
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de la création du signalement'
      console.error('Error creating report:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateReportStatus(id: string, status: ReportStatus) {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('reports')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        error.value = updateError.message
        return null
      }

      if (data) {
        // Update in local state
        const index = reports.value.findIndex(r => r.id === id)
        if (index !== -1) {
          reports.value[index] = data
        }
        if (currentReport.value?.id === id) {
          currentReport.value = data
        }
        return data
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de la mise à jour du statut'
      console.error('Error updating report status:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function assignReport(id: string, assignedTo: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('reports')
        .update({ 
          assigned_to: assignedTo,
          status: 'en_cours',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          profiles:created_by (username),
          assigned_profile:assigned_to (username)
        `)
        .single()

      if (updateError) {
        error.value = updateError.message
        return null
      }

      if (data) {
        const updatedReport = {
          ...data,
          username: data.profiles?.username,
          assigned_username: data.assigned_profile?.username
        }
        
        // Update in local state
        const index = reports.value.findIndex(r => r.id === id)
        if (index !== -1) {
          reports.value[index] = updatedReport
        }
        if (currentReport.value?.id === id) {
          currentReport.value = updatedReport
        }
        return updatedReport
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de l\'assignation du signalement'
      console.error('Error assigning report:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  function clearCurrentReport() {
    currentReport.value = null
  }

  function clearError() {
    error.value = null
  }

  // Fetch pending reports assigned to journalist
  async function fetchPendingReportsForJournalist(userId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:created_by (username),
          assigned_profile:assigned_to (username)
        `)
        .eq('assigned_to', userId)
        .eq('status', 'en_attente')
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      const flattenedData = data?.map(report => ({
        ...report,
        username: report.profiles?.username,
        assigned_username: report.assigned_profile?.username
      })) || []

      return flattenedData
    } catch (e) {
      error.value = 'Erreur lors de la récupération des signalements en attente'
      console.error('Error fetching pending reports:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch in-progress reports for journalist
  async function fetchInProgressReportsForJournalist(userId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:created_by (username),
          assigned_profile:assigned_to (username)
        `)
        .eq('assigned_to', userId)
        .eq('status', 'en_cours')
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      const flattenedData = data?.map(report => ({
        ...report,
        username: report.profiles?.username,
        assigned_username: report.assigned_profile?.username
      })) || []

      return flattenedData
    } catch (e) {
      error.value = 'Erreur lors de la récupération des signalements en cours'
      console.error('Error fetching in-progress reports:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch verified/completed reports for journalist
  async function fetchVerifiedReportsForJournalist(userId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:created_by (username),
          assigned_profile:assigned_to (username)
        `)
        .eq('assigned_to', userId)
        .eq('status', 'termine')
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      const flattenedData = data?.map(report => ({
        ...report,
        username: report.profiles?.username,
        assigned_username: report.assigned_profile?.username
      })) || []

      return flattenedData
    } catch (e) {
      error.value = 'Erreur lors de la récupération des signalements vérifiés'
      console.error('Error fetching verified reports:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  // Bulk update status to "en_cours" (in progress)
  async function bulkAssignToInProgress(reportIds: string[], userId: string) {
    loading.value = true
    error.value = null
    try {
      const updates = reportIds.map(id => ({
        id,
        assigned_to: userId,
        status: 'en_cours',
        updated_at: new Date().toISOString()
      }))

      const { data, error: updateError } = await supabase
        .from('reports')
        .upsert(updates)
        .select()

      if (updateError) {
        error.value = updateError.message
        return []
      }

      // Update local state
      reportIds.forEach(id => {
        const index = reports.value.findIndex(r => r.id === id)
        if (index !== -1) {
          reports.value[index].status = 'en_cours'
          reports.value[index].assigned_to = userId
        }
      })

      return data || []
    } catch (e) {
      error.value = 'Erreur lors de la mise à jour en masse des signalements'
      console.error('Error bulk updating reports:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  // Update status to "termine" (verified) with verification data
  async function verifyReport(id: string, verificationData: VerificationData) {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('reports')
        .update({ 
          status: 'termine',
          evidence: verificationData.evidence,
          verification_comments: verificationData.comments || null,
          verification_documents: verificationData.documentIds || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          profiles:created_by (username),
          assigned_profile:assigned_to (username)
        `)
        .single()

      if (updateError) {
        error.value = updateError.message
        return null
      }

      if (data) {
        const updatedReport = {
          ...data,
          username: data.profiles?.username,
          assigned_username: data.assigned_profile?.username
        }
        
        // Update in local state
        const index = reports.value.findIndex(r => r.id === id)
        if (index !== -1) {
          reports.value[index] = updatedReport
        }
        if (currentReport.value?.id === id) {
          currentReport.value = updatedReport
        }
        return updatedReport
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de la vérification du signalement'
      console.error('Error verifying report:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete a report
  async function deleteReport(id: string, userId: string, isAdmin: boolean = false) {
    loading.value = true
    error.value = null
    try {
      // First, fetch the report to check ownership
      const { data: report, error: fetchError } = await supabase
        .from('reports')
        .select('created_by')
        .eq('id', id)
        .single()

      if (fetchError) {
        error.value = fetchError.message
        return false
      }

      // Check authorization: only owner or admin can delete
      if (!isAdmin && report.created_by !== userId) {
        error.value = 'Vous n\'êtes pas autorisé à supprimer ce signalement'
        return false
      }

      // Delete the report
      const { error: deleteError } = await supabase
        .from('reports')
        .delete()
        .eq('id', id)

      if (deleteError) {
        error.value = deleteError.message
        return false
      }

      // Remove from local state
      reports.value = reports.value.filter(r => r.id !== id)
      if (currentReport.value?.id === id) {
        currentReport.value = null
      }

      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression du signalement'
      console.error('Error deleting report:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    reports,
    loading,
    error,
    currentReport,
    // Getters
    pendingReports,
    inProgressReports,
    completedReports,
    // Actions
    fetchUserReports,
    fetchAllReports,
    fetchReportById,
    createReport,
    updateReportStatus,
    assignReport,
    deleteReport,
    clearCurrentReport,
    clearError,
    // Journalist-specific actions
    fetchPendingReportsForJournalist,
    fetchInProgressReportsForJournalist,
    fetchVerifiedReportsForJournalist,
    bulkAssignToInProgress,
    verifyReport
  }
})
