import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import './App.css'
import Students from './admin/Students'
import AddStudent from './admin/AddStudent'
import EditStudent from './admin/EditStudent'
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

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { adminProfile, status } = useSupabaseSession()
  const location = useLocation()

  if (status === 'loading') {
    return <div className="loading-screen">Kapcsolódás az autentikációhoz…</div>
  }

  if (!adminProfile) {
    return <Navigate to="/bejelentkezes" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

function LoginPage() {
  const { adminProfile, status, error, signOut, signInWithAdmin } = useSupabaseSession()
  const navigate = useNavigate()
  const [formState, setFormState] = useState({ email: '', password: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    const result = await signInWithAdmin({ email: formState.email, password: formState.password })

    if (!result.ok) {
      setFormError(result.message ?? 'Sikertelen bejelentkezés.')
      setIsSubmitting(false)
    } else {
      navigate('/admin/students')
    }
  }

  const isReady = status === 'ready'
  const showDisabledState = !isReady || isSubmitting
  const isLoggedIn = Boolean(adminProfile)

  return (
    <div className="login-shell">
      <div>
        <p className="hero-eyebrow">BlueGate Admin</p>
        <h1>Bejelentkezés</h1>
        <p className="hero-subtitle">Írd be az admin tábla adatait, hogy elérd a felületet.</p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

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
        <Routes>
          <Route path="/" element={<Navigate to="/bejelentkezes" replace />} />
          <Route path="/bejelentkezes" element={<LoginPage />} />
          <Route path="/admin/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/admin/add-student" element={<ProtectedRoute><AddStudent /></ProtectedRoute>} />
          <Route path="/admin/edit-student/:id" element={<ProtectedRoute><EditStudent /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/bejelentkezes" replace />} />
        </Routes>
      </BrowserRouter>
    </SupabaseAuthProvider>
  )
}

export default App
