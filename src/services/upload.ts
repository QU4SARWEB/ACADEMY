import { createClient } from '@/lib/supabase/client'

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const supabase = createClient()

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
  })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
  return urlData?.publicUrl ?? null
}

export async function deleteFile(bucket: string, path: string) {
  const supabase = createClient()
  await supabase.storage.from(bucket).remove([path])
}

export function getAvatarPath(userId: string, fileName: string): string {
  return `avatars/${userId}/${fileName}`
}

export function getBannerPath(userId: string, fileName: string): string {
  return `banners/${userId}/${fileName}`
}
