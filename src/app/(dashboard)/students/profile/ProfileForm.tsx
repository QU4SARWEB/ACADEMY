'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Globe, Copy, Check } from 'lucide-react'
import { uploadFile, getAvatarPath } from '@/services/upload'
import { updatePublicProfile, getPublicProfileByUserId } from '@/features/profiles/actions'

const RANKS = ['Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant']

export default function ProfileForm({
  profile,
  action,
  role,
}: {
  profile: any
  action: (formData: FormData) => Promise<void>
  role: string
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [pubProfile, setPubProfile] = useState<any>(null)
  const [pubSlug, setPubSlug] = useState('')
  const [pubEnabled, setPubEnabled] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pubError, setPubError] = useState('')

  useEffect(() => {
    getPublicProfileByUserId(profile.id).then((data) => {
      if (data) {
        setPubProfile(data)
        setPubSlug(data.slug ?? '')
        setPubEnabled(data.is_public)
      }
    })
  }, [profile.id])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const path = getAvatarPath(profile.id, `avatar.${file.name.split('.').pop()}`)
    const url = await uploadFile('avatars', path, file)

    if (url) {
      setAvatarUrl(url)
      const supabase = (await import('@/lib/supabase/client')).createClient()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
      router.refresh()
    }
    setUploading(false)
  }

  async function handleSavePublic(formData: FormData) {
    setPubError('')
    const result = await updatePublicProfile(formData)
    if (result.error) {
      setPubError(result.error)
    } else {
      const data = await getPublicProfileByUserId(profile.id)
      setPubProfile(data)
      router.refresh()
    }
  }

  const publicUrl = pubSlug ? `${window.location.origin}/p/${pubSlug}` : ''

  async function copyLink() {
    if (publicUrl) {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="group relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#8B5CF6]/20 text-3xl font-bold text-[#8B5CF6]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                profile.full_name?.charAt(0)?.toUpperCase() ?? '?'
              )}
            </div>
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
              <Camera size={18} className="text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{profile.full_name}</h2>
            <p className="text-sm text-zinc-400">{profile.email}</p>
            {uploading && <p className="text-xs text-purple-400">Subiendo imagen...</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-400">Nombre completo</label>
            <input
              name="fullName"
              defaultValue={profile.full_name ?? ''}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400">Nombre de display</label>
            <input
              name="displayName"
              defaultValue={profile.display_name ?? ''}
              placeholder="Apodo público"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px rgba(139,92,246,0.15)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400">Riot ID</label>
            <input
              name="riotId"
              defaultValue={profile.riot_id ?? ''}
              placeholder="Jugador#1234"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px rgba(139,92,246,0.15)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400">Rango Valorant</label>
            <select
              name="rank"
              defaultValue={profile.rank ?? ''}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
            >
              <option value="">Seleccionar...</option>
              {RANKS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-400">Biografía</label>
            <textarea
              name="bio"
              rows={3}
              defaultValue={profile.bio ?? ''}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px rgba(139,92,246,0.15)]"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-400">País</label>
            <input
              name="country"
              defaultValue={profile.country ?? ''}
              placeholder="Ej: Perú"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400">Email institucional</label>
            <input
              name="institutionalEmail"
              defaultValue={profile.institutional_email ?? ''}
              placeholder="ej: nombre@qu4sar.edu"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400">Beca</label>
            <p className="mt-1 text-sm text-zinc-300">
              {profile.scholarship ? 'Sí (completa)' : 'No'}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-zinc-300">Redes sociales</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-400">Discord</label>
              <input
                name="socialDiscord"
                defaultValue={profile.social_discord ?? ''}
                placeholder="usuario#0000"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400">YouTube</label>
              <input
                name="socialYoutube"
                defaultValue={profile.social_youtube ?? ''}
                placeholder="https://youtube.com/..."
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400">Twitter</label>
              <input
                name="socialTwitter"
                defaultValue={profile.social_twitter ?? ''}
                placeholder="@usuario"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400">Twitch</label>
              <input
                name="socialTwitch"
                defaultValue={profile.social_twitch ?? ''}
                placeholder="https://twitch.tv/..."
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
        >
          Guardar cambios
        </button>
      </form>

      <div className="border-t border-zinc-800 pt-6">
        <h3 className="mb-4 font-heading text-lg font-bold text-white">Perfil público</h3>

        <form action={handleSavePublic} className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                name="isPublic"
                checked={pubEnabled}
                onChange={(e) => setPubEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-zinc-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#8B5CF6] peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm text-zinc-300">Perfil público</span>
            <Globe size={14} className="text-zinc-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400">Slug (URL única)</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-zinc-500">/{' '}</span>
              <input
                name="slug"
                value={pubSlug}
                onChange={(e) => setPubSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))}
                placeholder="tu-nombre-quasar"
                className="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
              />
            </div>
            {pubError && <p className="mt-1 text-xs text-red-400">{pubError}</p>}
          </div>

          {pubEnabled && publicUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-[#111] px-3 py-2">
              <a href={publicUrl} target="_blank" className="flex-1 text-sm text-purple-400 underline truncate">
                {publicUrl}
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 rounded p-1 text-zinc-500 transition hover:text-white"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
          )}

          <button
            type="submit"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Guardar perfil público
          </button>
        </form>
      </div>
    </div>
  )
}
