import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, NavLink } from 'react-router-dom'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useState, useEffect } from 'react'
import './App.css'
import Students from './admin/Students'
import AddStudent from './admin/AddStudent'
import EditStudent from './admin/EditStudent'
import Logs from './admin/Logs'
import Teachers from './admin/Teachers'
import AddTeacher from './admin/AddTeacher'
import EditTeacher from './admin/EditTeacher'
import TeacherDashboard from './teacher/Dashboard'
import { SupabaseAuthProvider, useSupabaseSession } from './hooks/useSupabaseSession'

function Header() {
  const { userProfile, signOut } = useSupabaseSession()

  const getNavItems = () => {
    if (!userProfile) {
      return [] as Array<{ to: string; label: string }>
    }

    if (userProfile.role === 'admin') {
      return [
        { to: '/admin/students', label: 'Diákok' },
        { to: '/admin/teachers', label: 'Tanárok' },
        { to: '/admin/logs', label: 'Naplóbejegyzés' },
      ]
    }

    if (userProfile.role === 'teacher') {
      return [{ to: '/teacher/dashboard', label: 'Dashboard' }]
    }

    return []
  }

  if (!userProfile) {
    return null
  }

  const navItems = getNavItems()

  return (
    <header className="app-header">
      <div className="app-header-left">
        {navItems.length > 0 && (
          <nav className="header-nav" aria-label="Fő navigáció">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `header-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <div className="app-header-right">
        <span className="user-email">{userProfile.email}</span>
        <span className="user-role">({userProfile.role === 'admin' ? 'Admin' : 'Tanár'})</span>
        <button type="button" onClick={signOut} className="logout-link">
          Kijelentkezés
        </button>
      </div>
    </header>
  )
}

type AllowedRoles = 'admin' | 'teacher' | 'all'

function ProtectedRoute({ children, allowedRoles = 'all' }: { children: ReactNode; allowedRoles?: AllowedRoles }) {
  const { userProfile, status } = useSupabaseSession()
  const location = useLocation()

  if (status === 'loading') {
    return <div className="loading-screen">Kapcsolódás az autentikációhoz…</div>
  }

  if (!userProfile) {
    return <Navigate to="/bejelentkezes" replace state={{ from: location.pathname }} />
  }

  // Check role-based access
  if (allowedRoles !== 'all' && userProfile.role !== allowedRoles) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

function UnauthorizedPage() {
  const navigate = useNavigate()
  const { userProfile } = useSupabaseSession()

  return (
    <div className="login-shell">
      <div>
        <p className="hero-eyebrow">BlueGate</p>
        <h1>Hozzáférés megtagadva</h1>
        <p className="hero-subtitle">Nincs jogosultságod ehhez az oldalhoz.</p>
      </div>
      <button 
        type="button" 
        className="ghost-button"
        onClick={() => navigate(userProfile?.role === 'admin' ? '/admin/students' : '/teacher/dashboard')}
      >
        Vissza a főoldalra
      </button>
    </div>
  )
}

function LoginPage() {
  const { userProfile, status, error, signOut, signIn } = useSupabaseSession()
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

    const result = await signIn({ email: formState.email, password: formState.password })

    if (!result.ok) {
      setFormError(result.message ?? 'Sikertelen bejelentkezés.')
      setIsSubmitting(false)
    }
  }

  // Redirect after successful login based on role
  useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'admin') {
        navigate('/admin/students')
      } else if (userProfile.role === 'teacher') {
        navigate('/teacher/dashboard')
      }
    }
  }, [userProfile, navigate])

  const isReady = status === 'ready'
  const showDisabledState = !isReady || isSubmitting
  const isLoggedIn = Boolean(userProfile)

  return (
    <div className="login-shell">
      <div>
        <p className="hero-eyebrow">BlueGate</p>
        <h1>Bejelentkezés</h1>
        <p className="hero-subtitle">Írd be az adataidat, hogy elérd a felületet.</p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

      {isLoggedIn ? (
        <div className="login-success">
          <p>
            Bejelentkezve mint <strong>{userProfile?.name ?? userProfile?.email}</strong>
          </p>
          <p className="helper-text">Jogosultság: {userProfile?.role === 'admin' ? 'Admin' : 'Tanár'}</p>
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
              placeholder="pelda@bluegate"
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
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Admin only routes */}
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles="admin"><Students /></ProtectedRoute>} />
          <Route path="/admin/add-student" element={<ProtectedRoute allowedRoles="admin"><AddStudent /></ProtectedRoute>} />
          <Route path="/admin/edit-student/:id" element={<ProtectedRoute allowedRoles="admin"><EditStudent /></ProtectedRoute>} />

          <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles="admin"><Teachers /></ProtectedRoute>} />
          <Route path="/admin/add-teacher" element={<ProtectedRoute allowedRoles="admin"><AddTeacher /></ProtectedRoute>} />
          <Route path="/admin/edit-teacher/:id" element={<ProtectedRoute allowedRoles="admin"><EditTeacher /></ProtectedRoute>} />
          
          <Route path="/admin/logs" element={<ProtectedRoute allowedRoles="admin"><Logs /></ProtectedRoute>} />

          {/* Teacher only routes */}
          <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles="teacher"><TeacherDashboard /></ProtectedRoute>} />
          
          {/* Routes accessible by both admin and teacher */}
          {/* <Route path="/shared/page" element={<ProtectedRoute allowedRoles="all"><SharedPage /></ProtectedRoute>} /> */}
          
          <Route path="*" element={<Navigate to="/bejelentkezes" replace />} />
        </Routes>
      </BrowserRouter>
    </SupabaseAuthProvider>
  )
}

export default App
