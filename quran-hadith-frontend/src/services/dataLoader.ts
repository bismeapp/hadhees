import type { DataManifest } from '../types'

export class DataLoadError extends Error {
  readonly path: string
  readonly kind: 'missing' | 'network' | 'invalid-json' | 'manifest'

  constructor(
    message: string,
    path: string,
    kind: 'missing' | 'network' | 'invalid-json' | 'manifest',
  ) {
    super(message)
    this.name = 'DataLoadError'
    this.path = path
    this.kind = kind
  }
}

const cache = new Map<string, Promise<unknown>>()
let manifestPromise: Promise<DataManifest> | undefined
const maxCachedFiles = 48

function recoverJsonText(text: string): string {
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (inString) {
      if (escaped) {
        output += character
        escaped = false
      } else if (character === '\\') {
        output += character
        escaped = true
      } else if (character === '"') {
        output += character
        inString = false
      } else if (character.charCodeAt(0) < 0x20) {
        output += `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
      } else {
        output += character
      }
      continue
    }

    if (character === '"') {
      output += character
      inString = true
    } else if (character === ',') {
      let next = index + 1
      while (next < text.length && /\s/.test(text[next])) next += 1
      if (text[next] !== '}' && text[next] !== ']') output += character
    } else {
      output += character
    }
  }

  return output
}

export async function getDataManifest(): Promise<DataManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch('/data-manifest.json')
      .then(async (response) => {
        if (!response.ok) {
          throw new DataLoadError(
            'The local data manifest could not be loaded. Run the app from its configured database folder.',
            'data-manifest.json',
            response.status === 404 ? 'manifest' : 'network',
          )
        }
        try {
          return (await response.json()) as DataManifest
        } catch {
          throw new DataLoadError('The data manifest is not valid JSON.', 'data-manifest.json', 'manifest')
        }
      })
      .catch((error: unknown) => {
        manifestPromise = undefined
        throw error
      })
  }
  return manifestPromise
}

export async function loadJson<T>(
  path: string,
  options: { recoverMalformedHadith?: boolean } = {},
): Promise<T> {
  const cached = cache.get(path)
  if (cached) {
    cache.delete(path)
    cache.set(path, cached)
    return cached as Promise<T>
  }

  const request = fetch(`/data/${path.split('/').map(encodeURIComponent).join('/')}`)
    .then(async (response) => {
      if (!response.ok) {
        const kind = response.status === 404 ? 'missing' : 'network'
        throw new DataLoadError(
          response.status === 404
            ? `The requested data file was not found: ${path}`
            : `Could not load data (${response.status}): ${path}`,
          path,
          kind,
        )
      }
      return response.text()
    })
    .then((text) => {
      try {
        return JSON.parse(text.replace(/^\uFEFF/, '')) as T
      } catch (originalError) {
        if (options.recoverMalformedHadith) {
          try {
            const recovered = JSON.parse(recoverJsonText(text)) as T
            console.warn(`[data] Recovered malformed Hadith JSON in memory: ${path}`)
            return recovered
          } catch {
            console.error(`[data] Could not safely recover malformed JSON: ${path}`, originalError)
          }
        }
        throw new DataLoadError(
          `This file contains invalid JSON and could not be safely recovered: ${path}`,
          path,
          'invalid-json',
        )
      }
    })
    .then((value: unknown) => {
      while (cache.size > maxCachedFiles) {
        const oldestPath = cache.keys().next().value
        if (!oldestPath || oldestPath === path) break
        cache.delete(oldestPath)
      }
      return value
    })
    .catch((error: unknown) => {
      cache.delete(path)
      if (error instanceof DataLoadError) throw error
      console.error(`[data] Failed to load ${path}`, error)
      throw new DataLoadError(`A network or file-loading error occurred for: ${path}`, path, 'network')
    })

  cache.set(path, request)
  return request as Promise<T>
}

export function clearDataCache(path?: string): void {
  if (path) cache.delete(path)
  else cache.clear()
}
