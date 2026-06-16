'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Link2, FileText, X, Loader } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SubmitTaskForm({
  taskId,
  courseId,
  dueDate,
}: {
  taskId: string
  courseId: string
  dueDate: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [link, setLink] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...dropped].slice(0, 5))
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    setFiles((prev) => [...prev, ...selected].slice(0, 5))
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (files.length === 0 && !link) {
      setError('Sube al menos un archivo o proporciona un enlace')
      return
    }
    setUploading(true)
    setError('')

    try {
      const uploaded: { url: string; name: string }[] = []

      for (const file of files) {
        const filePath = `task-submissions/${taskId}/${Date.now()}-${file.name}`
        const { data, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file, { contentType: file.type || 'application/octet-stream' })

        if (uploadError) throw new Error(uploadError.message)

        const { data: urlData } = await supabase.storage
          .from('uploads')
          .getPublicUrl(filePath)

        uploaded.push({ url: urlData.publicUrl, name: file.name })
      }

      if (link) {
        uploaded.push({ url: link, name: 'Enlace externo' })
      }

      const formData = new FormData()
      formData.append('taskId', taskId)
      formData.append('courseId', courseId)
      formData.append('dueDate', dueDate)
      formData.append('filesJson', JSON.stringify(uploaded))

      const res = await fetch('/students/tasks/submit', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Error al enviar tarea')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drag & Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragOver
            ? 'border-[#8B5CF6] bg-[#8B5CF6]/5'
            : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        <Upload size={32} className="mx-auto text-zinc-500" />
        <p className="mt-2 text-sm text-zinc-400">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p className="mt-1 text-xs text-zinc-600">PDF, imágenes, video, audio — máximo 5 archivos</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mp3,.wav,.zip,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#111] px-4 py-2.5">
              <FileText size={16} className="text-purple-400 shrink-0" />
              <span className="flex-1 truncate text-sm text-zinc-300">{file.name}</span>
              <span className="text-xs text-zinc-600">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <button type="button" onClick={() => removeFile(i)} className="text-zinc-500 hover:text-red-400">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link input */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <Link2 size={14} /> O pega un enlace externo
        </label>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://drive.google.com/..."
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="btn-glow flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50"
      >
        {uploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
        {uploading ? 'Subiendo...' : 'Entregar tarea'}
      </button>
    </form>
  )
}
