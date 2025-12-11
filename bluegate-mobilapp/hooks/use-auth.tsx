import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { compare } from 'bcryptjs';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type StudentProfile = {
  id: number;
  name: string;
  indexNumber: string;
};

type StudentRow = {
  id: number;
  nev: string | null;
  indexszam: string;
  jelszo: string;
};

type AuthContextValue = {
  session: Session | null;
  status: AuthStatus;
  error: string | null;
  supabaseClient: SupabaseClient | null;
  studentProfile: StudentProfile | null;
  signOut: () => Promise<void>;
  signIn: (credentials: { indexNumber: string; password: string }) => Promise<{ ok: boolean; message?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'error');
  const [error, setError] = useState<string | null>(
    supabase ? null : 'A Supabase környezeti változók nincsenek beállítva.'
  );
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  // Initialize - just set status to unauthenticated if supabase is available
  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      return;
    }
    
    // Since we're using custom auth with index numbers, 
    // we start as unauthenticated and user must log in
    setStatus('unauthenticated');
  }, []);

  const fetchStudentProfile = async (indexNumber: string) => {
    if (!supabase || !indexNumber) {
      setStatus('unauthenticated');
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('diak')
        .select('id, nev, indexszam')
        .eq('indexszam', indexNumber)
        .maybeSingle<StudentRow>();

      if (queryError) {
        console.error('Error fetching student profile:', queryError);
        setStatus('unauthenticated');
        return;
      }

      if (data) {
        setStudentProfile({
          id: data.id,
          name: data.nev ?? '',
          indexNumber: data.indexszam,
        });
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }
    } catch (err) {
      console.error('Error fetching student profile:', err);
      setStatus('unauthenticated');
    }
  };

  const signOut = useCallback(async () => {
    setStudentProfile(null);
    if (supabase) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
      }
    }
    setStatus('unauthenticated');
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async ({ indexNumber, password }) => {
      if (!supabase) {
        const message = 'A Supabase kliens nincs konfigurálva.';
        setError(message);
        return { ok: false, message };
      }

      setStatus('loading');
      setError(null);

      const normalizedIndexNumber = indexNumber.trim();

      try {
        // Query student from 'diak' table by index number
        console.log('Attempting login with index number:', normalizedIndexNumber);
        
        const { data: studentData, error: studentQueryError } = await supabase
          .from('diak')
          .select('id, nev, indexszam, jelszo')
          .eq('indexszam', normalizedIndexNumber)
          .maybeSingle<StudentRow>();

        console.log('Query result:', { studentData, studentQueryError });

        if (studentQueryError) {
          console.error('Student login query error', studentQueryError);
          setStatus('unauthenticated');
          setError('Hiba történt a bejelentkezés során.');
          return { ok: false, message: 'Hiba történt a bejelentkezés során.' };
        }

        if (!studentData) {
          console.log('No student found with index number:', normalizedIndexNumber);
          setStatus('unauthenticated');
          setError('Hibás indexszám vagy jelszó.');
          return { ok: false, message: 'Hibás indexszám vagy jelszó.' };
        }

        // Compare password using bcrypt
        const storedPassword = studentData.jelszo ?? '';
        console.log('Stored password hash starts with $2:', storedPassword.startsWith('$2'));
        
        const isBcryptHash = storedPassword.startsWith('$2');
        const passwordMatches = isBcryptHash
          ? await compare(password, storedPassword)
          : password === storedPassword;

        console.log('Password matches:', passwordMatches);

        if (!passwordMatches) {
          setStatus('unauthenticated');
          setError('Hibás indexszám vagy jelszó.');
          return { ok: false, message: 'Hibás indexszám vagy jelszó.' };
        }

        // Set student profile on successful login
        setStudentProfile({
          id: studentData.id,
          name: studentData.nev ?? '',
          indexNumber: studentData.indexszam,
        });

        setStatus('authenticated');
        setError(null);
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ismeretlen hiba történt.';
        setStatus('unauthenticated');
        setError(message);
        return { ok: false, message };
      }
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      error,
      supabaseClient: supabase,
      studentProfile,
      signOut,
      signIn,
    }),
    [session, status, error, studentProfile, signOut, signIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
