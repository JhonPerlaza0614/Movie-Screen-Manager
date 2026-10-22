import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const links = [
  { label: 'RoyalKeys', href: 'https://royalkeys.cc/', tone: 'royal' },
  { label: 'NFKeys', href: 'https://www.nfkeys.store/', tone: 'nf' },
  {
    label: 'G2A',
    href: 'https://dashboard.g2a.com/es/orders/your-keys?activeTab=orders&page=1',
    tone: 'g2a',
  },
]

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({
    key: '',
    buyer: '',
    provider: 'royalkeys',
  })
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authMode, setAuthMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const isConfigured = Boolean(supabase)
  const isG2a = form.provider === 'g2a'
  const providerLabel = useMemo(
    () => links.find((link) => link.tone === form.provider)?.label ?? form.provider,
    [form.provider],
  )

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      setAuthLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setAuthLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) loadRecords()
  }, [session])

  async function loadRecords() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('pantalla_keys')
      .select('id, key_pantalla, numero_comprador, proveedor, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage({ type: 'error', text: `No se pudieron cargar los registros: ${error.message}` })
      return
    }
    setRecords(data ?? [])
  }

  async function handleAuth(event) {
    event.preventDefault()
    setMessage({ type: '', text: '' })
    setAuthLoading(true)
    const action =
      authMode === 'login'
        ? supabase.auth.signInWithPassword(authForm)
        : supabase.auth.signUp(authForm)
    const { data, error } = await action
    setAuthLoading(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    if (authMode === 'signup' && !data.session) {
      setMessage({ type: 'success', text: 'Cuenta creada. Revisa tu correo para confirmar el acceso.' })
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!supabase || !session) return
    setLoading(true)
    setMessage({ type: '', text: '' })

    const value = isG2a
      ? `${form.email.trim()} / ${form.password}`
      : form.key.trim()
    const { error } = await supabase.from('pantalla_keys').insert({
      key_pantalla: value,
      numero_comprador: form.buyer.trim(),
      proveedor: form.provider,
    })

    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: `No se pudo guardar: ${error.message}` })
      return
    }
    setForm({ key: '', buyer: '', provider: 'royalkeys', email: '', password: '' })
    setMessage({ type: 'success', text: 'Registro guardado correctamente.' })
    loadRecords()
  }

  async function handleDelete(id) {
    if (!supabase || !window.confirm('¿Eliminar este registro?')) return
    const { error } = await supabase.from('pantalla_keys').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: `No se pudo eliminar: ${error.message}` })
      return
    }
    setRecords((current) => current.filter((record) => record.id !== id))
  }

  async function handleLogout() {
    await supabase?.auth.signOut()
    setRecords([])
  }

  function renderAuth() {
    return (
      <main className="auth-card">
        <div className="brand-mark">MS</div>
        <p className="eyebrow">Movie Screen Manager</p>
        <h1>{authMode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h1>
        <p className="muted">
          {authMode === 'login'
            ? 'Accede para administrar tus claves y cuentas.'
            : 'Regístrate para guardar tus registros de forma privada.'}
        </p>
        <form onSubmit={handleAuth} className="stack-form">
          <label>Correo electrónico<input type="email" required value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></label>
          <label>Contraseña<input type="password" required minLength="6" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /></label>
          <button className="primary-button" disabled={authLoading} type="submit">
            {authLoading ? 'Procesando...' : authMode === 'login' ? 'Iniciar sesión' : 'Registrarme'}
          </button>
        </form>
        <button className="text-button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
          {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo una cuenta'}
        </button>
        {message.text && <p className={`notice ${message.type}`}>{message.text}</p>}
      </main>
    )
  }

  if (!isConfigured) {
    return (
      <div className="app-shell centered">
        <main className="auth-card setup-card">
          <div className="brand-mark">MS</div>
          <p className="eyebrow">Configuración pendiente</p>
          <h1>Conecta Supabase</h1>
          <p className="muted">Completa <code>.env</code> con tu URL y clave anónima de Supabase y reinicia el servidor de desarrollo.</p>
          <div className="env-preview">VITE_SUPABASE_URL=...<br />VITE_SUPABASE_ANON_KEY=...</div>
        </main>
      </div>
    )
  }

  if (authLoading) return <div className="app-shell centered"><div className="loader">Cargando...</div></div>
  if (!session) return <div className="app-shell centered">{renderAuth()}</div>

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark small">MS</span><span>Movie Screen <strong>Manager</strong></span></a>
        <nav aria-label="Enlaces de proveedores">
          {links.map((link) => <a className={`provider-link ${link.tone}`} href={link.href} target="_blank" rel="noreferrer" key={link.label}><span className="link-dot" />{link.label}<span className="external">↗</span></a>)}
        </nav>
        <button className="logout-button" onClick={handleLogout}>Cerrar sesión</button>
      </header>

      <main className="dashboard">
        <section className="intro">
          <div><p className="eyebrow">Panel de control</p><h1>Gestiona tus accesos</h1><p className="muted">Guarda y organiza las claves de tus pantallas en un solo lugar.</p></div>
          <div className="stat"><strong>{records.length}</strong><span>registros guardados</span></div>
        </section>

        <section className="content-grid">
          <form className="panel form-panel" onSubmit={handleSubmit}>
            <div className="panel-heading"><div><p className="eyebrow">Nuevo registro</p><h2>Añadir acceso</h2></div><span className="step">01</span></div>
            <label>Proveedor<select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}><option value="royalkeys">RoyalKeys</option><option value="nfkeys">NFKeys</option><option value="g2a">G2A</option></select></label>
            {isG2a ? <div className="credentials-grid"><label>Correo de G2A<input type="email" required value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" /></label><label>Contraseña<input type="password" required value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label></div> : <label>Key de pantalla<input required value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="Pega la key aquí" /></label>}
            <label>Número de comprador<input required value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} placeholder="Ej. 100245" /></label>
            <p className="helper">Proveedor seleccionado: <strong>{providerLabel}</strong>{isG2a && ' · Se guardará como correo / contraseña'}</p>
            <button className="primary-button" disabled={loading} type="submit">{loading ? 'Guardando...' : 'Guardar registro'}<span>→</span></button>
            {message.text && <p className={`notice ${message.type}`}>{message.text}</p>}
          </form>

          <section className="panel records-panel">
            <div className="panel-heading"><div><p className="eyebrow">Biblioteca</p><h2>Tus registros</h2></div><span className="count-badge">{records.length}</span></div>
            {records.length === 0 ? <div className="empty-state"><div className="empty-icon">⌁</div><h3>Aún no hay registros</h3><p>Completa el formulario para añadir tu primer acceso.</p></div> : <div className="records-list">{records.map((record) => <article className="record" key={record.id}><div className={`provider-icon ${record.proveedor}`}>{record.proveedor === 'g2a' ? 'G' : record.proveedor === 'nfkeys' ? 'N' : 'R'}</div><div className="record-info"><div className="record-title"><strong>{record.proveedor}</strong><time>{new Date(record.created_at).toLocaleDateString('es-ES')}</time></div><code>{record.key_pantalla}</code><span>Comprador · {record.numero_comprador}</span></div><button className="delete-button" aria-label="Eliminar registro" onClick={() => handleDelete(record.id)}>×</button></article>)}</div>}
          </section>
        </section>
      </main>
      <footer>Los datos se almacenan de forma privada y segura en tu proyecto de Supabase.</footer>
    </div>
  )
}

export default App
