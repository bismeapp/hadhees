import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookMarked, BookOpen, BookText, Clock3, Compass, Search, Settings2 } from 'lucide-react'
import { getDataManifest } from '../services/dataLoader'
import { useAppState } from '../hooks/useLibraryState'
import type { DataManifest } from '../types'

const navigation = [
  { to: '/', label: 'Home', icon: Compass, end: true },
  { to: '/quran', label: 'The Quran', icon: BookOpen },
  { to: '/hadith', label: 'Hadith library', icon: BookText },
]

const personalNavigation = [
  { to: '/bookmarks', label: 'Bookmarks', icon: BookMarked },
  { to: '/history', label: 'Reading history', icon: Clock3 },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export function LibraryLayout() {
  const [manifest, setManifest] = useState<DataManifest>()
  const [manifestError, setManifestError] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { preferences } = useAppState()

  const loadManifest = () => {
    setManifestError('')
    getDataManifest().then(setManifest).catch((error: unknown) => {
      setManifestError(error instanceof Error ? error.message : 'Local data could not be reached.')
    })
  }

  useEffect(() => {
    queueMicrotask(loadManifest)
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navigate('/search')
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [navigate])

  const pageTitle =
    location.pathname.startsWith('/quran') ? 'The Noble Quran' :
      location.pathname.startsWith('/hadith') ? 'Hadith collections' :
        location.pathname.startsWith('/search') ? 'Search the library' :
          location.pathname.startsWith('/bookmarks') ? 'Your bookmarks' :
            location.pathname.startsWith('/history') ? 'Reading history' :
              location.pathname.startsWith('/settings') ? 'Preferences' : 'A quiet place to read'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/" aria-label="Go to home">
          <img className="brand-logo" src="/assets/bismi-radio-logo.png" alt="BISMI RADIO" />
          <span><strong>BISMI RADIO</strong><small>QURAN &amp; HADITH READER</small></span>
        </NavLink>
        <div className="sidebar-caption">LIBRARY</div>
        <nav className="nav-list" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-caption personal-caption">YOUR SPACE</div>
        <nav className="nav-list" aria-label="Personal navigation">
          {personalNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <span className="ornament">۞</span>
          <p>“Indeed, in the remembrance of Allah do hearts find rest.”</p>
          <small>QUR'AN 13:28</small>
        </div>
        <div className="sidebar-footer">BISMI RADIO · QURAN &amp; HADITH</div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb"><span>BISMI RADIO</span><span className="breadcrumb-dot">/</span>{pageTitle}</div>
          <div className="topbar-actions">
            <NavLink to="/search" className="top-search"><Search size={16} /><span>Search the library</span><kbd>{navigator.platform.includes('Mac') ? '⌘ K' : 'Ctrl K'}</kbd></NavLink>
            <div className="language-chip"><span className="language-dot" />{preferences.quranLanguage}</div>
          </div>
        </header>
        {manifestError && (
          <div className="data-alert" role="alert">
            <div><strong>Local Quran and Hadith data is unavailable.</strong><span>{manifestError}</span></div>
            <button className="text-button" onClick={loadManifest}>Retry</button>
          </div>
        )}
        {manifest && (
          <div className="database-status" aria-label="Local database connected">
            <span className="status-dot" /> Local library connected
          </div>
        )}
        <main className="page-content"><Outlet /></main>
        <footer className="mobile-footer">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}>
              <Icon size={20} /><span>{label === 'Hadith library' ? 'Hadith' : label}</span>
            </NavLink>
          ))}
          <NavLink to="/bookmarks" className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}>
            <BookMarked size={20} /><span>Saved</span>
          </NavLink>
        </footer>
      </div>
    </div>
  )
}
