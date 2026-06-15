import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Globe, Users, Swords, Calendar, ExternalLink } from 'lucide-react'

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const rawSlug = (await params).slug
  const slug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const supabase = await createClient()

  let { data: pubProfile } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!pubProfile) {
    const { data: fallback } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('slug', rawSlug)
      .maybeSingle()
    pubProfile = fallback
  }

  if (!pubProfile || !pubProfile.is_public) {
    notFound()
  }

  const profileId = pubProfile.profile_id

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, riot_id, rank, role, bio')
    .eq('id', profileId)
    .maybeSingle()

  const displayName = pubProfile.display_name ?? profile?.full_name ?? 'Usuario'
  const avatarUrl = pubProfile.avatar_url ?? profile?.avatar_url ?? null
  const bio = pubProfile.bio ?? profile?.bio ?? null
  const socialLinks = pubProfile.social_links as Record<string, string> | null

  void supabase
    .from('public_profiles')
    .update({ views: (pubProfile.views ?? 0) + 1 })
    .eq('id', pubProfile.id)

  const { data: enrollments } = profileId ? await supabase
    .from('enrollments')
    .select('*, courses(name, slug), seasons(name)')
    .eq('profile_id', profileId)
    .eq('status', 'active') : { data: [] }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-purple-900/40 via-zinc-900 to-zinc-950">
        {pubProfile.banner_url && (
          <img src={pubProfile.banner_url} alt="" className="h-full w-full object-cover opacity-50" />
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-12">
        <div className="-mt-16 flex flex-col items-center text-center">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#0A0A0A] bg-[#8B5CF6]/20 text-4xl font-bold text-[#8B5CF6]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <h1 className="mt-4 font-heading text-2xl font-bold text-white">{displayName}</h1>
          {profile?.riot_id && (
            <p className="text-sm text-zinc-400">{profile.riot_id}</p>
          )}
          {profile?.rank && (
            <p className="mt-1 text-sm text-purple-400">Rango: {profile.rank}</p>
          )}
          {profile?.role && (
            <span className="mt-2 inline-block rounded-full bg-[#8B5CF6]/10 px-3 py-1 text-xs font-medium text-[#8B5CF6] capitalize">
              {profile.role === 'coach' ? 'Coach' : profile.role === 'student' ? 'Estudiante' : 'Jugador'}
            </span>
          )}

          {bio && (
            <p className="mt-4 max-w-md text-sm text-zinc-400">{bio}</p>
          )}

          {socialLinks && Object.keys(socialLinks).length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {Object.entries(socialLinks).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-white"
                >
                  <ExternalLink size={12} />
                  {platform}
                </a>
              ))}
            </div>
          )}
        </div>

        {(enrollments ?? []).length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-white">Cursos activos</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(enrollments ?? []).map((enr: any) => (
                <div key={enr.id} className="glass rounded-xl p-4">
                  <p className="font-medium text-white">{enr.courses?.name}</p>
                  <p className="text-xs text-zinc-500">{enr.seasons?.name}</p>
                  {enr.current_module && (
                    <p className="mt-1 text-xs text-purple-400">Módulo {enr.current_module}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-zinc-600">
          {pubProfile.views ?? 0} visitas · QU4SAR
        </p>
      </div>
    </div>
  )
}
