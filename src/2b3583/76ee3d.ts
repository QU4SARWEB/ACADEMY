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

export function getFilePath(userId: string, prefix: string, fileName: string): string {
  const ext = fileName.split('.').pop() || 'bin'
  const ts = Date.now()
  return `${userId}/${prefix}/${ts}-${Math.random().toString(36).slice(2, 8)}.${ext}`
}

export function uploadFileFromInput(
  bucket: string,
  userId: string,
  prefix: string,
  file: File
): Promise<string | null> {
  return uploadFile(bucket, getFilePath(userId, prefix, file.name), file)
}

export async function uploadMultipleFiles(
  bucket: string,
  userId: string,
  prefix: string,
  files: File[]
): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const url = await uploadFileFromInput(bucket, userId, prefix, file)
    if (url) urls.push(url)
  }
  return urls
}
