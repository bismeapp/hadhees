import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, Copy, Languages, Share2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeading, ErrorState, LanguageSelect, LoadingState } from '../components/common'
import { useAppState } from '../hooks/useLibraryState'
import { getQuranEdition, getQuranLanguages, getQuranMetadata, getSurah, getQuranManifest, getSurahTranslation } from '../services/quranService'
import { resolveQuranEdition } from '../services/dataResolver'
import type { QuranEditionSurah, QuranMetadata, SurahMetadata } from '../types'

export function QuranOverviewPage() {
  const [metadata, setMetadata] = useState<QuranMetadata>()
  const [languages, setLanguages] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { preferences, setPreferences } = useAppState()

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([getQuranMetadata(), getQuranLanguages()])
      .then(([data, available]) => {
        setMetadata(data)
        setLanguages(available)
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Quran metadata could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    queueMicrotask(load)
  }, [load])

  const surahs = useMemo(() => metadata?.chapter_details.filter((surah) => {
    const term = query.trim().toLowerCase()
    return !term || [
      surah.surahName,
      surah.surahNameArabic,
      surah.surahNameTranslation,
      String(surah.surahNo),
    ].some((value) => value.toLowerCase().includes(term))
  }) ?? [], [metadata, query])

  if (loading) return <LoadingState label="Loading the Quran index…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      <PageHeading eyebrow="THE NOBLE QURAN" title="114 chapters. One guiding light." description="Choose a Surah to begin reading. Your place is saved automatically." actions={
        <label className="select-label">Translation language
          <select value={preferences.quranLanguage} onChange={(event) => setPreferences((current) => ({ ...current, quranLanguage: event.target.value }))}>
            {languages.map((language) => <option key={language} value={language}>{language}</option>)}
          </select>
        </label>
      } />
      <div className="surah-toolbar">
        <input className="text-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a Surah by name or number…" aria-label="Find a Surah" />
        <span>{surahs.length} of {metadata?.total_surahs} Surahs</span>
      </div>
      <div className="surah-grid">
        {surahs.map((surah) => <SurahCard key={surah.surahNo} surah={surah} />)}
      </div>
    </div>
  )
}

function SurahCard({ surah }: { surah: SurahMetadata }) {
  return (
    <Link to={`/quran/${surah.surahNo}`} className="surah-card">
      <span className="surah-number">{String(surah.surahNo).padStart(3, '0')}</span>
      <span className="surah-card-copy">
        <strong>{surah.surahName}</strong>
        <small>{surah.surahNameTranslation} <i>·</i> {surah.totalAyah} verses</small>
      </span>
      <span className="surah-card-arabic" lang="ar" dir="rtl">{surah.surahNameArabic}</span>
    </Link>
  )
}

interface LoadedSurah {
  metadata: SurahMetadata
  arabic: QuranEditionSurah
}

export function QuranReaderPage() {
  const { surahNumber = '' } = useParams()
  const number = Number(surahNumber)
  const [surah, setSurah] = useState<LoadedSurah>()
  const [languages, setLanguages] = useState<string[]>([])
  const [translation, setTranslation] = useState<QuranEditionSurah>()
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [transliteration, setTransliteration] = useState<QuranEditionSurah>()
  const [transliterationEditions, setTransliterationEditions] = useState<Array<'array_la' | 'array_lad'>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<number>()
  const { preferences, setPreferences, bookmarks, toggleBookmark, recordReading } = useAppState()
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    setSurah(undefined)
    setTransliteration(undefined)
    if (!Number.isInteger(number) || number < 1 || number > 114) {
      setError('Surah number must be between 1 and 114.')
      setLoading(false)
      return
    }

    Promise.all([getSurah(number), getQuranLanguages(), getQuranManifest()])
      .then(async ([data, available, manifest]) => {
        setSurah(data)
        setLanguages(available)
        const availableEditions = (['array_la', 'array_lad'] as const)
          .filter((script) => Boolean(resolveQuranEdition(manifest, 'Arabic', script)))
        setTransliterationEditions([...availableEditions])
        recordReading({
          id: `quran:${number}`,
          type: 'quran',
          title: data.metadata.surahName,
          subtitle: `Surah ${number} · ${data.metadata.totalAyah} verses`,
          url: `/quran/${number}`,
          updatedAt: Date.now(),
        })
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'This Surah could not be loaded.'))
      .finally(() => setLoading(false))
  }, [number, recordReading])

  useEffect(() => {
    queueMicrotask(load)
  }, [load])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setTranslation(undefined)
      setTranslationError('')
      setTranslationLoading(Boolean(surah && preferences.showQuranTranslation))
      if (!surah || !preferences.showQuranTranslation) return
      void getSurahTranslation(number, preferences.quranLanguage)
        .then((result) => {
          if (!active) return
          if (!result) {
            setTranslationError('Translation not available in this language.')
            return
          }
          setTranslation(result)
        })
        .catch((cause: unknown) => {
          if (!active) return
          console.error(`[quran] Translation load failed for ${preferences.quranLanguage}, Surah ${number}.`, cause)
          setTranslationError('Translation not available in this language.')
        })
        .finally(() => {
          if (active) setTranslationLoading(false)
        })
    })
    return () => { active = false }
  }, [number, preferences.quranLanguage, preferences.showQuranTranslation, surah])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setTransliteration(undefined)
      if (!surah || !preferences.transliteration) return
      const selectedEdition = transliterationEditions.includes(preferences.transliterationEdition)
        ? preferences.transliterationEdition
        : transliterationEditions[0]
      if (!selectedEdition) return
      void getQuranEdition('Arabic', selectedEdition)
        .then((edition) => {
          if (active) setTransliteration(edition.find((item) => item.chapter === number))
        })
        .catch((cause: unknown) => console.error(`[quran] Transliteration load failed for Surah ${number}.`, cause))
    })
    return () => { active = false }
  }, [number, preferences.transliteration, preferences.transliterationEdition, surah, transliterationEditions])

  const verses = surah?.arabic.verses ?? []
  const surahBookmarked = bookmarks.some((item) => item.id === `surah:${number}`)
  const verseText = (index: number) => [
    verses[index] ?? '',
    preferences.showQuranTranslation ? translation?.verses[index] ?? '' : '',
  ].filter(Boolean).join('\n')
  const adjustFontSize = (target: 'arabicFontSize' | 'translationFontSize', delta: number) => {
    setPreferences((current) => ({ ...current, [target]: Math.max(0.85, Math.min(1.6, +(current[target] + delta).toFixed(2))) }))
  }
  const onCopy = async (verseIndex: number) => {
    try {
      await navigator.clipboard.writeText(verseText(verseIndex))
      setCopied(verseIndex)
      window.setTimeout(() => setCopied(undefined), 1800)
    } catch (cause) {
      console.error('[clipboard] Could not copy verse.', cause)
    }
  }
  const onShare = async (verseIndex: number) => {
    const text = verseText(verseIndex)
    try {
      if (navigator.share) await navigator.share({ title: surah?.metadata.surahName, text })
      else await navigator.clipboard.writeText(text)
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) console.error('[share] Could not share verse.', cause)
    }
  }

  if (loading) return <LoadingState label={`Opening Surah ${Number.isFinite(number) ? number : ''}…`} />
  if (error || !surah) return <ErrorState message={error || 'Surah data is unavailable.'} onRetry={load} />

  return (
    <div className="reader-page quran-reader">
      <div className="reader-topline">
        <Link to="/quran" className="back-link"><ArrowLeft size={15} /> All Surahs</Link>
      </div>
      <div className="quran-toolbar" aria-label="Quran reading controls">
        <button
          className={`button ${preferences.showQuranTranslation ? 'button-primary' : 'button-light'}`}
          aria-pressed={preferences.showQuranTranslation}
          onClick={() => setPreferences((current) => ({ ...current, showQuranTranslation: !current.showQuranTranslation }))}
        ><Languages size={15} /> Translation {preferences.showQuranTranslation ? 'on' : 'off'}</button>
        <LanguageSelect label="Translation language" value={preferences.quranLanguage} languages={languages} onChange={(language) => setPreferences((current) => ({ ...current, quranLanguage: language }))} />
        <div className="font-size-control" aria-label="Arabic font size">
          <span>Arabic</span>
          <button aria-label="Decrease Arabic font size" onClick={() => adjustFontSize('arabicFontSize', -0.1)}>A−</button>
          <button aria-label="Increase Arabic font size" onClick={() => adjustFontSize('arabicFontSize', 0.1)}>A+</button>
        </div>
        <div className="font-size-control" aria-label="Translation font size">
          <span>Translation</span>
          <button aria-label="Decrease translation font size" onClick={() => adjustFontSize('translationFontSize', -0.1)}>A−</button>
          <button aria-label="Increase translation font size" onClick={() => adjustFontSize('translationFontSize', 0.1)}>A+</button>
        </div>
        <button className={`button ${surahBookmarked ? 'button-gold' : 'button-light'}`} aria-pressed={surahBookmarked} onClick={() => toggleBookmark({
          id: `surah:${number}`,
          type: 'surah',
          title: `${surah.metadata.surahName} · Complete Surah`,
          subtitle: `Surah ${number} · ${surah.metadata.totalAyah} verses`,
          text: verses.join(' ۞ '),
          url: `/quran/${number}`,
          createdAt: Date.now(),
        })}><Bookmark size={15} fill={surahBookmarked ? 'currentColor' : 'none'} /> {surahBookmarked ? 'Surah saved' : 'Bookmark Surah'}</button>
        {transliterationEditions.length > 0 && (
          <label className="toggle-control transliteration-toggle">
            <input type="checkbox" checked={preferences.transliteration} onChange={(event) => setPreferences((current) => ({ ...current, transliteration: event.target.checked }))} />
            <span>Transliteration</span>
          </label>
        )}
      </div>
      {transliterationEditions.length > 1 && preferences.transliteration && (
        <label className="select-label script-select">Transliteration script
          <select value={preferences.transliterationEdition} onChange={(event) => setPreferences((current) => ({ ...current, transliterationEdition: event.target.value as 'array_la' | 'array_lad' }))}>
            {transliterationEditions.map((edition) => <option value={edition} key={edition}>{edition === 'array_la' ? 'Latin' : 'Latin with diacritics'}</option>)}
          </select>
        </label>
      )}
      <header className="surah-banner">
        <div className="surah-banner-top"><span>SURAH {String(number).padStart(3, '0')}</span><span>{surah.metadata.revelationPlace ?? 'Quran'} · {surah.metadata.totalAyah} VERSES</span></div>
        <h1 lang="ar" dir="rtl">{surah.metadata.surahNameArabic}</h1>
        <h2>{surah.metadata.surahName}</h2>
        <p>{surah.metadata.surahNameTranslation}</p>
        <span className="banner-ornament">۞</span>
      </header>
      {number !== 1 && number !== 9 && <div className="reader-bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>}
      {preferences.showQuranTranslation && translationError && <p className="translation-unavailable" role="status">{translationError}</p>}
      {preferences.showQuranTranslation && translationLoading && <p className="translation-loading">Loading {preferences.quranLanguage} translation…</p>}
      <div className={`quran-reading-text${preferences.showQuranTranslation ? ' with-translations' : ''}`} lang="ar" dir="rtl">
        {verses.map((arabic, index) => {
          const id = `verse:${number}:${index + 1}`
          const bookmarked = bookmarks.some((item) => item.id === id)
          return (
            <span key={id} className="quran-verse-unit" id={`ayah-${number}-${index + 1}`}>
              <span className="quran-verse-arabic" style={{ fontSize: `calc(32px * ${preferences.arabicFontSize})` }}>{arabic}</span>
              <span className="ayah-end" aria-label={`Ayah ${index + 1}`}><span aria-hidden="true">۞</span>{String(index + 1).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])}</span>
              <span className="quran-verse-tools">
                  <button className={`icon-button${bookmarked ? ' selected' : ''}`} title={bookmarked ? 'Remove bookmark' : 'Bookmark Ayah'} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark Ayah'} onClick={() => toggleBookmark({
                    id,
                    type: 'verse',
                    title: `${surah.metadata.surahName} · Verse ${index + 1}`,
                    subtitle: `Surah ${number} · ${preferences.quranLanguage}`,
                    text: verseText(index),
                    url: `/quran/${number}`,
                    createdAt: Date.now(),
                  })}><Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} /></button>
                  <button className="icon-button" title="Copy verse" aria-label="Copy verse" onClick={() => void onCopy(index)}>{copied === index ? <Check size={16} /> : <Copy size={15} />}</button>
                  <button className="icon-button" title="Share verse" aria-label="Share verse" onClick={() => void onShare(index)}><Share2 size={15} /></button>
              </span>
              {preferences.transliteration && transliteration?.verses[index] && <span className="transliteration-verse" dir="ltr">{transliteration.verses[index]}</span>}
              {preferences.showQuranTranslation && <span className="translation-verse" lang={preferences.quranLanguage.toLowerCase()} dir={preferences.quranLanguage.toLowerCase() === 'arabic' ? 'rtl' : 'ltr'}>
                <span style={{ fontSize: `calc(13px * ${preferences.translationFontSize})` }}>
                  {translation?.verses[index] ?? 'Translation not available in this language.'}
                </span>
              </span>}
            </span>
          )
        })}
      </div>
      <nav className="chapter-pagination" aria-label="Surah navigation">
        {number > 1 ? <Link to={`/quran/${number - 1}`} className="button button-light"><ArrowLeft size={15} /> Previous Surah</Link> : <span />}
        <label className="chapter-jump">Jump to Surah
          <select value={number} onChange={(event) => navigate(`/quran/${event.target.value}`)}>
            {surah ? [...Array(114)].map((_, index) => <option value={index + 1} key={index + 1}>{String(index + 1).padStart(3, '0')} · {index + 1}</option>) : null}
          </select><ChevronDown size={14} />
        </label>
        {number < 114 ? <Link to={`/quran/${number + 1}`} className="button button-primary">Next Surah <ArrowRight size={15} /></Link> : <span />}
      </nav>
      <div className="reader-note"><Languages size={15} /> The complete Surah is read in Arabic. Translation is optional and appears beneath its Ayah.</div>
    </div>
  )
}
