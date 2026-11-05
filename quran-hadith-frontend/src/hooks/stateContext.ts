import { createContext } from 'react'
import type { ReadingRecord, SavedItem } from '../types'

export interface Preferences {
  quranLanguage: string
  hadithLanguage: string
  interfaceLanguage: string
  theme: 'light' | 'dark'
  fontSize: number
  readingLayout: 'comfortable' | 'compact'
  transliteration: boolean
  transliterationEdition: 'array_la' | 'array_lad'
  showQuranTranslation: boolean
  arabicFontSize: number
  translationFontSize: number
}

export interface AppStateValue {
  preferences: Preferences
  setPreferences: (value: Preferences | ((current: Preferences) => Preferences)) => void
  bookmarks: SavedItem[]
  toggleBookmark: (item: SavedItem) => void
  history: ReadingRecord[]
  recordReading: (item: ReadingRecord) => void
  removeHistory: (id: string) => void
}

export const AppStateContext = createContext<AppStateValue | null>(null)
