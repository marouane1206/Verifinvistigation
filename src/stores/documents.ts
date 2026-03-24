import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { uploadDocument as uploadToStorage, deleteDocument as deleteFromStorage, getPublicUrl } from '../lib/storage'

export interface Document {
  id: string
  report_id: string
  file_name: string
  file_url: string
  uploaded_by: string
  created_at: string
}

export interface CreateDocumentData {
  report_id: string
  file_name: string
  file_url: string
}

export const useDocumentsStore = defineStore('documents', () => {
  // State
  const documents = ref<Document[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  async function fetchDocumentsByReportId(reportId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      documents.value = data || []
      return data || []
    } catch (e) {
      error.value = 'Erreur lors de la récupération des documents'
      console.error('Error fetching documents:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch all documents (for journalist verification)
  async function fetchAllDocuments() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return []
      }

      documents.value = data || []
      return data || []
    } catch (e) {
      error.value = 'Erreur lors de la récupération des documents'
      console.error('Error fetching all documents:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function uploadDocument(
    file: File,
    reportId: string,
    uploadedBy: string
  ): Promise<Document | null> {
    loading.value = true
    error.value = null
    try {
      // Upload file to Supabase Storage
      const storagePath = `reports/${reportId}`
      const { data: uploadData, error: uploadError } = await uploadToStorage(file, storagePath)

      if (uploadError) {
        error.value = 'Erreur lors du téléchargement du fichier'
        console.error('Upload error:', uploadError)
        return null
      }

      if (!uploadData?.path) {
        error.value = 'Chemin du fichier non valide'
        return null
      }

      // Save document metadata to database
      // Use returning() to get the inserted row
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          report_id: reportId,
          file_name: file.name,
          file_url: uploadData.path,
          uploaded_by: uploadedBy
        })
        .select()
        .single()

      if (dbError) {
        // Try to clean up the uploaded file if database insert fails
        console.error('Database insert error:', dbError)
        
        // Check if it's an RLS error
        if (dbError.message.includes('row-level security') || dbError.code === '42501') {
          error.value = 'Vous n\'êtes pas autorisé à ajouter des documents à ce rapport'
        } else {
          error.value = dbError.message
        }
        
        // Try to clean up the uploaded file
        await deleteFromStorage(uploadData.path)
        return null
      }

      if (document) {
        documents.value.unshift(document)
        return document
      }

      return null
    } catch (e) {
      error.value = 'Erreur lors du téléchargement du document'
      console.error('Error uploading document:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteDocument(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      // First get the document to find its file path
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', id)
        .single()

      if (fetchError) {
        error.value = fetchError.message
        return false
      }

      if (!document) {
        error.value = 'Document non trouvé'
        return false
      }

      // Delete from storage
      const { error: storageError } = await deleteFromStorage(document.file_url)
      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Continue anyway to delete database record
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (dbError) {
        error.value = dbError.message
        return false
      }

      // Update local state
      documents.value = documents.value.filter(d => d.id !== id)
      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression du document'
      console.error('Error deleting document:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  function getDocumentUrl(fileUrl: string): string {
    return getPublicUrl(fileUrl)
  }

  function clearDocuments() {
    documents.value = []
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    documents,
    loading,
    error,
    // Actions
    fetchDocumentsByReportId,
    fetchAllDocuments,
    uploadDocument,
    deleteDocument,
    getDocumentUrl,
    clearDocuments,
    clearError
  }
})
