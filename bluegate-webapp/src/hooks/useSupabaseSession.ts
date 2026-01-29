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

type UserProfile = {
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

type TeacherRow = {
  id: any // Changed to any to support both number/string, but likely string (uuid)
  nev: string | null
  email: string
  jelszo: string
}

type AuthContextValue = {
  session: Session | null
  status: AuthStatus
  error: string | null
  supabaseClient: SupabaseClient | null
  userProfile: UserProfile | null
  signOut: () => Promise<void>
  signIn: (credentials: { email: string; password: string }) => Promise<{ ok: boolean; message?: string }>
}

const ADMIN_SESSION_KEY = 'bluegate-admin-profile'
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'error')
  const [error, setError] = useState<string | null>(
    supabase ? null : 'A Supabase környezeti változók nincsenek beállítva.',
  )
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem(ADMIN_SESSION_KEY)
    return stored ? (JSON.parse(stored) as UserProfile) : null
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
    if (userProfile) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(userProfile))
    } else {
      window.localStorage.removeItem(ADMIN_SESSION_KEY)
    }
  }, [userProfile])

  const signOut = useCallback(async () => {
    setUserProfile(null)
    if (supabase) {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        setError(signOutError.message)
      }
    }
  }, [])

  const signIn = useCallback<AuthContextValue['signIn']>(
    async ({ email, password }) => {
      if (!supabase) {
        const message = 'A Supabase kliens nincs konfigurálva.'
        setError(message)
        return { ok: false, message }
      }

      setStatus('loading')
      setError(null)

      const normalizedEmail = email.trim().toLowerCase()

      // First, try to find in admin table
      const { data: adminData, error: adminQueryError } = await supabase
        .from('admin')
        .select('id, nev, email, jelszo')
        .ilike('email', normalizedEmail)
        .maybeSingle<AdminRow>()

      if (adminQueryError) {
        console.error('Admin login query error', adminQueryError)
      }

      // If found in admin table
      if (adminData) {
        const storedPassword = adminData.jelszo ?? ''
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

        const profile: UserProfile = {
          id: adminData.id,
          name: adminData.nev ?? 'Admin',
          email: adminData.email,
          role: 'admin',
        }

        setUserProfile(profile)
        setStatus('ready')
        return { ok: true }
      }

      // If not found in admin, try teacher table
      const { data: teacherData, error: teacherQueryError } = await supabase
        .from('teacher')
        .select('id, nev, email, jelszo')
        .ilike('email', normalizedEmail)
        .maybeSingle<TeacherRow>()

      if (teacherQueryError) {
        console.error('Teacher login query error', teacherQueryError)
        setStatus('ready')
        return { ok: false, message: teacherQueryError.message }
      }

      if (!teacherData) {
        setStatus('ready')
        return { ok: false, message: 'Ismeretlen felhasználó vagy hibás jogosultsági beállítás.' }
      }

      const storedPassword = teacherData.jelszo ?? ''
      const isBcryptHash = storedPassword.startsWith('$2')
      const passwordMatches = isBcryptHash
        ? await compare(password, storedPassword)
        : storedPassword === password

      if (!isBcryptHash) {
        console.warn(
          'Biztonsági figyelmeztetés: a teacher tábla jelszava nincs bcrypt-tel titkosítva. Javasolt a hash-elt tárolás.',
        )
      }

      try {
        await supabase.from('teacher_login_logs').insert({
          teacher_id: teacherData.id,
          success: !!passwordMatches,
          logged_at: new Date().toISOString(),
          error_message: passwordMatches ? null : 'Hibás jelszó'
        });
      } catch (logError) {
        console.error('Failed to log login attempt', logError);
      }

      if (!passwordMatches) {
        setStatus('ready')
        return { ok: false, message: 'Hibás jelszó.' }
      }

      const profile: UserProfile = {
        id: teacherData.id,
        name: teacherData.nev ?? 'Tanár',
        email: teacherData.email,
        role: 'teacher',
      }

      setUserProfile(profile)
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
      userProfile,
      signOut,
      signIn,
    }),
    [session, status, error, userProfile, signIn, signOut],
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
