import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const defaultDatabaseRoot = path.resolve(projectRoot, '..', 'quran-hadith-data')
const databaseRoot = path.resolve(process.env.DATA_SOURCE_DIR || defaultDatabaseRoot)
const allowedRoots = ['quran', 'hadith/chapter-wise']

async function listFiles(directory: string, root: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(absolute, root)))
    else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'))
  }
  return files
}

async function createManifest() {
  const source = await realpath(databaseRoot)
  const required = ['quran/metadata.json', 'hadith/chapter-wise/metadata.json']
  for (const file of required) {
    const fullPath = path.join(source, ...file.split('/'))
    if (!(await stat(fullPath).catch(() => undefined))?.isFile()) {
      throw new Error(`Required database file not found: ${fullPath}. Set DATA_SOURCE_DIR to the database root.`)
    }
  }

  const files: string[] = []
  for (const relativeRoot of allowedRoots) {
    const directory = path.join(source, ...relativeRoot.split('/'))
    files.push(...(await listFiles(directory, source)))
  }
  const quranLanguages = [...new Set(
    files
      .filter((file) => file.startsWith('quran/edition/') && file.toLowerCase().endsWith('/array.json'))
      .map((file) => file.split('/')[2])
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b))
  const hadithCollections = [...new Set(
    files
      .filter((file) => /^hadith\/chapter-wise\/[^/]+\/metadata\.json$/i.test(file))
      .map((file) => file.split('/')[2])
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b))
  const hadithLanguages: Record<string, string[]> = {}
  for (const collection of hadithCollections) {
    hadithLanguages[collection] = [...new Set(
      files
        .filter((file) => file.startsWith(`hadith/chapter-wise/${collection}/`))
        .map((file) => file.split('/')[3])
        .filter((segment): segment is string => Boolean(segment) && segment.toLowerCase() !== 'metadata.json'),
    )].filter((language) => files.some(
      (file) =>
        file.startsWith(`hadith/chapter-wise/${collection}/${language}/`) &&
        /^chapter[\s_-]*\d+/i.test(file.split('/').at(-1) ?? ''),
    )).sort((a, b) => a.localeCompare(b))
  }
  return { source, manifest: { files: files.sort(), quranLanguages, hadithCollections, hadithLanguages } }
}

function localDatabasePlugin(): Plugin {
  let sourceRoot = ''
  let manifestJson = ''
  let allowedFiles = new Set<string>()

  return {
    name: 'read-only-local-quran-hadith-data',
    async configureServer(server) {
      const { source, manifest } = await createManifest()
      sourceRoot = source
      manifestJson = JSON.stringify(manifest)
      allowedFiles = new Set(manifest.files)

      server.middlewares.use(async (request, response, next) => {
        const pathname = (request.url ?? '').split('?')[0]
        const isManifestRequest = pathname === '/data-manifest.json'
        if (!isManifestRequest && !pathname.startsWith('/data/')) {
          next()
          return
        }
        const method = request.method ?? 'GET'
        if (method !== 'GET' && method !== 'HEAD') {
          response.statusCode = 405
          response.setHeader('Allow', 'GET, HEAD')
          response.end('Method not allowed')
          return
        }

        if (isManifestRequest) {
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(method === 'HEAD' ? undefined : manifestJson)
          return
        }
        let relativePath: string
        try {
          relativePath = decodeURIComponent(pathname.slice('/data/'.length))
        } catch {
          response.statusCode = 400
          response.end('Invalid data path')
          return
        }
        if (
          relativePath.includes('\\') ||
          relativePath.split('/').some((segment) => segment === '..' || segment === '.') ||
          !allowedFiles.has(relativePath)
        ) {
          response.statusCode = 404
          response.end('Data file not found')
          return
        }

        const absolute = path.resolve(sourceRoot, ...relativePath.split('/'))
        if (!allowedRoots.some((root) => absolute.startsWith(`${path.resolve(sourceRoot, ...root.split('/'))}${path.sep}`))) {
          response.statusCode = 404
          response.end('Data file not found')
          return
        }
        try {
          const realFile = await realpath(absolute)
          if (!realFile.startsWith(`${sourceRoot}${path.sep}`)) {
            response.statusCode = 404
            response.end('Data file not found')
            return
          }
          const contents = await readFile(realFile)
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.setHeader('X-Content-Type-Options', 'nosniff')
          response.end(method === 'HEAD' ? undefined : contents)
        } catch (error) {
          server.config.logger.error(`Could not read local data file ${relativePath}: ${String(error)}`)
          response.statusCode = 500
          response.end('Could not read data file')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localDatabasePlugin()],
})
