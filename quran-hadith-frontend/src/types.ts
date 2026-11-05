export interface DataManifest {
  files: string[]
  quranLanguages: string[]
  hadithCollections: string[]
  hadithLanguages: Record<string, string[]>
}

export interface SurahMetadata {
  surahName: string
  surahNameArabic: string
  surahNameArabicLong?: string
  surahNameTranslation: string
  revelationPlace?: string
  totalAyah: number
  surahNo: number
}

export interface QuranMetadata {
  quran_name: string
  total_verses: number
  total_surahs: number
  chapter_details: SurahMetadata[]
}

export interface QuranEditionSurah {
  chapter: number
  versesCount: number
  verses: string[]
}

export interface AlignedHadithEntry {
  arabic: HadithEntry
  translation?: HadithEntry
}

export interface HadithChapterMetadata {
  chapter_title_english?: string
  chapter_title_arabic?: string
  chapter_title_tamil?: string
  chapter_title_malayalam?: string
  total_hadiths_inChapter: number
  chapter_first_hadith: number
  chapter_last_hadith: number
}

export interface HadithCollectionMetadata {
  book_name_english: string
  book_name_arabic: string
  book_name_tamil?: string
  book_name_malayalam?: string
  book_short_desc?: string
  total_hadiths_inBook: number
  total_chapters_inBook: number
  all_chapters_detail: HadithChapterMetadata[]
}

export interface HadithEntry {
  hadithNum_inChapter?: number
  hadithNum_inBook?: number
  title?: string
  narrator?: string
  arabic_text?: string
  english_text?: string
  tamil_text?: string
  malayalam_text?: string
  grade?: string
  [key: string]: unknown
}

export interface HadithChapter {
  chapterNum?: number
  english_title?: string
  arabic_title?: string
  tamil_title?: string
  malayalam_title?: string
  totalHadiths_inChapter?: number
  hadith_list: HadithEntry[]
}

export interface SavedItem {
  id: string
  type: 'surah' | 'verse' | 'hadith'
  title: string
  subtitle: string
  text: string
  url: string
  createdAt: number
}

export interface ReadingRecord {
  id: string
  type: 'quran' | 'hadith'
  title: string
  subtitle: string
  url: string
  updatedAt: number
}
