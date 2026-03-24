import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface Investigation {
  id: string
  report_id: string
  journalist_id: string
  title: string
  content: string
  findings: string
  is_public: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  // Additional fields from joined queries
  journalist_username?: string
  report_type?: string
}

export interface CreateInvestigationData {
  report_id: string
  title: string
  content: string
  findings: string
}

export interface UpdateInvestigationData {
  title?: string
  content?: string
  findings?: string
}

export const useInvestigationsStore = defineStore('investigations', () => {
  // State
  const investigations = ref<Investigation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentInvestigation = ref<Investigation | null>(null)

  // Getters
  const publicInvestigations = computed(() => 
    investigations.value.filter(i => i.is_public)
  )

  const privateInvestigations = computed(() => 
    investigations.value.filter(i => !i.is_public)
  )

  // Actions
  async function fetchInvestigationByReportId(reportId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('investigations')
        .select(`
          *
        `)
        .eq('report_id', reportId)
        .single()

      if (fetchError) {
        console.error('Investigation fetch error:', fetchError)
        // Handle RLS errors more gracefully
        if (fetchError.code === 'PGRST116') {
          // No rows returned - this is normal if no investigation exists
          error.value = null
          currentInvestigation.value = null
          return null
        }
        if (fetchError.code === '42501') {
          error.value = 'Vous n\'êtes pas autorisé à voir cette enquête'
        } else {
          error.value = fetchError.message
        }
        currentInvestigation.value = null
        return null
      }

      if (data) {
        currentInvestigation.value = data as Investigation
        return currentInvestigation.value
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de la récupération de l\'enquête'
      console.error('Error fetching investigation by report id:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchInvestigationsByJournalist(journalistId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('investigations')
        .select('*')
        .eq('journalist_id', journalistId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Investigations fetch error:', fetchError)
        if (fetchError.code === '42501') {
          error.value = 'Vous n\'êtes pas autorisé à voir ces enquêtes'
        }
        error.value = fetchError.message
        return []
      }

      investigations.value = (data as Investigation[]) || []
      return investigations.value
    } catch (e) {
      error.value = 'Erreur lors de la récupération des enquêtes'
      console.error('Error fetching investigations by journalist:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchAllPublicInvestigations() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('investigations')
        .select('*')
        .eq('is_public', true)
        .order('published_at', { ascending: false })

      if (fetchError) {
        console.error('Public investigations fetch error:', fetchError)
        error.value = fetchError.message
        return []
      }

      investigations.value = (data as Investigation[]) || []
      return investigations.value
    } catch (e) {
      error.value = 'Erreur lors de la récupération des enquêtes publiques'
      console.error('Error fetching public investigations:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function createInvestigation(data: CreateInvestigationData, journalistId: string) {
    loading.value = true
    error.value = null
    try {
      const { data: investigation, error: insertError } = await supabase
        .from('investigations')
        .insert({
          report_id: data.report_id,
          journalist_id: journalistId,
          title: data.title,
          content: data.content,
          findings: data.findings,
          is_public: false,
          published_at: null
        })
        .select()
        .single()

      if (insertError) {
        console.error('Investigation insert error:', insertError)
        if (insertError.code === '42501') {
          error.value = 'Vous n\'êtes pas autorisé à créer une enquête'
        } else {
          error.value = insertError.message
        }
        return null
      }

      if (investigation) {
        investigations.value.unshift(investigation as Investigation)
        currentInvestigation.value = investigation as Investigation
        return investigation as Investigation
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de la création de l\'enquête'
      console.error('Error creating investigation:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateInvestigation(id: string, data: UpdateInvestigationData) {
    loading.value = true
    error.value = null
    try {
      const { data: investigation, error: updateError } = await supabase
        .from('investigations')
        .update({ 
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Investigation update error:', updateError)
        if (updateError.code === '42501') {
          error.value = 'Vous n\'êtes pas autorisé à modifier cette enquête'
        } else {
          error.value = updateError.message
        }
        return null
      }

      if (investigation) {
        // Update in local state
        const index = investigations.value.findIndex(i => i.id === id)
        if (index !== -1) {
          investigations.value[index] = investigation as Investigation
        }
        if (currentInvestigation.value?.id === id) {
          currentInvestigation.value = investigation as Investigation
        }
        return investigation as Investigation
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de la mise à jour de l\'enquête'
      console.error('Error updating investigation:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function publishInvestigation(id: string) {
    loading.value = true
    error.value = null
    try {
      const publishedAt = new Date().toISOString()
      
      const { data, error: updateError } = await supabase
        .from('investigations')
        .update({ 
          is_public: true,
          published_at: publishedAt,
          updated_at: publishedAt
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Investigation publish error:', updateError)
        if (updateError.code === '42501') {
          error.value = 'Vous n\'êtes pas autorisé à publier cette enquête'
        } else {
          error.value = updateError.message
        }
        return null
      }

      if (data) {
        // Update in local state
        const index = investigations.value.findIndex(i => i.id === id)
        if (index !== -1) {
          investigations.value[index] = data as Investigation
        }
        if (currentInvestigation.value?.id === id) {
          currentInvestigation.value = data as Investigation
        }
        return data as Investigation
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de la publication de l\'enquête'
      console.error('Error publishing investigation:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function unpublishInvestigation(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('investigations')
        .update({ 
          is_public: false,
          published_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Investigation unpublish error:', updateError)
        if (updateError.code === '42501') {
          error.value = 'Vous n\'êtes pas autorisé à dépublier cette enquête'
        } else {
          error.value = updateError.message
        }
        return null
      }

      if (data) {
        // Update in local state
        const index = investigations.value.findIndex(i => i.id === id)
        if (index !== -1) {
          investigations.value[index] = data as Investigation
        }
        if (currentInvestigation.value?.id === id) {
          currentInvestigation.value = data as Investigation
        }
        return data as Investigation
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors de la dépublication de l\'enquête'
      console.error('Error unpublishing investigation:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  function clearCurrentInvestigation() {
    currentInvestigation.value = null
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    investigations,
    loading,
    error,
    currentInvestigation,
    // Getters
    publicInvestigations,
    privateInvestigations,
    // Actions
    fetchInvestigationByReportId,
    fetchInvestigationsByJournalist,
    fetchAllPublicInvestigations,
    createInvestigation,
    updateInvestigation,
    publishInvestigation,
    unpublishInvestigation,
    clearCurrentInvestigation,
    clearError
  }
})
