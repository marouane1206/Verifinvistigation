import { supabase } from './supabase'

const BUCKET_NAME = 'documents'

/**
 * Storage configuration for Supabase
 * Handles document uploads, URL retrieval, and deletion
 */

// Upload a document to the 'documents' bucket
export async function uploadDocument(
  file: File,
  path: string
): Promise<{ data: { path: string } | null; error: Error | null }> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${path}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (error) {
      console.error('Upload error:', error)
      return { data: null, error }
    }

    return { data: { path: data.path }, error: null }
  } catch (error) {
    console.error('Upload exception:', error)
    return { data: null, error: error as Error }
  }
}

// Get public URL for a document
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)
  
  return data.publicUrl
}

// Delete a document from the 'documents' bucket
export async function deleteDocument(path: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return { error }
    }

    return { error: null }
  } catch (error) {
    console.error('Delete exception:', error)
    return { error: error as Error }
  }
}

// Upload multiple documents
export async function uploadDocuments(
  files: File[],
  path: string
): Promise<{ data: { path: string }[]; error: Error | null }> {
  try {
    const uploadPromises = files.map(file => uploadDocument(file, path))
    const results = await Promise.all(uploadPromises)

    const successfulUploads = results
      .filter(result => result.data !== null)
      .map(result => ({ path: result.data!.path }))

    const errors = results
      .filter(result => result.error !== null)
      .map(result => result.error)

    if (errors.length > 0) {
      console.warn('Some uploads failed:', errors)
    }

    return { data: successfulUploads, error: errors.length > 0 ? new Error('Some files failed to upload') : null }
  } catch (error) {
    console.error('Upload documents exception:', error)
    return { data: [], error: error as Error }
  }
}