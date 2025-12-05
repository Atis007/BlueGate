import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import './App.css'
import Students from './admin/Students'
import AddStudent from './admin/AddStudent'
import EditStudent from './admin/EditStudent'

function App() {
import { SupabaseAuthProvider, useSupabaseSession } from './hooks/useSupabaseSession'

function Header() {
  const { adminProfile, signOut } = useSupabaseSession()

  if (!adminProfile) {
    return null
  }

  return (
    <header className="app-header">
      <span className="user-email">{adminProfile.email}</span>
      <button type="button" onClick={signOut} className="logout-link">
        Kijelentkezés
      </button>
    </header>
  )
}

type Role = 'admin' | 'teacher'

const ROLE_ACCESS: Record<Role, string[]> = {
  admin: ['/', '/bejelentkezes'],
  teacher: ['/bejelentkezes'],
}

const PROTECTED_PATHS: string[] = ['/dashboard', '/felulet']

const normalizePath = (path: string) => {
  if (!path) return '/'
  const trimmed = path.replace(/\/+$/, '')
  return trimmed.length === 0 ? '/' : trimmed
}

const resolveRoleFromContext = (
  sessionRole: Role | undefined,
  metadataRole: string | undefined,
): Role => {
  if (sessionRole) {
    return sessionRole
  }
  if (metadataRole === 'teacher') {
    return 'teacher'
  }
  return 'admin'
}

function RouteMiddleware({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { session, status, adminProfile } = useSupabaseSession()
  const normalizedPath = normalizePath(location.pathname)
  const activeRole = resolveRoleFromContext(adminProfile?.role, session?.user?.app_metadata?.role)
  const allowedPaths = ROLE_ACCESS[activeRole]
  const isProtectedPath = PROTECTED_PATHS.includes(normalizedPath)
  const isAuthenticated = Boolean(session || adminProfile)

  if (!allowedPaths.includes(normalizedPath)) {
    return <Navigate to="/bejelentkezes" replace state={{ from: location.pathname }} />
  }

  if (status === 'loading') {
    return <div className="loading-screen">Kapcsolódás az autentikációhoz…</div>
  }

  if (isProtectedPath && !isAuthenticated) {
    return <Navigate to="/bejelentkezes" replace state={{ from: normalizedPath }} />
  }

  return children
}

function LoginPage() {
  const { adminProfile, status, error, signOut, signInWithAdmin } = useSupabaseSession()
  const [formState, setFormState] = useState({ email: '', password: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    setSuccessMessage(null)

    const result = await signInWithAdmin({ email: formState.email, password: formState.password })

    if (!result.ok) {
      setFormError(result.message ?? 'Sikertelen bejelentkezés.')
    } else {
      setSuccessMessage('Sikeres bejelentkezés! A felület hamarosan további modulokkal bővül.')
    }

    setIsSubmitting(false)
  }

  const isReady = status === 'ready'
  const showDisabledState = !isReady || isSubmitting
  const isLoggedIn = Boolean(adminProfile)

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/students" replace />} />
        <Route path="/admin/students" element={<Students />} />
        <Route path="/admin/add-student" element={<AddStudent />} />
        <Route path="/admin/edit-student/:id" element={<EditStudent />} />
      </Routes>
    </Router>
    <div className="login-shell">
      <div>
        <p className="hero-eyebrow">BlueGate Admin</p>
        <h1>Bejelentkezés</h1>
        <p className="hero-subtitle">Írd be az admin tábla adatait, hogy elérd a felületet.</p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}
      {successMessage && <p className="alert alert-success">{successMessage}</p>}

      {isLoggedIn ? (
        <div className="login-success">
          <p>
            Bejelentkezve mint <strong>{adminProfile?.name ?? adminProfile?.email}</strong>
          </p>
          <p className="helper-text">Jogosultság: {adminProfile?.role ?? 'admin'}</p>
          <button type="button" onClick={signOut} className="ghost-button">
            Kijelentkezés
          </button>
        </div>
      ) : (
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Felhasználónév (e-mail)</span>
            <input
              type="email"
              name="email"
              placeholder="admin@bluegate"
              autoComplete="username"
              value={formState.email}
              onChange={handleInputChange}
              disabled={showDisabledState}
              required
            />
          </label>
          <label>
            <span>Jelszó</span>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={formState.password}
              onChange={handleInputChange}
              disabled={showDisabledState}
              required
            />
          </label>
          <button type="submit" disabled={showDisabledState}>
            {isSubmitting ? 'Bejelentkezés…' : 'Belépés'}
          </button>
          {!isReady && <small className="helper-text">Kapcsolódás Supabase-hez…</small>}
        </form>
      )}
    </div>
  )
}

function App() {
  return (
    <SupabaseAuthProvider>
      <BrowserRouter>
        <Header />
        <RouteMiddleware>
          <Routes>
            <Route path="/" element={<Navigate to="/bejelentkezes" replace />} />
            <Route path="/bejelentkezes" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/bejelentkezes" replace />} />
          </Routes>
        </RouteMiddleware>
      </BrowserRouter>
    </SupabaseAuthProvider>
  )
}

export default App
