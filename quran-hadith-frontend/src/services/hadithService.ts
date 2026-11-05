import type {
  DataManifest,
  AlignedHadithEntry,
  HadithChapter,
  HadithCollectionMetadata,
} from '../types'
import { getDataManifest, loadJson } from './dataLoader'
import { hasHadithLanguage, resolveCollectionFolder, resolveHadithChapter } from './dataResolver'

export async function getHadithManifest(): Promise<DataManifest> {
  return getDataManifest()
}

export async function getHadithCollections(): Promise<HadithCollectionMetadata[]> {
  const [manifest, records] = await Promise.all([
    getDataManifest(),
    loadJson<HadithCollectionMetadata[]>('hadith/chapter-wise/metadata.json'),
  ])
  return records.filter((record) => {
    const folder = resolveCollectionFolder(manifest, record.book_name_english)
    return Boolean(folder && manifest.files.includes(`hadith/chapter-wise/${folder}/metadata.json`))
  })
}

export async function getHadithCollection(collection: string): Promise<HadithCollectionMetadata> {
  const manifest = await getDataManifest()
  const folder = resolveCollectionFolder(manifest, collection)
  if (!folder) throw new Error(`Hadith collection "${collection}" is not available in the packaged data.`)
  const path = `hadith/chapter-wise/${folder}/metadata.json`
  if (!manifest.files.includes(path)) throw new Error(`Metadata is missing for the ${collection} collection.`)
  return loadJson<HadithCollectionMetadata>(path)
}

export async function getHadithLanguages(collection: string): Promise<string[]> {
  const manifest = await getDataManifest()
  const folder = resolveCollectionFolder(manifest, collection)
  return folder ? manifest.hadithLanguages[folder] ?? [] : []
}

export async function getHadithChapter(
  collection: string,
  language: string,
  chapterNumber: number,
): Promise<HadithChapter> {
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    throw new RangeError(`Invalid Hadith chapter number: ${chapterNumber}`)
  }
  const manifest = await getDataManifest()
  if (!hasHadithLanguage(manifest, collection, language)) {
    throw new Error('Translation not available for this collection.')
  }
  const path = resolveHadithChapter(manifest, collection, language, chapterNumber)
  if (!path) throw new Error(`Chapter ${chapterNumber} is not available in ${language}.`)

  const basename = path.split('/').at(-1)?.toLowerCase() ?? ''
  const recoverMalformedHadith =
    collection.toLowerCase() === 'nasai' &&
    language.toLowerCase() === 'tamil' &&
    (basename === 'chapter20_tamil.json' || basename === 'chapter8_tamil.json')

  return loadJson<HadithChapter>(path, { recoverMalformedHadith })
}

export async function getHadithArabicChapter(
  collection: string,
  chapterNumber: number,
): Promise<HadithChapter> {
  return getHadithChapter(collection, 'arabic', chapterNumber)
}

export function alignHadithByIdentifiers(
  arabicChapter: HadithChapter,
  translationChapter: HadithChapter,
): AlignedHadithEntry[] {
  const translationByBookNumber = new Map<number, HadithChapter['hadith_list'][number]>()
  const translationByChapterNumber = new Map<number, HadithChapter['hadith_list'][number]>()
  for (const translation of translationChapter.hadith_list) {
    if (Number.isInteger(translation.hadithNum_inBook)) {
      translationByBookNumber.set(translation.hadithNum_inBook!, translation)
    }
    if (Number.isInteger(translation.hadithNum_inChapter)) {
      translationByChapterNumber.set(translation.hadithNum_inChapter!, translation)
    }
  }

  const missingMatches: number[] = []
  const aligned = arabicChapter.hadith_list.map((arabic) => {
    const translation =
      (Number.isInteger(arabic.hadithNum_inBook)
        ? translationByBookNumber.get(arabic.hadithNum_inBook!)
        : undefined) ??
      (Number.isInteger(arabic.hadithNum_inChapter)
        ? translationByChapterNumber.get(arabic.hadithNum_inChapter!)
        : undefined)
    if (!translation) missingMatches.push(arabic.hadithNum_inBook ?? arabic.hadithNum_inChapter ?? 0)
    return { arabic, translation }
  })

  if (missingMatches.length) {
    console.warn(
      `[data] ${missingMatches.length} translation records could not be matched by Hadith identifiers: ${missingMatches.join(', ')}`,
    )
  }
  return aligned
}
