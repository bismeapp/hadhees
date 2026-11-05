import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, BookText, Search as SearchIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorState, LoadingState, PageHeading } from '../components/common'
import { useAppState } from '../hooks/useLibraryState'
import { getHadithChapter, getHadithCollections, getHadithLanguages } from '../services/hadithService'
import { getQuranEdition, getQuranLanguages, getQuranMetadata } from '../services/quranService'
import type { HadithCollectionMetadata, QuranMetadata } from '../types'

type SearchMode = 'catalog' | 'quran' | 'hadith'
interface SearchResult {
  title: string
  description: string
  url: string
  category: string
  excerpt?: string
}

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const { preferences } = useAppState()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [mode, setMode] = useState<SearchMode>('catalog')
  const [quran, setQuran] = useState<QuranMetadata>()
  const [collections, setCollections] = useState<HadithCollectionMetadata[]>([])
  const [quranLanguages, setQuranLanguages] = useState<string[]>([])
  const [quranLanguage, setQuranLanguage] = useState(preferences.quranLanguage)
  const [hadithLanguages, setHadithLanguages] = useState<string[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [selectedCollection, setSelectedCollection] = useState('')
  const [chapterNumber, setChapterNumber] = useState('1')
  const [hadithLanguage, setHadithLanguage] = useState(preferences.hadithLanguage)
  const selectedMetadata = useMemo(
    () => collections.find((item) => item.book_name_english === selectedCollection),
    [collections, selectedCollection],
  )

  useEffect(() => {
    Promise.all([getQuranMetadata(), getHadithCollections(), getQuranLanguages()])
      .then(([quranData, hadithData, available]) => {
        setQuran(quranData)
        setCollections(hadithData)
        setQuranLanguages(available)
        setLoadingMetadata(false)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Search metadata could not be loaded.')
        setLoadingMetadata(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedCollection) return
    getHadithLanguages(selectedCollection).then((available) => {
      setHadithLanguages(available)
      if (available.length && !available.some((item) => item.toLowerCase() === hadithLanguage.toLowerCase())) {
        setHadithLanguage(available.find((item) => item.toLowerCase() === 'english') ?? available[0])
      }
    }).catch((cause: unknown) => console.error('[search] Could not load Hadith language options.', cause))
  }, [selectedCollection, hadithLanguage])

  const search = async () => {
    const term = query.trim()
    if (!term) {
      setResults([])
      setError('')
      return
    }
    setSearching(true)
    setError('')
    try {
      if (mode === 'catalog') {
        const found: SearchResult[] = []
        for (const surah of quran?.chapter_details ?? []) {
          if ([surah.surahName, surah.surahNameArabic, surah.surahNameTranslation, String(surah.surahNo)]
            .some((value) => value.toLowerCase().includes(term.toLowerCase()))) {
            found.push({
              title: surah.surahName,
              description: `${surah.surahNameTranslation} · ${surah.totalAyah} verses`,
              url: `/quran/${surah.surahNo}`,
              category: 'Quran · Surah',
            })
          }
        }
        for (const collection of collections) {
          collection.all_chapters_detail.forEach((chapter, index) => {
            const fields = [chapter.chapter_title_english, chapter.chapter_title_arabic, chapter.chapter_title_tamil, chapter.chapter_title_malayalam]
            if (fields.some((value) => value?.toLowerCase().includes(term.toLowerCase()))) {
              found.push({
                title: chapter.chapter_title_english ?? `Chapter ${index + 1}`,
                description: `${collection.book_name_english} · Hadith ${chapter.chapter_first_hadith}–${chapter.chapter_last_hadith}`,
                url: `/hadith/${collection.book_name_english}/${index + 1}`,
                category: 'Hadith · Chapter',
              })
            }
          })
        }
        setResults(found.slice(0, 100))
      } else if (mode === 'quran') {
        const edition = await getQuranEdition(quranLanguage)
        const surahByNumber = new Map((quran?.chapter_details ?? []).map((item) => [item.surahNo, item]))
        const found: SearchResult[] = []
        for (const surah of edition) {
          surah.verses.forEach((verse, index) => {
            if (verse.toLowerCase().includes(term.toLowerCase())) {
              const info = surahByNumber.get(surah.chapter)
              found.push({
                title: `${info?.surahName ?? `Surah ${surah.chapter}`} · Verse ${index + 1}`,
                description: `${info?.surahNameTranslation ?? ''} · ${quranLanguage}`,
                excerpt: verse,
                url: `/quran/${surah.chapter}`,
                category: 'Quran · Verse',
              })
            }
          })
        }
        setResults(found.slice(0, 100))
      } else {
        if (!selectedCollection || !chapterNumber) {
          setResults([])
          throw new Error('Choose a collection and chapter to search its Hadith text.')
        }
        const chapter = await getHadithChapter(selectedCollection, hadithLanguage, Number(chapterNumber))
        const needle = term.toLowerCase()
        const found = chapter.hadith_list.flatMap((hadith) => {
          const selectedText = hadith[`${hadithLanguage.toLowerCase()}_text`]
          const text = typeof selectedText === 'string' ? [selectedText] : []
          const searchable = [hadith.title, hadith.narrator, String(hadith.hadithNum_inBook ?? ''), ...text]
          if (!searchable.some((value) => value?.toLowerCase().includes(needle))) return []
          return [{
            title: hadith.title ?? `Hadith ${hadith.hadithNum_inBook ?? hadith.hadithNum_inChapter ?? ''}`,
            description: `${selectedCollection} · Chapter ${chapterNumber} · Hadith ${hadith.hadithNum_inBook ?? hadith.hadithNum_inChapter ?? ''}`,
            excerpt: text.find((value) => value.toLowerCase().includes(needle)) ?? hadith.narrator,
            url: `/hadith/${selectedCollection}/${chapterNumber}`,
            category: 'Hadith · Narration',
          }]
        })
        setResults(found.slice(0, 100))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Search could not be completed.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  if (loadingMetadata) return <LoadingState label="Preparing the search index…" />
  if (error && !quran && collections.length === 0) return <ErrorState message={error} />

  return (
    <div>
      <PageHeading eyebrow="A THOUGHT, A WORD, A REFERENCE" title="Search the library" description="Start with the index, or search text from one Quran edition or a single Hadith chapter on demand." />
      <div className="search-workspace">
        <form className="search-form" onSubmit={(event) => {
          event.preventDefault()
          void search()
        }}>
          <label className="search-box search-page-box"><SearchIcon size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter a Surah, chapter, narration, or phrase…" aria-label="Search terms" /><button className="button button-primary" type="submit">Search</button></label>
          <div className="search-modes" role="group" aria-label="Search scope">
            <button type="button" className={mode === 'catalog' ? 'search-mode active' : 'search-mode'} onClick={() => setMode('catalog')}><BookOpen size={15} /> Surahs & chapters</button>
            <button type="button" className={mode === 'quran' ? 'search-mode active' : 'search-mode'} onClick={() => setMode('quran')}><BookOpen size={15} /> Quran text</button>
            <button type="button" className={mode === 'hadith' ? 'search-mode active' : 'search-mode'} onClick={() => setMode('hadith')}><BookText size={15} /> Hadith text</button>
          </div>
          {mode === 'quran' && (
            <div className="search-options">
              <label className="select-label">Quran language
                <select value={quranLanguage} onChange={(event) => setQuranLanguage(event.target.value)}>
                  {quranLanguages.map((language) => <option value={language} key={language}>{language}</option>)}
                </select>
              </label>
              <p className="search-scope-note">Only this selected edition is loaded (one file).</p>
            </div>
          )}
          {mode === 'hadith' && (
            <div className="search-options">
              <label className="select-label">Collection
                <select value={selectedCollection} onChange={(event) => setSelectedCollection(event.target.value)}>
                  <option value="">Choose collection</option>
                  {collections.map((item) => <option key={item.book_name_english} value={item.book_name_english}>{item.book_name_english}</option>)}
                </select>
              </label>
              <label className="select-label">Chapter
                <select value={chapterNumber} onChange={(event) => setChapterNumber(event.target.value)}>
                  {(selectedMetadata?.all_chapters_detail ?? []).map((chapter, index) => (
                    <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, '0')} · {chapter.chapter_title_english}</option>
                  ))}
                </select>
              </label>
              {selectedCollection && (
                <label className="select-label">Translation
                  <select value={hadithLanguage} onChange={(event) => setHadithLanguage(event.target.value)}>
                    {hadithLanguages.map((language) => <option value={language} key={language}>{language}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
        </form>
        {error && <div className="search-error">{error}</div>}
        <div className="search-results-heading">
          <div><div className="eyebrow">{query.trim() ? 'MATCHING REFERENCES' : 'READY WHEN YOU ARE'}</div><h2>{results.length ? `${results.length} results` : 'Search results'}</h2></div>
          {mode === 'hadith' && <span className="result-scope">Only the chosen chapter is loaded to keep search lightweight.</span>}
        </div>
        {results.length ? (
          <div className="search-result-list">
            {results.map((result, index) => (
              <Link to={result.url} className="search-result" key={`${result.url}-${index}`}>
                <span className="result-kind">{result.category.startsWith('Quran') ? <BookOpen size={17} /> : <BookText size={17} />}</span>
                <span className="result-copy"><small>{result.category}</small><strong>{result.title}</strong><span>{result.description}</span>{result.excerpt && <em>{result.excerpt}</em>}</span>
                <ArrowRight className="result-arrow" size={17} />
              </Link>
            ))}
          </div>
        ) : query.trim() && !searching ? (
          <div className="search-empty">No matches found. Try a different phrase or search in another collection.</div>
        ) : searching ? <LoadingState label="Searching the selected content…" /> : (
          <div className="search-empty">Search Surah and chapter titles, or choose a text scope above.</div>
        )}
      </div>
    </div>
  )
}
