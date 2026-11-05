import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookText, Bookmark, Check, Copy, Search, Share2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LanguageSelect, LoadingState, PageHeading } from '../components/common'
import { useAppState } from '../hooks/useLibraryState'
import { alignHadithByIdentifiers, getHadithArabicChapter, getHadithChapter, getHadithCollection, getHadithCollections, getHadithLanguages } from '../services/hadithService'
import { displayLanguage } from '../services/dataResolver'
import type { AlignedHadithEntry, HadithChapter, HadithCollectionMetadata, HadithEntry } from '../types'

const collectionNames: Record<string, string> = {
  abudawud: 'Sunan Abu Dawud',
  bukhari: 'Sahih al-Bukhari',
  ibnmajah: 'Sunan Ibn Majah',
  muslim: 'Sahih Muslim',
  nasai: "Sunan an-Nasa'i",
  tirmidhi: 'Jami at-Tirmidhi',
}

export function HadithOverviewPage() {
  const [collections, setCollections] = useState<HadithCollectionMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getHadithCollections()
      .then(setCollections)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Hadith collection metadata could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    queueMicrotask(load)
  }, [load])

  if (loading) return <LoadingState label="Opening the Hadith collection…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      <PageHeading eyebrow="THE PROPHETIC TRADITIONS" title="Wisdom for every generation." description="Browse the six collections held in your local library. Select a collection to explore its chapter index." />
      <div className="hadith-collection-grid">
        {collections.map((collection) => {
          const name = collectionNames[collection.book_name_english] ?? collection.book_name_english
          return (
            <Link to={`/hadith/${collection.book_name_english}`} className="hadith-collection-card" key={collection.book_name_english}>
              <span className="collection-card-icon"><BookText size={19} /></span>
              <span className="collection-arabic" lang="ar" dir="rtl">{collection.book_name_arabic}</span>
              <span className="collection-kicker">HADITH COLLECTION</span>
              <strong>{name}</strong>
              <span className="collection-description">{collection.book_short_desc}</span>
              <span className="collection-stats"><span>{collection.total_chapters_inBook} chapters</span><i>·</i><span>{collection.total_hadiths_inBook.toLocaleString()} Hadith</span></span>
              <span className="collection-card-arrow"><ArrowRight size={17} /></span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function HadithCollectionPage() {
  const { collection = '' } = useParams()
  const [metadata, setMetadata] = useState<HadithCollectionMetadata>()
  const [languages, setLanguages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { preferences, setPreferences } = useAppState()
  const language = preferences.hadithLanguage
  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([getHadithCollection(collection), getHadithLanguages(collection)])
      .then(([data, available]) => {
        setMetadata(data)
        setLanguages(available)
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Collection details could not be loaded.'))
      .finally(() => setLoading(false))
  }, [collection])
  useEffect(() => {
    queueMicrotask(load)
  }, [load])

  if (loading) return <LoadingState label="Loading collection details…" />
  if (error || !metadata) return <ErrorState message={error || 'Collection metadata is unavailable.'} onRetry={load} />

  const name = collectionNames[metadata.book_name_english] ?? metadata.book_name_english
  return (
    <div>
      <div className="reader-topline">
        <Link to="/hadith" className="back-link"><ArrowLeft size={15} /> All collections</Link>
        {languages.length > 0 && (
          <LanguageSelect label="Chapter language" value={language} languages={languages} onChange={(value) => setPreferences((current) => ({ ...current, hadithLanguage: value }))} />
        )}
      </div>
      <header className="collection-detail-banner">
        <div className="collection-detail-copy">
          <div className="eyebrow eyebrow-light">THE HADITH LIBRARY</div>
          <h1>{name}</h1>
          <p className="collection-detail-arabic" lang="ar" dir="rtl">{metadata.book_name_arabic}</p>
          <p className="collection-detail-description">{metadata.book_short_desc}</p>
          <div className="collection-detail-stats"><span><strong>{metadata.total_chapters_inBook}</strong> chapters</span><span><strong>{metadata.total_hadiths_inBook.toLocaleString()}</strong> Hadith</span>{metadata.book_name_tamil && <span className="localized-title" lang="ta">{metadata.book_name_tamil}</span>}{metadata.book_name_malayalam && <span className="localized-title" lang="ml">{metadata.book_name_malayalam}</span>}</div>
        </div>
        <span className="collection-detail-mark">۞</span>
      </header>
      <div className="chapter-list-heading">
        <div><div className="eyebrow">CHAPTER INDEX</div><h2>Explore the chapters</h2></div>
        <span>{metadata.all_chapters_detail.length} chapters <i>·</i> {displayLanguage(language)}</span>
      </div>
      {!languages.some((item) => item.toLowerCase() === language.toLowerCase()) && (
        <div className="availability-notice" role="status">Translation not available for this collection.</div>
      )}
      <div className="hadith-chapter-list">
        {metadata.all_chapters_detail.map((chapter, index) => (
          <Link className="hadith-chapter-row" key={`${index}-${chapter.chapter_first_hadith}`} to={`/hadith/${metadata.book_name_english}/${index + 1}`}>
            <span className="chapter-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="chapter-row-copy">
              <strong>{chapter.chapter_title_english ?? `Chapter ${index + 1}`}</strong>
              <small>Hadith {chapter.chapter_first_hadith}–{chapter.chapter_last_hadith} · {chapter.total_hadiths_inChapter} narrations</small>
            </span>
            <span className="chapter-row-arabic" lang="ar" dir="rtl">{chapter.chapter_title_arabic}</span>
            <ArrowRight size={16} className="chapter-row-arrow" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function HadithReaderPage() {
  const { collection = '', chapterNumber = '' } = useParams()
  const chapterIndex = Number(chapterNumber)
  const { preferences, setPreferences, bookmarks, toggleBookmark, recordReading } = useAppState()
  const [metadata, setMetadata] = useState<HadithCollectionMetadata>()
  const [arabicChapter, setArabicChapter] = useState<HadithChapter>()
  const [translationChapter, setTranslationChapter] = useState<HadithChapter>()
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [language, setLanguage] = useState(preferences.hadithLanguage)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string>()

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    setArabicChapter(undefined)
    setTranslationChapter(undefined)
    setTranslationError('')
    setPage(0)
    if (!Number.isInteger(chapterIndex) || chapterIndex < 1) {
      setError('Chapter number must be a positive whole number.')
      setLoading(false)
      return
    }
    Promise.all([
      getHadithCollection(collection),
      getHadithLanguages(collection),
      getHadithArabicChapter(collection, chapterIndex),
    ])
      .then(([data, available, arabicData]) => {
        if (chapterIndex > data.all_chapters_detail.length) throw new RangeError(`Chapter ${chapterIndex} is not in this collection.`)
        setMetadata(data)
        setLanguages(available)
        setArabicChapter(arabicData)
        const chapterMeta = data.all_chapters_detail[chapterIndex - 1]
        recordReading({
          id: `hadith:${data.book_name_english}:${chapterIndex}`,
          type: 'hadith',
          title: data.book_name_english,
          subtitle: chapterMeta.chapter_title_english ?? `Chapter ${chapterIndex}`,
          url: `/hadith/${data.book_name_english}/${chapterIndex}`,
          updatedAt: Date.now(),
        })
      })
      .catch((cause: unknown) => {
        console.error(`[hadith] Arabic chapter load failed for ${collection} chapter ${chapterIndex}.`, cause)
        setError(cause instanceof Error ? cause.message : 'Arabic source chapter could not be loaded.')
      })
      .finally(() => setLoading(false))
  }, [collection, chapterIndex, recordReading])
  useEffect(() => {
    queueMicrotask(load)
  }, [load])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active || !arabicChapter) return
      setTranslationChapter(undefined)
      setTranslationError('')
      setPage(0)
      if (language.toLowerCase() === 'arabic') {
        setTranslationLoading(false)
        return
      }
      if (!languages.some((available) => available.toLowerCase() === language.toLowerCase())) {
        setTranslationLoading(false)
        setTranslationError('Translation not available for this collection.')
        return
      }
      setTranslationLoading(true)
      void getHadithChapter(collection, language, chapterIndex)
        .then((data) => {
          if (active) setTranslationChapter(data)
        })
        .catch((cause: unknown) => {
          if (!active) return
          console.error(`[hadith] ${language} translation failed for ${collection} chapter ${chapterIndex}.`, cause)
          setTranslationError(cause instanceof Error ? cause.message : 'Translation not available for this collection.')
        })
        .finally(() => {
          if (active) setTranslationLoading(false)
        })
    })
    return () => { active = false }
  }, [arabicChapter, chapterIndex, collection, language, languages])

  const alignedHadith = useMemo<AlignedHadithEntry[]>(() => {
    if (!arabicChapter) return []
    if (language.toLowerCase() === 'arabic' || !translationChapter) {
      return arabicChapter.hadith_list.map((arabic) => ({ arabic, translation: undefined }))
    }
    return alignHadithByIdentifiers(arabicChapter, translationChapter)
  }, [arabicChapter, language, translationChapter])

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return alignedHadith
    return alignedHadith.filter(({ arabic, translation }) => {
      const values = [
        arabic.title,
        arabic.narrator,
        arabic.grade,
        String(arabic.hadithNum_inBook ?? ''),
        String(arabic.hadithNum_inChapter ?? ''),
        arabic.arabic_text,
        getLanguageText(translation, language),
      ].filter((value): value is string => typeof value === 'string')
      return values.some((value) => value.toLowerCase().includes(term))
    })
  }, [alignedHadith, query, language])
  const pageSize = 25
  const pageCount = Math.ceil(matches.length / pageSize)
  const visibleHadith = matches.slice(page * pageSize, (page + 1) * pageSize)
  const chapterMeta = metadata?.all_chapters_detail[chapterIndex - 1]
  const name = metadata ? collectionNames[metadata.book_name_english] ?? metadata.book_name_english : collection

  const copyHadith = async (item: AlignedHadithEntry) => {
    const text = hadithDisplayText(item, language)
    try {
      await navigator.clipboard.writeText(text)
      const id = String(item.arabic.hadithNum_inBook ?? item.arabic.hadithNum_inChapter ?? '')
      setCopied(id)
      window.setTimeout(() => setCopied(undefined), 1800)
    } catch (cause) {
      console.error('[clipboard] Could not copy Hadith.', cause)
    }
  }
  const shareHadith = async (item: AlignedHadithEntry) => {
    const text = hadithDisplayText(item, language)
    try {
      if (navigator.share) await navigator.share({ title: item.translation?.title ?? item.arabic.title ?? name, text })
      else await navigator.clipboard.writeText(text)
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) console.error('[share] Could not share Hadith.', cause)
    }
  }

  if (loading) return <LoadingState label={`Opening ${name}, chapter ${chapterNumber}…`} />
  if (error || !arabicChapter || !metadata) return (
    <div className="reader-page">
      {metadata && (
        <div className="reader-topline">
          <Link to={`/hadith/${metadata.book_name_english}`} className="back-link"><ArrowLeft size={15} /> {collectionNames[metadata.book_name_english] ?? metadata.book_name_english}</Link>
          {languages.length > 0 && <LanguageSelect label="Translation" value={language} languages={languages} onChange={(value) => {
            setLanguage(value)
            setPreferences((current) => ({ ...current, hadithLanguage: value }))
          }} />}
        </div>
      )}
      <ErrorState message={error || 'This chapter is unavailable.'} onRetry={load} />
    </div>
  )

  const localizedTitles: Record<string, string | undefined> = {
    english: translationChapter?.english_title,
    arabic: arabicChapter.arabic_title,
    tamil: translationChapter?.tamil_title,
    malayalam: translationChapter?.malayalam_title,
  }
  const localizedTitle = localizedTitles[language.toLowerCase()]
  const title = typeof localizedTitle === 'string'
    ? localizedTitle
    : language.toLowerCase() === 'english'
      ? translationChapter?.english_title ?? chapterMeta?.chapter_title_english
      : chapterMeta?.chapter_title_english

  return (
    <div className="reader-page hadith-reader">
      <div className="reader-topline">
        <Link to={`/hadith/${metadata.book_name_english}`} className="back-link"><ArrowLeft size={15} /> {name}</Link>
        <div className="reader-controls">
          <LanguageSelect label="Translation" value={language} languages={languages} onChange={(value) => {
            setLanguage(value)
            setPreferences((current) => ({ ...current, hadithLanguage: value }))
          }} />
        </div>
      </div>
      <header className="chapter-reader-banner">
        <div className="eyebrow">CHAPTER {String(chapterIndex).padStart(2, '0')} · {name.toUpperCase()}</div>
        <h1>{title ?? chapterMeta?.chapter_title_english ?? `Chapter ${chapterIndex}`}</h1>
        <p lang="ar" dir="rtl">{chapterMeta?.chapter_title_arabic}</p>
        <div className="chapter-reader-count">{arabicChapter.totalHadiths_inChapter ?? chapterMeta?.total_hadiths_inChapter ?? arabicChapter.hadith_list.length} narrations <i>·</i> Arabic first · {displayLanguage(language)}</div>
      </header>
      <div className="hadith-search-row">
        <label className="search-box chapter-search"><Search size={16} /><input value={query} onChange={(event) => {
          setQuery(event.target.value)
          setPage(0)
        }} placeholder="Search within this chapter…" aria-label="Search this chapter" /></label>
        <span>{matches.length} narrations</span>
      </div>
      {translationError && language.toLowerCase() !== 'arabic' && <p className="translation-unavailable" role="status">{translationError}</p>}
      {translationLoading && <p className="translation-loading">Loading {displayLanguage(language)} translation… Arabic remains visible.</p>}
      <div className="hadith-card-list">
        {visibleHadith.map((item, index) => {
          const hadithNumber = item.arabic.hadithNum_inChapter ?? index + 1 + page * pageSize
          const bookNumber = item.arabic.hadithNum_inBook
          const savedId = `hadith:${metadata.book_name_english}:${chapterIndex}:${bookNumber ?? hadithNumber}`
          const bookmarked = bookmarks.some((saved) => saved.id === savedId)
          const text = language.toLowerCase() === 'arabic' ? '' : getLanguageText(item.translation, language)
          return (
            <article key={savedId} className="hadith-card">
              <div className="hadith-card-head">
                <span className="hadith-number">{name} · HADITH {String(bookNumber ?? hadithNumber).padStart(4, '0')}</span>
                <span className="hadith-card-actions">
                  <button className={`icon-button${bookmarked ? ' selected' : ''}`} title={bookmarked ? 'Remove bookmark' : 'Bookmark Hadith'} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark Hadith'} onClick={() => toggleBookmark({
                    id: savedId,
                    type: 'hadith',
                    title: item.translation?.title ?? item.arabic.title ?? `${name} ${bookNumber ?? hadithNumber}`,
                    subtitle: chapterMeta?.chapter_title_english ?? `Chapter ${chapterIndex}`,
                    text: hadithDisplayText(item, language),
                    url: `/hadith/${metadata.book_name_english}/${chapterIndex}`,
                    createdAt: Date.now(),
                  })}><Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} /></button>
                  <button className="icon-button" title="Copy Hadith" aria-label="Copy Hadith" onClick={() => void copyHadith(item)}>{copied === String(bookNumber ?? hadithNumber) ? <Check size={16} /> : <Copy size={15} />}</button>
                  <button className="icon-button" title="Share Hadith" aria-label="Share Hadith" onClick={() => void shareHadith(item)}><Share2 size={15} /></button>
                </span>
              </div>
              {(item.translation?.title ?? item.arabic.title) && <h2 className="hadith-title">{item.translation?.title ?? item.arabic.title}</h2>}
              {item.arabic.arabic_text
                ? <p className="hadith-arabic" lang="ar" dir="rtl">{item.arabic.arabic_text}</p>
                : <p className="arabic-unavailable">Arabic source text not available for this Hadith.</p>}
              {language.toLowerCase() !== 'arabic' && (
                <>
                  <div className="hadith-divider"><span>TRANSLATION · {displayLanguage(language)}</span></div>
                  {text
                    ? <p className={`hadith-translation hadith-${language.toLowerCase()}`} lang={language.toLowerCase()} dir={language.toLowerCase() === 'arabic' ? 'rtl' : 'ltr'}>{text}</p>
                    : <p className="missing-translation">Translation not available for this Hadith in the selected language.</p>}
                </>
              )}
              {(item.translation?.narrator ?? item.arabic.narrator) && <p className="hadith-narrator">{item.translation?.narrator ?? item.arabic.narrator}</p>}
              {(item.translation?.grade ?? item.arabic.grade) && <span className="hadith-grade"><span />{item.translation?.grade ?? item.arabic.grade}</span>}
            </article>
          )
        })}
        {!visibleHadith.length && <div className="empty-search">No Hadith in this chapter matches “{query}”.</div>}
      </div>
      {pageCount > 1 && (
        <div className="pagination-row">
          <button className="button button-light" disabled={page === 0} onClick={() => {
            setPage((current) => Math.max(0, current - 1))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}><ArrowLeft size={15} /> Previous</button>
          <span>Page {page + 1} of {pageCount}</span>
          <button className="button button-light" disabled={page + 1 >= pageCount} onClick={() => {
            setPage((current) => Math.min(pageCount - 1, current + 1))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}>Next <ArrowRight size={15} /></button>
        </div>
      )}
      <nav className="chapter-pagination" aria-label="Hadith chapter navigation">
        {chapterIndex > 1 ? <Link to={`/hadith/${metadata.book_name_english}/${chapterIndex - 1}`} className="button button-light"><ArrowLeft size={15} /> Previous chapter</Link> : <span />}
        <Link to={`/hadith/${metadata.book_name_english}`} className="button button-quiet">Chapter index</Link>
        {chapterIndex < metadata.all_chapters_detail.length ? <Link to={`/hadith/${metadata.book_name_english}/${chapterIndex + 1}`} className="button button-primary">Next chapter <ArrowRight size={15} /></Link> : <span />}
      </nav>
      <div className="reader-note"><BookText size={15} /> Showing source numbering and text as supplied in the local database.</div>
    </div>
  )
}

function getLanguageText(item: HadithEntry | undefined, language: string): string {
  if (!item) return ''
  const key = `${language.toLowerCase()}_text`
  const value = item[key]
  return typeof value === 'string' ? value : ''
}

function hadithDisplayText(item: AlignedHadithEntry, language: string): string {
  return [item.arabic.arabic_text, getLanguageText(item.translation, language)]
    .filter((value): value is string => Boolean(value))
    .join('\n')
}
