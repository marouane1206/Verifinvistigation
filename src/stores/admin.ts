import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { generateSecurePassword } from '../lib/password'
import type { Report, ReportStatus } from './reports'
import type { Investigation } from './investigations'
import type { JournalistApplication } from './applications'

export interface AdminUser {
  id: string
  email: string
  username: string
  role: 'user' | 'journalist' | 'admin'
  created_at: string
  updated_at: string
  // Extended journalist fields (optional)
  phone?: string
  media_outlet?: string
  journalist_id_number?: string
  years_experience?: number
  specialization?: string
  portfolio_url?: string
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
  // Related data for enhanced columns
  report_id?: string
  report_type?: 'signalement' | 'verification'
  report_title?: string
  uploader_username?: string
}

export const useAdminStore = defineStore('admin', () => {
  // State
  const users = ref<AdminUser[]>([])
  const reports = ref<Report[]>([])
  const investigations = ref<Investigation[]>([])
  const mediaFiles = ref<MediaFile[]>([])
  const applications = ref<JournalistApplication[]>([])
  const archivedReports = ref<Report[]>([])
  const archivedLoading = ref(false)
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
  const pendingApplications = computed(() => applications.value.filter(a => a.status === 'pending'))
  const pendingApplicationsCount = computed(() => pendingApplications.value.length)

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

  // Send temporary password email via edge function
  async function sendTemporaryPasswordEmail(
    email: string,
    temporaryPassword: string,
    username: string,
    role: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[Email] Sending temporary password email to:', email)
      
      const { data, error } = await supabase.functions.invoke('send-temporary-password', {
        body: {
          email,
          temporaryPassword,
          username,
          role
        }
      })

      if (error) {
        console.error('[Email] Failed to send temporary password email:', error)
        return { success: false, error: error.message }
      }

      console.log('[Email] Temporary password email sent successfully:', data)
      return { success: true }
    } catch (e) {
      console.error('[Email] Exception sending temporary password email:', e)
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  // Create user with optional role assignment
  async function createUser(email: string, username: string, role: 'user' | 'journalist' | 'admin' = 'user') {
    loading.value = true
    error.value = null
    let emailSent = false
    try {
      // Generate a cryptographically secure password using the new function
      console.log('[User] Generating secure password for new user')
      const tempPassword = generateSecurePassword()
      console.log('[User] Password generated successfully')

      // Create user in auth.users via admin API
      console.log('[User] Creating user in Supabase Auth:', email)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: tempPassword,
        user_metadata: {
          username,
          role,
          force_password_change: true
        }
      })

      if (authError) {
        error.value = authError.message
        console.error('[User] Auth error:', authError.message)
        return { user: null, emailSent: false, error: authError.message }
      }

      if (!authData.user) {
        error.value = 'Erreur lors de la création de l\'utilisateur'
        console.error('[User] No user data returned')
        return { user: null, emailSent: false, error: 'No user data returned' }
      }

      console.log('[User] User created successfully:', authData.user.id)

      // Check if profile already exists (created by trigger), if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single()

      let profileData
      if (existingProfile) {
        // Profile exists, update it
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update({ 
            username, 
            role,
            updated_at: new Date().toISOString() 
          })
          .eq('id', authData.user.id)
          .select()
          .single()

        if (profileError) {
          error.value = profileError.message
          console.error('[User] Profile update error:', profileError.message)
          return { user: null, emailSent: false, error: profileError.message }
        }
        profileData = updatedProfile
      } else {
        // No profile exists, create one directly
        const { data: insertedProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email,
            username,
            role,
            status: 'active'
          })
          .select()
          .single()

        if (profileError) {
          error.value = profileError.message
          console.error('[User] Profile insert error:', profileError.message)
          return { user: null, emailSent: false, error: profileError.message }
        }
        profileData = insertedProfile
      }

      // Add to local state
      if (profileData) {
        users.value.unshift(profileData)
      }

      // Send temporary password email (don't fail user creation if email fails)
      console.log('[User] Sending temporary password email...')
      const emailResult = await sendTemporaryPasswordEmail(email, tempPassword, username, role)
      emailSent = emailResult.success
      
      if (!emailResult.success) {
        // Log the error but don't fail the user creation
        console.error('[User] Email sending failed:', emailResult.error)
        console.log('[User] User was created successfully. Admin can communicate password manually.')
      }

      console.log('[User] User creation completed successfully')
      return { user: profileData, emailSent, error: null, tempPassword }
    } catch (e) {
      error.value = 'Erreur lors de la création de l\'utilisateur'
      console.error('[User] Exception creating user:', e)
      return { user: null, emailSent, error: e instanceof Error ? e.message : 'Unknown error', tempPassword: null }
    } finally {
      loading.value = false
    }
  }

  // Create journalist with extended information
  async function createJournalist(
    email: string,
    username: string,
    phone?: string,
    mediaOutlet?: string,
    journalistIdNumber?: string,
    yearsExperience?: number,
    specialization?: string,
    portfolioUrl?: string
  ) {
    loading.value = true
    error.value = null
    let authUserId: string | null = null
    let emailSent = false
    try {
      // Generate a cryptographically secure password using the new function
      console.log('[Journalist] Generating secure password for new journalist')
      const tempPassword = generateSecurePassword()
      console.log('[Journalist] Password generated successfully')

      // Create user in auth.users via admin API
      console.log('[Journalist] Creating user in Supabase Auth:', email)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: tempPassword,
        user_metadata: {
          username,
          role: 'journalist',
          is_journalist: true,
          force_password_change: true
        }
      })

      if (authError) {
        error.value = authError.message
        console.error('[Journalist] Auth error:', authError.message)
        return { user: null, emailSent: false, error: authError.message }
      }

      if (!authData.user) {
        error.value = 'Erreur lors de la création du journaliste'
        console.error('[Journalist] No user data returned')
        return { user: null, emailSent: false, error: 'No user data returned' }
      }

      authUserId = authData.user.id
      console.log('[Journalist] User created successfully:', authUserId)

      // Check if profile already exists (created by trigger), if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUserId)
        .single()

      let profileData
      if (existingProfile) {
        // Profile exists, update it with journalist information
        const updateData: Record<string, unknown> = {
          username,
          role: 'journalist',
          status: 'pending',
          updated_at: new Date().toISOString()
        }

        // Add optional fields if provided
        if (phone) updateData.phone = phone
        if (mediaOutlet) updateData.media_outlet = mediaOutlet
        if (journalistIdNumber) updateData.journalist_id_number = journalistIdNumber
        if (yearsExperience) updateData.years_experience = yearsExperience
        if (specialization) updateData.specialization = specialization
        if (portfolioUrl) updateData.portfolio_url = portfolioUrl

        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', authUserId)
          .select()
          .single()

        if (profileError) {
          error.value = profileError.message
          console.error('[Journalist] Profile update error:', profileError.message)
          return { user: null, emailSent: false, error: profileError.message }
        }
        profileData = updatedProfile
      } else {
        // No profile exists, create one directly
        const insertData = {
          id: authUserId,
          email,
          username,
          role: 'journalist',
          status: 'pending'
        }

        // Add optional fields if provided
        if (phone) (insertData as Record<string, unknown>).phone = phone
        if (mediaOutlet) (insertData as Record<string, unknown>).media_outlet = mediaOutlet
        if (journalistIdNumber) (insertData as Record<string, unknown>).journalist_id_number = journalistIdNumber
        if (yearsExperience) (insertData as Record<string, unknown>).years_experience = yearsExperience
        if (specialization) (insertData as Record<string, unknown>).specialization = specialization
        if (portfolioUrl) (insertData as Record<string, unknown>).portfolio_url = portfolioUrl

        const { data: insertedProfile, error: profileError } = await supabase
          .from('profiles')
          .insert(insertData)
          .select()
          .single()

        if (profileError) {
          error.value = profileError.message
          console.error('[Journalist] Profile insert error:', profileError.message)
          return { user: null, emailSent: false, error: profileError.message }
        }
        profileData = insertedProfile
      }

      // Add to local state
      if (profileData) {
        users.value.unshift(profileData)
      }

      // Send temporary password email (don't fail user creation if email fails)
      console.log('[Journalist] Sending temporary password email...')
      const emailResult = await sendTemporaryPasswordEmail(email, tempPassword, username, 'journalist')
      emailSent = emailResult.success
      
      if (!emailResult.success) {
        // Log the error but don't fail the user creation
        console.error('[Journalist] Email sending failed:', emailResult.error)
        console.log('[Journalist] User was created successfully. Admin can communicate password manually.')
      }

      console.log('[Journalist] Creation completed successfully')
      return { user: profileData, emailSent, error: null, tempPassword }
    } catch (e) {
      error.value = 'Erreur lors de la création du journaliste'
      console.error('[Journalist] Exception creating journalist:', e)
      return { user: null, emailSent, error: e instanceof Error ? e.message : 'Unknown error', tempPassword: null }
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

  async function updateUserUsername(userId: string, newUsername: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ username: newUsername, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        const errMsg = updateError.message.toLowerCase()
        if (errMsg.includes('unique') || errMsg.includes('already exists')) {
          error.value = 'Ce nom d\'utilisateur est déjà pris'
        } else {
          error.value = updateError.message
        }
        return null
      }

      // Update local state
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1 && data) {
        users.value[index] = data
      }

      return data
    } catch (e) {
      error.value = 'Erreur lors de la mise à jour du nom d\'utilisateur'
      console.error('Error updating username:', e)
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

  // Soft-delete a report (archive with audit trail)
  async function deleteReport(reportId: string, reason: string = '') {
    loading.value = true
    error.value = null
    try {
      // Check if the report exists
      const { data: report, error: fetchError } = await supabase
        .from('reports')
        .select('*, profiles:created_by(username), assigned_profile:assigned_to(username)')
        .eq('id', reportId)
        .single()

      if (fetchError || !report) {
        error.value = 'Signalement non trouvé'
        return false
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'Utilisateur non connecté'
        return false
      }

      // Use the RPC function to soft-delete and create audit log
      const { data: result, error: deleteError } = await supabase.rpc('soft_delete_report', {
        p_report_id: reportId,
        p_deleted_by: user.id,
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

      // Remove from local state
      reports.value = reports.value.filter(r => r.id !== reportId)

      // Add to archived reports for potential restore
      archivedReports.value.unshift({
        ...report,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deletion_reason: reason
      })

      // Refresh stats to reflect the deletion
      await fetchStats()
      
      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression'
      console.error('Error deleting report:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // Restore a soft-deleted report
  async function restoreReport(reportId: string) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'Utilisateur non connecté'
        return false
      }

      const { data: result, error: restoreError } = await supabase.rpc('restore_report', {
        p_report_id: reportId,
        p_restored_by: user.id
      })

      if (restoreError) {
        error.value = restoreError.message
        return false
      }

      if (!result) {
        error.value = 'Échec de la restauration du signalement'
        return false
      }

      // Fetch the restored report and add back to list
      const { data: restoredReport } = await supabase
        .from('reports')
        .select('*, profiles:created_by(username), assigned_profile:assigned_to(username)')
        .eq('id', reportId)
        .single()

      if (restoredReport) {
        const formattedReport = {
          ...restoredReport,
          username: restoredReport.profiles?.username,
          assigned_username: restoredReport.assigned_profile?.username
        }
        reports.value.unshift(formattedReport)
      }

      // Remove from archived
      archivedReports.value = archivedReports.value.filter(r => r.id !== reportId)

      // Refresh stats
      await fetchStats()

      return true
    } catch (e) {
      error.value = 'Erreur lors de la restauration'
      console.error('Error restoring report:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // Fetch archived (soft-deleted) reports
  async function fetchArchivedReports() {
    archivedLoading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('*, profiles:created_by(username), assigned_profile:assigned_to(username)')
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })

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
      error.value = 'Erreur lors de la récupération des archives'
      console.error('Error fetching archived reports:', e)
      return []
    } finally {
      archivedLoading.value = false
    }
  }

  // Permanently delete a report (admin only)
  async function permanentlyDeleteReport(reportId: string) {
    loading.value = true
    try {
      const { data: result, error: permDeleteError } = await supabase.rpc('permanently_delete_report', {
        p_report_id: reportId
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
      archivedReports.value = archivedReports.value.filter(r => r.id !== reportId)

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
  async function bulkDeleteReports(reportIds: string[], reason: string = '') {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'Utilisateur non connecté'
        return { successful: 0, failed: reportIds.length }
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || profile.role !== 'admin') {
        error.value = 'Accès refusé: права администратора требуются'
        return { successful: 0, failed: reportIds.length }
      }

      const results = await Promise.all(
        reportIds.map(async (id) => {
          const { error } = await supabase.rpc('soft_delete_report', {
            p_report_id: id,
            p_deleted_by: user.id,
            p_reason: reason || null
          })
          return { id, success: !error, error: error?.message }
        })
      )

      const successfulIds = results.filter(r => r.success).map(r => r.id)
      
      // Remove from local state
      reports.value = reports.value.filter(r => !successfulIds.includes(r.id))

      // Refresh stats
      await fetchStats()

      const failedCount = results.filter(r => !r.success).length
      if (failedCount > 0) {
        error.value = `${failedCount} suppression(s) ont échoué`
      }

      return { successful: successfulIds.length, failed: failedCount }
    } catch (e) {
      error.value = 'Erreur lors de la suppression en masse'
      console.error('Error bulk deleting reports:', e)
      return { successful: 0, failed: reportIds.length }
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
      // Fetch from documents table with uploader profile info and report info
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select(`
          *,
          uploader:uploaded_by (id, username, role),
          report:report_id (id, type, title)
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
          uploader_role: uploaderRole,
          // Related data for enhanced columns
          report_id: doc.report?.id || null,
          report_type: doc.report?.type || null,
          report_title: doc.report?.title || null,
          uploader_username: doc.uploader?.username || null
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

      // Get report counts (exclude deleted records)
      const { data: reportsData } = await supabase
        .from('reports')
        .select('status')
        .eq('is_deleted', false)

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

  // Journalist Applications Actions
  async function fetchAllApplications(status?: 'pending' | 'approved' | 'rejected') {
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
        error.value = fetchError.message
        return []
      }

      applications.value = data || []
      return data || []
    } catch (e) {
      error.value = 'Erreur lors de la récupération des demandes'
      console.error('Error fetching applications:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function getPendingApplicationsCount(): Promise<number> {
    try {
      const { count, error: countError } = await supabase
        .from('journalist_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (countError) {
        console.error('Error getting pending count:', countError)
        return 0
      }

      return count || 0
    } catch (e) {
      console.error('Error getting pending count:', e)
      return 0
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
    createUser,
    createJournalist,
    updateUserRole,
    updateUserUsername,
    deleteUser,
    // Reports Actions
    fetchAllReports,
    updateReportStatus,
    assignReport,
    deleteReport,
    restoreReport,
    fetchArchivedReports,
    permanentlyDeleteReport,
    bulkDeleteReports,
    archivedReports,
    archivedLoading,
    // Investigations Actions
    fetchAllInvestigations,
    toggleInvestigationPublish,
    deleteInvestigation,
    // Media Actions
    fetchMediaFiles,
    deleteMediaFile,
    // Stats
    fetchStats,
    clearError,
    // Applications
    applications,
    pendingApplications,
    pendingApplicationsCount,
    fetchAllApplications,
    getPendingApplicationsCount
  }
})
