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
  // Soft-delete fields
  is_deleted?: boolean
  deleted_at?: string | null
  deleted_by?: string | null
  deletion_reason?: string | null
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
  
  // Archive state
  const archivedReports = ref<Report[]>([])
  const archivedLoading = ref(false)
  const recentlyDeleted = ref<{reportId: string; report: Report; deletedAt: string}[]>([])

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
  async function fetchUserReports(userId: string, includeDeleted: boolean = false) {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('reports')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
      
      // Filter out deleted reports by default
      if (!includeDeleted) {
        query = query.eq('is_deleted', false)
      }

      const { data, error: fetchError } = await query

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

  async function fetchAllReports(includeDeleted: boolean = false) {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          profiles:created_by (username),
          assigned_profile:assigned_to (username)
        `)
        .order('created_at', { ascending: false })
      
      // Filter out deleted reports by default
      if (!includeDeleted) {
        query = query.eq('is_deleted', false)
      }

      const { data, error: fetchError } = await query

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
        .eq('is_deleted', false)
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
        .eq('is_deleted', false)
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
        .eq('is_deleted', false)
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

  // Soft-delete a report (archive with audit trail)
  async function deleteReport(id: string, userId: string, reason: string = '', isAdmin: boolean = false) {
    loading.value = true
    error.value = null
    try {
      // First, fetch the report to check ownership
      const { data: report, error: fetchError } = await supabase
        .from('reports')
        .select('*, profiles:created_by(username), assigned_profile:assigned_to(username)')
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

      // Use the RPC function to soft-delete and create audit log
      const { data: result, error: deleteError } = await supabase.rpc('soft_delete_report', {
        p_report_id: id,
        p_deleted_by: userId,
        p_reason: reason || null
      })

      if (deleteError) {
        error.value = deleteError.message
        return false
      }

      if (!result) {
        error.value = 'Échec de la suppression du signalement'
        return false
      }

      // Store in recentlyDeleted for undo capability
      recentlyDeleted.value.push({
        reportId: id,
        report: {
          ...report,
          username: report.profiles?.username,
          assigned_username: report.assigned_profile?.username
        },
        deletedAt: new Date().toISOString()
      })

      // Remove from local state
      reports.value = reports.value.filter(r => r.id !== id)
      if (currentReport.value?.id === id) {
        currentReport.value = null
      }

      // Update archive state
      archivedReports.value.unshift({
        ...report,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        deletion_reason: reason
      })

      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression du signalement'
      console.error('Error deleting report:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // Restore a soft-deleted report
  async function restoreReport(id: string, userId: string) {
    loading.value = true
    error.value = null
    try {
      const { data: result, error: restoreError } = await supabase.rpc('restore_report', {
        p_report_id: id,
        p_restored_by: userId
      })

      if (restoreError) {
        error.value = restoreError.message
        return false
      }

      if (!result) {
        error.value = 'Échec de la restauration du signalement'
        return false
      }

      // Fetch the restored report
      const { data: restoredReport } = await supabase
        .from('reports')
        .select('*, profiles:created_by(username), assigned_profile:assigned_to(username)')
        .eq('id', id)
        .single()

      if (restoredReport) {
        const formattedReport = {
          ...restoredReport,
          username: restoredReport.profiles?.username,
          assigned_username: restoredReport.assigned_profile?.username
        }
        // Add back to reports list
        reports.value.unshift(formattedReport)
      }

      // Remove from archived and recentlyDeleted
      archivedReports.value = archivedReports.value.filter(r => r.id !== id)
      recentlyDeleted.value = recentlyDeleted.value.filter(r => r.reportId !== id)

      return true
    } catch (e) {
      error.value = 'Erreur lors de la restauration du signalement'
      console.error('Error restoring report:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // Fetch archived (soft-deleted) reports
  async function fetchArchivedReports(userId: string, includeAll: boolean = false) {
    archivedLoading.value = true
    error.value = null
    try {
      let query = supabase
        .from('reports')
        .select('*, profiles:created_by(username), assigned_profile:assigned_to(username)')
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })

      // Non-admin users can only see their own deleted reports
      if (!includeAll) {
        query = query.eq('created_by', userId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      const flattenedData = data?.map(report => ({
        ...report,
        username: report.profiles?.username,
        assigned_username: report.assigned_profile?.username
      })) || []

      archivedReports.value = flattenedData
      return flattenedData
    } catch (e) {
      error.value = 'Erreur lors de la récupération des signalements archivés'
      console.error('Error fetching archived reports:', e)
      return []
    } finally {
      archivedLoading.value = false
    }
  }

  // Permanently delete a report (admin only)
  async function permanentlyDeleteReport(id: string) {
    loading.value = true
    error.value = null
    try {
      // Use the RPC function
      const { data: result, error: permDeleteError } = await supabase.rpc('permanently_delete_report', {
        p_report_id: id
      })

      if (permDeleteError) {
        error.value = permDeleteError.message
        return false
      }

      if (!result) {
        error.value = 'Échec de la suppression permanente'
        return false
      }

      // Remove from archived
      archivedReports.value = archivedReports.value.filter(r => r.id !== id)
      recentlyDeleted.value = recentlyDeleted.value.filter(r => r.reportId !== id)

      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression permanente'
      console.error('Error permanently deleting report:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // Bulk delete multiple reports
  async function bulkDeleteReports(ids: string[], userId: string, reason: string = '') {
    loading.value = true
    error.value = null
    try {
      // Verify user has admin role for bulk operations
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      const isAdmin = !profileError && profile?.role === 'admin'

      const results = await Promise.all(
        ids.map(async (id) => {
          const { data: report } = await supabase
            .from('reports')
            .select('created_by')
            .eq('id', id)
            .single()

          if (!report) return { id, success: false, error: 'Report not found' }

          // Only owner or admin can delete
          if (report.created_by !== userId && !isAdmin) {
            return { id, success: false, error: 'Not authorized' }
          }

          const { error } = await supabase.rpc('soft_delete_report', {
            p_report_id: id,
            p_deleted_by: userId,
            p_reason: reason || null
          })

          return { id, success: !error, error: error?.message }
        })
      )

      // Filter successful deletions
      const successfulIds = results.filter(r => r.success).map(r => r.id)
      
      // Remove from local state
      reports.value = reports.value.filter(r => !successfulIds.includes(r.id))

      const failedCount = results.filter(r => !r.success).length
      if (failedCount > 0) {
        error.value = `${failedCount} suppression(s) ont échoué`
      }

      return { successful: successfulIds.length, failed: failedCount, results }
    } catch (e) {
      error.value = 'Erreur lors de la suppression en masse'
      console.error('Error bulk deleting reports:', e)
      return { successful: 0, failed: ids.length, results: [] }
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
    archivedReports,
    archivedLoading,
    recentlyDeleted,
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
    restoreReport,
    fetchArchivedReports,
    permanentlyDeleteReport,
    bulkDeleteReports,
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
