'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signUp(_prev: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Error al crear usuario' }
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email,
    full_name: fullName,
    role,
    is_active: true,
  })

  if (profileError) {
    return { error: profileError.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

const ROLE_PREFIX: Record<string, string> = {
  coach: 'coaches',
  student: 'students',
  player: 'players',
}

export async function signIn(_prev: { error?: string; success?: boolean; redirect?: string } | undefined, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    return { error: 'Tu cuenta está desactivada. Contacta a un coach.' }
  }

  revalidatePath('/', 'layout')
  return { success: true, redirect: `/${ROLE_PREFIX[profile.role] || profile.role}/dashboard` }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function resetPassword(_prev: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirect_to=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(_prev: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  redirect('/login')
}
