import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { Report, ReportStatus } from './reports'
import type { Investigation } from './investigations'

export interface AdminUser {
  id: string
  email: string
  username: string
  role: 'user' | 'journalist' | 'admin'
  created_at: string
  updated_at: string
}

export interface AdminStats {
  totalUsers: number
  totalJournalists: number
  totalAdmins: number
  totalReports: number
  pendingReports: number
  inProgressReports: number
  completedReports: number
  totalInvestigations: number
  publicInvestigations: number
}

export interface MediaFile {
  id: string
  name: string
  bucket: string
  path: string
  size: number
  content_type: string
  created_at: string
  public_url?: string
  uploaded_by?: string
  uploader_role?: string
}

export const useAdminStore = defineStore('admin', () => {
  // State
  const users = ref<AdminUser[]>([])
  const reports = ref<Report[]>([])
  const investigations = ref<Investigation[]>([])
  const mediaFiles = ref<MediaFile[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const stats = ref<AdminStats>({
    totalUsers: 0,
    totalJournalists: 0,
    totalAdmins: 0,
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    completedReports: 0,
    totalInvestigations: 0,
    publicInvestigations: 0
  })

  // Getters
  const regularUsers = computed(() => users.value.filter(u => u.role === 'user'))
  const journalists = computed(() => users.value.filter(u => u.role === 'journalist'))
  const admins = computed(() => users.value.filter(u => u.role === 'admin'))

  // User Management Actions
  async function fetchAllUsers() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      users.value = data || []
      return data || []
    } catch (e) {
      error.value = 'Erreur lors de la récupération des utilisateurs'
      console.error('Error fetching users:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function updateUserRole(userId: string, newRole: 'user' | 'journalist' | 'admin') {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        error.value = updateError.message
        return null
      }

      // Update local state
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1 && data) {
        users.value[index] = data
      }

      return data
    } catch (e) {
      error.value = 'Erreur lors de la mise à jour du rôle'
      console.error('Error updating user role:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(userId: string) {
    loading.value = true
    error.value = null
    try {
      // Delete from profiles (RLS will handle auth.users deletion via cascade)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (deleteError) {
        error.value = deleteError.message
        return false
      }

      // Update local state
      users.value = users.value.filter(u => u.id !== userId)
      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression de l\'utilisateur'
      console.error('Error deleting user:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // Reports Management Actions
  async function fetchAllReports() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:created_by (username, email),
          assigned_profile:assigned_to (username)
        `)
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

      reports.value = flattenedData
      return flattenedData
    } catch (e) {
      error.value = 'Erreur lors de la récupération des signalements'
      console.error('Error fetching reports:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function updateReportStatus(reportId: string, status: ReportStatus) {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('reports')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', reportId)
        .select()
        .single()

      if (updateError) {
        error.value = updateError.message
        return null
      }

      // Update local state
      const index = reports.value.findIndex(r => r.id === reportId)
      if (index !== -1 && data) {
        reports.value[index] = { ...reports.value[index], ...data }
      }

      return data
    } catch (e) {
      error.value = 'Erreur lors de la mise à jour du statut'
      console.error('Error updating report status:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function assignReport(reportId: string, assignedTo: string | null) {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('reports')
        .update({ 
          assigned_to: assignedTo,
          status: assignedTo ? 'en_cours' : 'en_attente',
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
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
        
        const index = reports.value.findIndex(r => r.id === reportId)
        if (index !== -1) {
          reports.value[index] = updatedReport
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

  async function deleteReport(reportId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

      if (deleteError) {
        error.value = deleteError.message
        return false
      }

      reports.value = reports.value.filter(r => r.id !== reportId)
      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression du signalement'
      console.error('Error deleting report:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // Investigations Management Actions
  async function fetchAllInvestigations() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('investigations')
        .select(`
          *,
          profiles:journalist_id (username),
          report:report_id (type)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      const flattenedData = data?.map(inv => ({
        ...inv,
        journalist_username: inv.profiles?.username,
        report_type: inv.report?.type
      })) || []

      investigations.value = flattenedData
      return flattenedData
    } catch (e) {
      error.value = 'Erreur lors de la récupération des enquêtes'
      console.error('Error fetching investigations:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function toggleInvestigationPublish(investigationId: string, makePublic: boolean) {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('investigations')
        .update({ 
          is_public: makePublic,
          published_at: makePublic ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', investigationId)
        .select()
        .single()

      if (updateError) {
        error.value = updateError.message
        return null
      }

      // Update local state
      const index = investigations.value.findIndex(i => i.id === investigationId)
      if (index !== -1 && data) {
        investigations.value[index] = { ...investigations.value[index], ...data }
      }

      return data
    } catch (e) {
      error.value = makePublic ? 'Erreur lors de la publication' : 'Erreur lors de la dépublication'
      console.error('Error toggling investigation publish:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteInvestigation(investigationId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('investigations')
        .delete()
        .eq('id', investigationId)

      if (deleteError) {
        error.value = deleteError.message
        return false
      }

      investigations.value = investigations.value.filter(i => i.id !== investigationId)
      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression de l\'enquête'
      console.error('Error deleting investigation:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // Media Library Actions
  async function fetchMediaFiles(filterRole?: 'user' | 'journalist') {
    loading.value = true
    error.value = null
    try {
      // Fetch from documents table with uploader profile info
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select(`
          *,
          uploader:uploaded_by (role)
        `)
        .order('created_at', { ascending: false })

      if (docError) {
        error.value = docError.message
        return []
      }

      // Get public URLs for each document and filter by uploader role
      const mediaWithUrls = await Promise.all((documents || []).map(async (doc) => {
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(doc.file_url)
        
        const uploaderRole = doc.uploader?.role || 'user'
        
        return {
          id: doc.id,
          name: doc.file_name,
          bucket: 'documents',
          path: doc.file_url,
          size: 0, // Size not stored in documents table
          content_type: 'application/octet-stream',
          created_at: doc.created_at,
          public_url: urlData?.publicUrl,
          uploaded_by: doc.uploaded_by,
          uploader_role: uploaderRole
        } as MediaFile
      }))

      // Filter based on the filterRole parameter
      let filteredMedia: MediaFile[]
      if (filterRole === 'user') {
        // Show only files uploaded by regular users (not admin or journalist)
        filteredMedia = mediaWithUrls.filter(m => m.uploader_role === 'user')
      } else if (filterRole === 'journalist') {
        // Show only files uploaded by journalists
        filteredMedia = mediaWithUrls.filter(m => m.uploader_role === 'journalist')
      } else {
        // No filter - show all files
        filteredMedia = mediaWithUrls
      }

      mediaFiles.value = filteredMedia
      return filteredMedia
    } catch (e) {
      error.value = 'Erreur lors de la récupération des fichiers'
      console.error('Error fetching media files:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function deleteMediaFile(fileId: string) {
    loading.value = true
    error.value = null
    try {
      // Get the file path first
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', fileId)
        .single()

      if (fetchError) {
        error.value = fetchError.message
        return false
      }

      // Delete from storage
      if (document?.file_url) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.file_url])
        
        if (storageError) {
          console.error('Storage delete error:', storageError)
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', fileId)

      if (dbError) {
        error.value = dbError.message
        return false
      }

      mediaFiles.value = mediaFiles.value.filter(f => f.id !== fileId)
      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression du fichier'
      console.error('Error deleting media file:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // Stats Actions
  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      // Get user counts
      const { data: usersData } = await supabase
        .from('profiles')
        .select('role')

      if (usersData) {
        stats.value.totalUsers = usersData.filter(u => u.role === 'user').length
        stats.value.totalJournalists = usersData.filter(u => u.role === 'journalist').length
        stats.value.totalAdmins = usersData.filter(u => u.role === 'admin').length
      }

      // Get report counts
      const { data: reportsData } = await supabase
        .from('reports')
        .select('status')

      if (reportsData) {
        stats.value.totalReports = reportsData.length
        stats.value.pendingReports = reportsData.filter(r => r.status === 'en_attente').length
        stats.value.inProgressReports = reportsData.filter(r => r.status === 'en_cours').length
        stats.value.completedReports = reportsData.filter(r => r.status === 'termine').length
      }

      // Get investigation counts
      const { data: investigationsData } = await supabase
        .from('investigations')
        .select('is_public')

      if (investigationsData) {
        stats.value.totalInvestigations = investigationsData.length
        stats.value.publicInvestigations = investigationsData.filter(i => i.is_public).length
      }

      return stats.value
    } catch (e) {
      error.value = 'Erreur lors de la récupération des statistiques'
      console.error('Error fetching stats:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    users,
    reports,
    investigations,
    mediaFiles,
    loading,
    error,
    stats,
    // Getters
    regularUsers,
    journalists,
    admins,
    // User Actions
    fetchAllUsers,
    updateUserRole,
    deleteUser,
    // Reports Actions
    fetchAllReports,
    updateReportStatus,
    assignReport,
    deleteReport,
    // Investigations Actions
    fetchAllInvestigations,
    toggleInvestigationPublish,
    deleteInvestigation,
    // Media Actions
    fetchMediaFiles,
    deleteMediaFile,
    // Stats
    fetchStats,
    clearError
  }
})
