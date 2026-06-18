import { supabase } from '@/304244'

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
  return urlData?.publicUrl ?? null
}

export function getAvatarPath(userId: string, fileName: string): string {
  return `${userId}/${fileName}`
}

export function getBannerPath(userId: string, fileName: string): string {
  return `${userId}/${fileName}`
}
