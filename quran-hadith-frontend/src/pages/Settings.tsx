import { useEffect, useState } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { PageHeading } from '../components/common'
import { useAppState } from '../hooks/useLibraryState'
import { getHadithCollections, getHadithLanguages } from '../services/hadithService'
import { getQuranLanguages } from '../services/quranService'
import type { HadithCollectionMetadata } from '../types'

export function SettingsPage() {
  const { preferences, setPreferences } = useAppState()
  const [quranLanguages, setQuranLanguages] = useState<string[]>([])
  const [collections, setCollections] = useState<HadithCollectionMetadata[]>([])
  const [collection, setCollection] = useState('')
  const [hadithLanguages, setHadithLanguages] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getQuranLanguages(), getHadithCollections()])
      .then(([quranOptions, hadithOptions]) => {
        setQuranLanguages(quranOptions)
        setCollections(hadithOptions)
        setCollection(hadithOptions[0]?.book_name_english ?? '')
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Language options could not be loaded.'))
  }, [])

  useEffect(() => {
    if (!collection) return
    getHadithLanguages(collection).then(setHadithLanguages).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Hadith language options could not be loaded.')
    })
  }, [collection])

  return (
    <div>
      <PageHeading eyebrow="MAKE IT YOURS" title="Reading preferences" description="Your choices are saved in this browser and never written to the source library." />
      {error && <div className="inline-error">{error}</div>}
      <div className="settings-sections">
        <section className="settings-card">
          <div className="settings-card-heading"><span className="settings-icon"><Sun size={18} /></span><div><h2>Languages</h2><p>Keep interface and reading translations independent.</p></div></div>
          <div className="setting-row">
            <div><strong>Quran translation</strong><small>Choose the language displayed beside the Arabic text.</small></div>
            <select value={preferences.quranLanguage} onChange={(event) => setPreferences((current) => ({ ...current, quranLanguage: event.target.value }))}>
              {quranLanguages.map((language) => <option value={language} key={language}>{language}</option>)}
            </select>
          </div>
          <div className="setting-row">
            <div><strong>Hadith translation</strong><small>Used when a collection supports the selected language.</small></div>
            <select value={preferences.hadithLanguage} onChange={(event) => setPreferences((current) => ({ ...current, hadithLanguage: event.target.value }))}>
              {[...new Set(['English', 'Arabic', 'Tamil', 'Malayalam', ...hadithLanguages])].map((language) => <option value={language} key={language}>{language}</option>)}
            </select>
          </div>
          <div className="setting-row">
            <div><strong>Interface language</strong><small>Independent from Quran and Hadith translations.</small></div>
            <select value={preferences.interfaceLanguage} onChange={(event) => setPreferences((current) => ({ ...current, interfaceLanguage: event.target.value }))}>
              {['English', 'Arabic', 'Tamil', 'Malayalam'].map((language) => <option value={language} key={language}>{language}</option>)}
            </select>
          </div>
          <div className="setting-row setting-collection">
            <div><strong>Available Hadith languages</strong><small>Collections may not include every language.</small></div>
            <select value={collection} onChange={(event) => setCollection(event.target.value)}>
              {collections.map((item) => <option key={item.book_name_english} value={item.book_name_english}>{item.book_name_english}</option>)}
            </select>
          </div>
          <p className="available-languages">{collection ? `Available for ${collection}: ${hadithLanguages.join(', ') || 'none found'}` : 'No Hadith collections found.'}</p>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading"><span className="settings-icon"><Moon size={18} /></span><div><h2>Reading comfort</h2><p>Fine-tune the page for a more comfortable reading session.</p></div></div>
          <div className="setting-row">
            <div><strong>Appearance</strong><small>Choose a light or dark reading surface.</small></div>
            <div className="segmented-control">
              <button className={preferences.theme === 'light' ? 'selected' : ''} onClick={() => setPreferences((current) => ({ ...current, theme: 'light' }))}><Sun size={14} /> Light</button>
              <button className={preferences.theme === 'dark' ? 'selected' : ''} onClick={() => setPreferences((current) => ({ ...current, theme: 'dark' }))}><Moon size={14} /> Dark</button>
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Text size</strong><small>Adjust the reading text scale.</small></div>
            <div className="font-setting"><button aria-label="Decrease text size" onClick={() => setPreferences((current) => ({ ...current, fontSize: Math.max(0.85, +(current.fontSize - 0.05).toFixed(2)) }))}>A−</button><input type="range" min="0.85" max="1.4" step="0.05" value={preferences.fontSize} onChange={(event) => setPreferences((current) => ({ ...current, fontSize: Number(event.target.value) }))} aria-label="Reading text size" /><button aria-label="Increase text size" onClick={() => setPreferences((current) => ({ ...current, fontSize: Math.min(1.4, +(current.fontSize + 0.05).toFixed(2)) }))}>A+</button></div>
          </div>
          <div className="setting-row">
            <div><strong>Reading layout</strong><small>Change the spacing between passages.</small></div>
            <div className="segmented-control">
              <button className={preferences.readingLayout === 'comfortable' ? 'selected' : ''} onClick={() => setPreferences((current) => ({ ...current, readingLayout: 'comfortable' }))}>Comfortable</button>
              <button className={preferences.readingLayout === 'compact' ? 'selected' : ''} onClick={() => setPreferences((current) => ({ ...current, readingLayout: 'compact' }))}>Compact</button>
            </div>
          </div>
          <p className="settings-saved"><Check size={14} /> Preferences are saved automatically on this device.</p>
        </section>
      </div>
    </div>
  )
}
