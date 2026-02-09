import { supabase } from './supabase'

const BUCKET_NAME = 'menu-images'

/**
 * Upload an image to Supabase Storage
 * @param file - The file to upload
 * @param fileName - Optional custom filename (will be sanitized)
 * @returns The public URL of the uploaded image
 */
export async function uploadMenuImage(file: File, fileName?: string): Promise<string> {
  try {
    // Sanitize filename
    const timestamp = Date.now()
    const sanitizedName = fileName 
      ? `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      : `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    console.log('[Storage] Uploading image:', sanitizedName)

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(sanitizedName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('[Storage] Upload error:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    console.log('[Storage] Upload successful:', publicUrl)
    return publicUrl
  } catch (error: any) {
    console.error('[Storage] Upload failed:', error)
    throw error
  }
}

/**
 * Delete an image from Supabase Storage
 * @param imageUrl - The full public URL of the image to delete
 * @returns True if successful
 */
export async function deleteMenuImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract the file path from the URL
    const urlParts = imageUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`)
    if (urlParts.length !== 2) {
      console.warn('[Storage] Invalid image URL format:', imageUrl)
      return false
    }

    const filePath = urlParts[1]
    console.log('[Storage] Deleting image:', filePath)

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('[Storage] Delete error:', error)
      throw new Error(`Failed to delete image: ${error.message}`)
    }

    console.log('[Storage] Delete successful')
    return true
  } catch (error: any) {
    console.error('[Storage] Delete failed:', error)
    return false
  }
}

/**
 * Get the public URL for an image in storage
 * @param filePath - The path of the file in storage
 * @returns The public URL
 */
export function getMenuImageUrl(filePath: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)
  
  return publicUrl
}

/**
 * Check if a URL is a Supabase Storage URL
 * @param url - The URL to check
 * @returns True if it's a Supabase Storage URL
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/')
}

/**
 * Validate file before upload
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return `File size must be less than 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed types: JPEG, PNG, WebP, GIF`
  }

  return null
}
