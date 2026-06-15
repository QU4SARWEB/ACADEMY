import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/', '/login', '/register', '/reset-password', '/auth/callback', '/p/']
const rolePrefixes = ['/students', '/players', '/coaches'] as const
const ROLE_TO_PREFIX: Record<string, string> = {
  coach: '/coaches',
  student: '/students',
  player: '/players',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = publicRoutes.some((route) => pathname.startsWith(route))
  const isApiRoute = pathname.startsWith('/api/')

  if (isPublic && !isApiRoute) {
    return NextResponse.next()
  }

  const { supabaseResponse, supabase, user } = await updateSession(request)

  if (!user) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=pending', request.url))
  }

  const matchedPrefix = rolePrefixes.find((prefix) => pathname.startsWith(prefix))
  if (matchedPrefix) {
    const expectedPrefix = ROLE_TO_PREFIX[profile.role]
    if (matchedPrefix !== expectedPrefix) {
      const targetPrefix = ROLE_TO_PREFIX[profile.role] || `/${profile.role}`
      return NextResponse.redirect(new URL(`${targetPrefix}/dashboard`, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
