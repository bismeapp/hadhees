import type { DataManifest, QuranEditionSurah, QuranMetadata, SurahMetadata } from '../types'
import { getDataManifest, loadJson } from './dataLoader'
import { resolveQuranEdition } from './dataResolver'

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function verseText(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  const item = record(value)
  if (!item) return undefined
  for (const key of ['text', 'verse', 'translation', 'arabic', 'content']) {
    if (typeof item[key] === 'string') return item[key] as string
  }
  return undefined
}

function normalizeEdition(payload: unknown): QuranEditionSurah[] {
  const top = record(payload)
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(top?.surahs)
      ? top.surahs
      : Array.isArray(top?.data)
        ? top.data
        : top
          ? Object.values(top)
          : []

  return candidates.flatMap((candidate) => {
    const item = record(candidate)
    if (!item) return []
    const chapter = Number(item.chapter ?? item.surah ?? item.surahNo ?? item.chapterNumber)
    const rawVerses = item.verses ?? item.ayahs ?? item.verseList
    const verseCandidates = Array.isArray(rawVerses)
      ? rawVerses
      : record(rawVerses)
        ? Object.entries(rawVerses as Record<string, unknown>)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([, value]) => value)
        : []
    const verses = verseCandidates.map(verseText).filter((text): text is string => text !== undefined)
    if (!Number.isInteger(chapter) || chapter < 1 || verses.length === 0) return []
    return [{ chapter, versesCount: Number(item.versesCount ?? item.ayahCount ?? verses.length), verses }]
  })
}

export async function getQuranMetadata(): Promise<QuranMetadata> {
  const records = await loadJson<QuranMetadata[]>('quran/metadata.json')
  const metadata = records[0]
  if (!metadata?.chapter_details?.length) throw new Error('Quran metadata does not contain Surah details.')
  return metadata
}

export async function getQuranLanguages(): Promise<string[]> {
  const manifest = await getDataManifest()
  return manifest.quranLanguages
}

export async function getQuranEdition(
  language: string,
  script: 'array' | 'array_la' | 'array_lad' = 'array',
): Promise<QuranEditionSurah[]> {
  const manifest = await getDataManifest()
  const path = resolveQuranEdition(manifest, language, script)
  if (!path) throw new Error(`The ${language} Quran ${script} edition is not available.`)
  return normalizeEdition(await loadJson<unknown>(path))
}

export async function getSurah(
  surahNumber: number,
): Promise<{ metadata: SurahMetadata; arabic: QuranEditionSurah }> {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    throw new RangeError(`Invalid Surah number: ${surahNumber}`)
  }
  const [metadata, arabicEdition] = await Promise.all([
    getQuranMetadata(),
    getQuranEdition('Arabic'),
  ])
  const surah = metadata.chapter_details.find((item) => item.surahNo === surahNumber)
  const arabic = arabicEdition.find((item) => item.chapter === surahNumber)
  if (!surah || !arabic) throw new Error(`Surah ${surahNumber} is missing from the Arabic Quran edition or metadata.`)
  return { metadata: surah, arabic }
}

export async function getSurahTranslation(
  surahNumber: number,
  language: string,
): Promise<QuranEditionSurah | undefined> {
  const edition = await getQuranEdition(language)
  return edition.find((item) => item.chapter === surahNumber)
}

export function getQuranManifest(): Promise<DataManifest> {
  return getDataManifest()
}
