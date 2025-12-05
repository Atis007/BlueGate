import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { compare } from 'bcryptjs'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type AuthStatus = 'loading' | 'ready' | 'error'

type Role = 'admin' | 'teacher'

type AdminProfile = {
  id: number
  name: string
  email: string
  role: Role
}

type AdminRow = {
  id: number
  nev: string | null
  email: string
  jelszo: string
}

type AuthContextValue = {
  session: Session | null
  status: AuthStatus
  error: string | null
  supabaseClient: SupabaseClient | null
  adminProfile: AdminProfile | null
  signOut: () => Promise<void>
  signInWithAdmin: (credentials: { email: string; password: string }) => Promise<{ ok: boolean; message?: string }>
}

const ADMIN_SESSION_KEY = 'bluegate-admin-profile'
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'error')
  const [error, setError] = useState<string | null>(
    supabase ? null : 'A Supabase környezeti változók nincsenek beállítva.',
  )
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem(ADMIN_SESSION_KEY)
    return stored ? (JSON.parse(stored) as AdminProfile) : null
  })

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return
        if (error) {
          setError(error.message)
          setStatus('error')
        } else {
          setSession(data.session ?? null)
          setStatus('ready')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message)
        setStatus('error')
      })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
      setError(null)
      setStatus('ready')
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (adminProfile) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminProfile))
    } else {
      window.localStorage.removeItem(ADMIN_SESSION_KEY)
    }
  }, [adminProfile])

  const signOut = useCallback(async () => {
    setAdminProfile(null)
    if (supabase) {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        setError(signOutError.message)
      }
    }
  }, [])

  const signInWithAdmin = useCallback<AuthContextValue['signInWithAdmin']>(
    async ({ email, password }) => {
      if (!supabase) {
        const message = 'A Supabase kliens nincs konfigurálva.'
        setError(message)
        return { ok: false, message }
      }

      setStatus('loading')
      setError(null)

      const normalizedEmail = email.trim().toLowerCase()

      const { data, error: queryError } = await supabase
        .from('admin')
        .select('id, nev, email, jelszo')
        .ilike('email', normalizedEmail)
        .maybeSingle<AdminRow>()

      if (queryError) {
        console.error('Admin login query error', queryError)
        setStatus('ready')
        return { ok: false, message: queryError.message }
      }

      if (!data) {
        setStatus('ready')
        return { ok: false, message: 'Ismeretlen felhasználó vagy hibás jogosultsági beállítás.' }
      }

      const storedPassword = data.jelszo ?? ''
      const isBcryptHash = storedPassword.startsWith('$2')
      const passwordMatches = isBcryptHash
        ? await compare(password, storedPassword)
        : storedPassword === password

      if (!isBcryptHash) {
        console.warn(
          'Biztonsági figyelmeztetés: az admin tábla jelszava nincs bcrypt-tel titkosítva. Javasolt a hash-elt tárolás.',
        )
      }

      if (!passwordMatches) {
        setStatus('ready')
        return { ok: false, message: 'Hibás jelszó.' }
      }

      const profile: AdminProfile = {
        id: data.id,
        name: data.nev ?? 'Admin',
        email: data.email,
        role: 'admin',
      }

      setAdminProfile(profile)
      setStatus('ready')

      return { ok: true }
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      error,
      supabaseClient: supabase,
      adminProfile,
      signOut,
      signInWithAdmin,
    }),
    [session, status, error, adminProfile, signInWithAdmin, signOut],
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useSupabaseSession() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useSupabaseSession must be used within SupabaseAuthProvider')
  }
  return context
}
