import type { DataManifest } from '../types'

const normalized = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '')

export function resolveQuranEdition(
  manifest: DataManifest,
  language: string,
  script: 'array' | 'array_la' | 'array_lad' = 'array',
): string | undefined {
  return manifest.files.find((file) => {
    const parts = file.split('/')
    return (
      parts[0] === 'quran' &&
      parts[1] === 'edition' &&
      normalized(parts[2] ?? '') === normalized(language) &&
      parts[3]?.toLowerCase() === `${script}.json`
    )
  })
}

export function resolveCollectionFolder(manifest: DataManifest, collection: string): string | undefined {
  return manifest.hadithCollections.find((name) => normalized(name) === normalized(collection))
}

export function resolveHadithChapter(
  manifest: DataManifest,
  collection: string,
  language: string,
  chapterNumber: number,
): string | undefined {
  const collectionFolder = resolveCollectionFolder(manifest, collection)
  if (!collectionFolder || !manifest.hadithLanguages[collectionFolder]?.some(
    (available) => normalized(available) === normalized(language),
  )) {
    return undefined
  }

  const candidates = manifest.files
    .filter((file) => {
      const parts = file.split('/')
      if (
        parts[0] !== 'hadith' ||
        parts[1] !== 'chapter-wise' ||
        normalized(parts[2] ?? '') !== normalized(collectionFolder) ||
        normalized(parts[3] ?? '') !== normalized(language)
      ) {
        return false
      }
      const basename = (parts.at(-1) ?? '').replace(/\.json$/i, '')
      const match = basename.match(/^chapter[\s_-]*0*(\d+)(?:[_\s-].*)?$/i)
      return match ? Number(match[1]) === chapterNumber : false
    })
    .sort((left, right) => {
      const leftName = left.split('/').at(-1) ?? ''
      const rightName = right.split('/').at(-1) ?? ''
      const leftJson = leftName.toLowerCase().endsWith('.json') ? 1 : 0
      const rightJson = rightName.toLowerCase().endsWith('.json') ? 1 : 0
      return rightJson - leftJson || leftName.localeCompare(rightName)
    })

  return candidates[0]
}

export function hasHadithLanguage(manifest: DataManifest, collection: string, language: string): boolean {
  const folder = resolveCollectionFolder(manifest, collection)
  return Boolean(folder && manifest.hadithLanguages[folder]?.some(
    (available) => normalized(available) === normalized(language),
  ))
}

export function displayLanguage(value: string): string {
  const labels: Record<string, string> = {
    arabic: 'Arabic',
    english: 'English',
    tamil: 'Tamil',
    malayalam: 'Malayalam',
  }
  return labels[normalized(value)] ?? value
}
