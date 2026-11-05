import { cp, mkdir, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const sourceRoot = path.resolve(
  process.env.DATA_SOURCE_DIR || path.resolve(projectRoot, '..', '..', 'quran-hadith-data'),
)
const outputRoot = path.join(projectRoot, '..', 'dist', 'data')
const outputManifest = path.join(projectRoot, '..', 'dist', 'data-manifest.json')

function readFilter(name) {
  return process.env[name]
    ?.split(',')
    .map((value) => value.trim().toLocaleLowerCase())
    .filter(Boolean)
}

function matchesFilter(value, filter) {
  return !filter?.length || filter.includes(value.toLocaleLowerCase())
}

async function walk(directory, root) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(absolute, root)))
    else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'))
  }
  return files
}

const source = await realpath(sourceRoot)
for (const required of ['quran/metadata.json', 'hadith/chapter-wise/metadata.json']) {
  const file = path.join(source, ...required.split('/'))
  if (!(await stat(file).catch(() => undefined))?.isFile()) {
    throw new Error(`Required data file not found: ${file}. Set DATA_SOURCE_DIR to the database root.`)
  }
}

const quranFilter = readFilter('QURAN_LANGUAGES')
const collectionFilter = readFilter('HADITH_COLLECTIONS')
const hadithLanguageFilter = readFilter('HADITH_LANGUAGES')
const files = await walk(source, source)
const selected = files.filter((file) => {
  if (file === 'quran/metadata.json' || file === 'hadith/chapter-wise/metadata.json') return true
  const parts = file.split('/')
  if (parts[0] === 'quran' && parts[1] === 'edition') {
    return matchesFilter(parts[2], quranFilter)
  }
  if (parts[0] === 'hadith' && parts[1] === 'chapter-wise') {
    if (!matchesFilter(parts[2], collectionFilter)) return false
    if (parts.length >= 5 && !matchesFilter(parts[3], hadithLanguageFilter)) return false
    return true
  }
  return false
})

await rm(outputRoot, { recursive: true, force: true })
await mkdir(outputRoot, { recursive: true })
for (const relative of selected) {
  const destination = path.join(outputRoot, ...relative.split('/'))
  await mkdir(path.dirname(destination), { recursive: true })
  await cp(path.join(source, ...relative.split('/')), destination)
}

const quranLanguages = [...new Set(
  selected
    .filter((file) => file.startsWith('quran/edition/') && file.toLowerCase().endsWith('/array.json'))
    .map((file) => file.split('/')[2]),
)].sort((a, b) => a.localeCompare(b))
const hadithCollections = [...new Set(
  selected
    .filter((file) => /^hadith\/chapter-wise\/[^/]+\/metadata\.json$/i.test(file))
    .map((file) => file.split('/')[2]),
)].sort((a, b) => a.localeCompare(b))
const hadithLanguages = {}
for (const collection of hadithCollections) {
  hadithLanguages[collection] = [...new Set(
    selected
      .filter((file) => file.startsWith(`hadith/chapter-wise/${collection}/`))
      .map((file) => file.split('/')[3])
      .filter((segment) => segment && segment !== 'metadata.json'),
  )].filter((language) => selected.some(
    (file) =>
      file.startsWith(`hadith/chapter-wise/${collection}/${language}/`) &&
      /^chapter[\s_-]*\d+/i.test(file.split('/').at(-1) ?? ''),
  )).sort((a, b) => a.localeCompare(b))
}

await writeFile(
  outputManifest,
  `${JSON.stringify({ files: selected.sort(), quranLanguages, hadithCollections, hadithLanguages }, null, 2)}\n`,
  'utf8',
)
console.log(`Packaged ${selected.length} unchanged source files into dist/data.`)
console.log(`Quran languages: ${quranLanguages.length}; Hadith collections: ${hadithCollections.length}.`)
