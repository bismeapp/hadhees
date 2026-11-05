import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { ReadingRecord, SavedItem } from '../types'
import { AppStateContext, type Preferences } from './stateContext'

const defaultPreferences: Preferences = {
  quranLanguage: 'English',
  hadithLanguage: 'English',
  interfaceLanguage: 'English',
  theme: 'light',
  fontSize: 1,
  readingLayout: 'comfortable',
  transliteration: false,
  transliterationEdition: 'array_la',
  showQuranTranslation: false,
  arabicFontSize: 1.15,
  translationFontSize: 1,
}

function readStorage<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const value: unknown = JSON.parse(raw)
    return isValid(value) ? value : fallback
  } catch (error) {
    console.warn(`[storage] Ignoring invalid saved value for ${key}.`, error)
    return fallback
  }
}

function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false
  const preferences = value as Partial<Preferences>
  return (
    typeof preferences.quranLanguage === 'string' &&
    typeof preferences.hadithLanguage === 'string' &&
    typeof preferences.interfaceLanguage === 'string' &&
    (preferences.theme === 'light' || preferences.theme === 'dark') &&
    typeof preferences.fontSize === 'number' &&
    Number.isFinite(preferences.fontSize) &&
    preferences.fontSize >= 0.85 &&
    preferences.fontSize <= 1.4 &&
    (preferences.readingLayout === 'comfortable' || preferences.readingLayout === 'compact') &&
    typeof preferences.transliteration === 'boolean' &&
    (preferences.transliterationEdition === 'array_la' || preferences.transliterationEdition === 'array_lad') &&
    (preferences.showQuranTranslation === undefined || typeof preferences.showQuranTranslation === 'boolean') &&
    (preferences.arabicFontSize === undefined || (
      typeof preferences.arabicFontSize === 'number' && Number.isFinite(preferences.arabicFontSize) &&
      preferences.arabicFontSize >= 0.85 && preferences.arabicFontSize <= 1.6
    )) &&
    (preferences.translationFontSize === undefined || (
      typeof preferences.translationFontSize === 'number' && Number.isFinite(preferences.translationFontSize) &&
      preferences.translationFontSize >= 0.85 && preferences.translationFontSize <= 1.6
    ))
  )
}

function isBookmarks(value: unknown): value is SavedItem[] {
  return Array.isArray(value) && value.every(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      (item.type === 'surah' || item.type === 'verse' || item.type === 'hadith') &&
      typeof item.title === 'string' &&
      typeof item.subtitle === 'string' &&
      typeof item.text === 'string' &&
      typeof item.url === 'string' &&
      typeof item.createdAt === 'number',
  )
}

function isHistory(value: unknown): value is ReadingRecord[] {
  return Array.isArray(value) && value.every(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      (item.type === 'quran' || item.type === 'hadith') &&
      typeof item.title === 'string' &&
      typeof item.subtitle === 'string' &&
      typeof item.url === 'string' &&
      typeof item.updatedAt === 'number',
  )
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(() => ({
    ...defaultPreferences,
    ...readStorage<Partial<Preferences>>('quran-hadith:preferences', {}, isPreferences),
  }))
  const [bookmarks, setBookmarks] = useState(() =>
    readStorage<SavedItem[]>('quran-hadith:bookmarks', [], isBookmarks),
  )
  const [history, setHistory] = useState(() =>
    readStorage<ReadingRecord[]>('quran-hadith:history', [], isHistory),
  )

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.dataset.readingLayout = preferences.readingLayout
    document.documentElement.style.setProperty('--reading-scale', String(preferences.fontSize))
    document.documentElement.style.setProperty('--arabic-font-scale', String(preferences.arabicFontSize))
    document.documentElement.style.setProperty('--translation-font-scale', String(preferences.translationFontSize))
    document.documentElement.lang = preferences.interfaceLanguage.toLowerCase()
    document.documentElement.dir = preferences.interfaceLanguage.toLowerCase() === 'arabic' ? 'rtl' : 'ltr'
    try {
      localStorage.setItem('quran-hadith:preferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('[storage] Could not save preferences.', error)
    }
  }, [preferences])

  useEffect(() => {
    try {
      localStorage.setItem('quran-hadith:bookmarks', JSON.stringify(bookmarks))
    } catch (error) {
      console.error('[storage] Could not save bookmarks.', error)
    }
  }, [bookmarks])

  useEffect(() => {
    try {
      localStorage.setItem('quran-hadith:history', JSON.stringify(history))
    } catch (error) {
      console.error('[storage] Could not save reading history.', error)
    }
  }, [history])

  const toggleBookmark = useCallback((item: SavedItem) => {
    setBookmarks((current) =>
      current.some((saved) => saved.id === item.id)
        ? current.filter((saved) => saved.id !== item.id)
        : [{ ...item, createdAt: Date.now() }, ...current],
    )
  }, [])
  const recordReading = useCallback((item: ReadingRecord) => {
    setHistory((current) => [
      { ...item, updatedAt: Date.now() },
      ...current.filter((record) => record.id !== item.id),
    ].slice(0, 60))
  }, [])
  const removeHistory = useCallback((id: string) => {
    setHistory((current) => current.filter((item) => item.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      preferences,
      setPreferences,
      bookmarks,
      toggleBookmark,
      history,
      recordReading,
      removeHistory,
    }),
    [preferences, bookmarks, history, toggleBookmark, recordReading, removeHistory],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
