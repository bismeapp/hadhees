import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowRight, BookOpen, BookText, Search, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getHadithCollections } from '../services/hadithService'
import { getQuranMetadata } from '../services/quranService'
import type { HadithCollectionMetadata, QuranMetadata } from '../types'
import { useAppState } from '../hooks/useLibraryState'
import { EmptyState, LoadingState } from '../components/common'

const featuredNames: Record<string, string> = {
  abudawud: 'Sunan Abu Dawud',
  bukhari: 'Sahih al-Bukhari',
  ibnmajah: 'Sunan Ibn Majah',
  muslim: 'Sahih Muslim',
  nasai: "Sunan an-Nasa'i",
  tirmidhi: 'Jami at-Tirmidhi',
}

export function HomePage() {
  const [quran, setQuran] = useState<QuranMetadata>()
  const [collections, setCollections] = useState<HadithCollectionMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const { history, preferences } = useAppState()
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([getQuranMetadata(), getHadithCollections()])
      .then(([metadata, hadith]) => {
        setQuran(metadata)
        setCollections(hadith)
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Library metadata could not be loaded.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    queueMicrotask(load)
  }, [])

  const continueReading = history[0]
  const quranProgress = quran?.chapter_details.find((surah) => continueReading?.url === `/quran/${surah.surahNo}`)

  return (
    <div className="home-page">
      <section className="welcome-panel">
        <div className="welcome-pattern" aria-hidden="true" />
        <div className="welcome-copy">
          <div className="eyebrow eyebrow-light"><Sparkles size={13} /> YOUR PERSONAL ISLAMIC LIBRARY</div>
          <p className="greeting">Peace be upon you</p>
          <h1>A little space<br />for the <em>light within.</em></h1>
          <p className="welcome-description">Return to the words that steady the heart. Read, reflect, and continue at your own pace.</p>
          <p className="bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          <div className="welcome-actions">
            <Link to={continueReading?.url ?? '/quran'} className="button button-gold">
              <BookOpen size={16} /> {continueReading ? 'Continue reading' : 'Begin with the Quran'} <ArrowRight size={15} />
            </Link>
            <Link to="/hadith" className="welcome-secondary">Explore Hadith <ArrowDownRight size={15} /></Link>
          </div>
        </div>
        <div className="welcome-emblem" aria-hidden="true"><span>۞</span><small>READ · REFLECT · RETURN</small></div>
      </section>

      <section className="home-search-section">
        <div className="home-search-heading"><span>FIND YOUR WAY</span><p>What would you like to explore today?</p></div>
        <form className="search-box home-search" onSubmit={(event) => {
          event.preventDefault()
          navigate(`/search?q=${encodeURIComponent(query)}`)
        }}>
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Surahs, chapters, or Hadith…" aria-label="Search the library" />
          <button type="submit" className="button button-primary">Search</button>
        </form>
      </section>

      {loading ? <LoadingState label="Gathering the library…" /> : error ? (
        <div className="inline-error"><span>{error}</span><button className="text-button" onClick={load}>Retry</button></div>
      ) : (
        <>
          <section className="section-block">
            <div className="section-title-row">
              <div><div className="eyebrow">BEGIN A READING</div><h2>Explore the library</h2></div>
              <span className="soft-label">A collection for every quiet moment</span>
            </div>
            <div className="library-feature-grid">
              <Link to="/quran" className="library-feature quran-feature">
                <span className="feature-icon"><BookOpen size={20} /></span>
                <span className="feature-kicker">THE HOLY QURAN</span>
                <strong>The Noble Quran</strong>
                <span className="feature-desc">Read and reflect on every Surah, in {preferences.quranLanguage} and more.</span>
                <span className="feature-count">{quran?.total_surahs ?? 114} Surahs <i>·</i> {quran?.total_verses.toLocaleString() ?? '—'} verses</span>
                <span className="feature-arrow"><ArrowRight size={17} /></span>
              </Link>
              <Link to="/hadith" className="library-feature hadith-feature">
                <span className="feature-icon"><BookText size={20} /></span>
                <span className="feature-kicker">PROPHETIC TRADITIONS</span>
                <strong>Hadith collections</strong>
                <span className="feature-desc">Explore the teachings, wisdom, and traditions of the Prophet ﷺ.</span>
                <span className="feature-count">{collections.length} collections <i>·</i> sourced from your library</span>
                <span className="feature-arrow"><ArrowRight size={17} /></span>
              </Link>
            </div>
          </section>

          <section className="section-block two-column-section">
            <div className="section-panel">
              <div className="section-title-row compact-title">
                <div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Continue reading</h2></div>
                <Link to="/history" className="subtle-link">View history <ArrowRight size={14} /></Link>
              </div>
              {continueReading ? (
                <Link className="continue-card" to={continueReading.url}>
                  <span className="continue-icon">{continueReading.type === 'quran' ? <BookOpen size={19} /> : <BookText size={19} />}</span>
                  <span className="continue-text"><strong>{continueReading.title}</strong><small>{continueReading.subtitle}</small></span>
                  <ArrowRight className="continue-arrow" size={17} />
                </Link>
              ) : (
                <EmptyState title="Your journey starts here" message="Open a Surah or Hadith chapter and we’ll keep your place." />
              )}
              {quranProgress && <span className="continue-note">Last Surah: {quranProgress.surahName} · {quranProgress.surahNameArabic}</span>}
            </div>
            <div className="section-panel collections-preview">
              <div className="section-title-row compact-title">
                <div><div className="eyebrow">SIX CANONICAL COLLECTIONS</div><h2>Hadith library</h2></div>
                <Link to="/hadith" className="subtle-link">All collections <ArrowRight size={14} /></Link>
              </div>
              <div className="collection-mini-list">
                {collections.slice(0, 4).map((collection) => (
                  <Link key={collection.book_name_english} to={`/hadith/${collection.book_name_english}`} className="collection-mini">
                    <span className="mini-ornament">۞</span>
                    <span><strong>{featuredNames[collection.book_name_english] ?? collection.book_name_english}</strong><small>{collection.total_chapters_inBook} chapters</small></span>
                    <ArrowRight size={15} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
          <section className="closing-quote"><span>“</span><p>So remember Me; I will remember you.</p><small>AL-BAQARAH · 2:152</small></section>
        </>
      )}
    </div>
  )
}
