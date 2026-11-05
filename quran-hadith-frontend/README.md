# BISMI RADIO — Quran and Hadith Reader

BISMI RADIO is a static React application for reading the Quran and six Hadith collections from the existing local JSON database. The frontend keeps the database read-only and loads records from the existing data layout.

## About the Application

The application provides a multilingual Quran and Hadith reading experience, local search, bookmarks, reading history, and saved reader preferences. It is built with React, TypeScript, Vite, and React Router.

## Main Features

- Browse all Quran Surahs and six Hadith collections.
- Read Arabic Quran text continuously by default; enable a selected translation when needed.
- Read Hadith with Arabic presented first and the selected available translation below it.
- Search Surahs, chapters, and the currently selected Quran edition or Hadith chapter.
- Keep bookmarks, reading history, language choices, and reader settings in browser storage.
- Build a static site without a runtime API server or database service.

## Quran Reader

The reader loads the selected Surah from the Arabic Quran edition, preserves verse boundaries and numbering, and displays the Arabic text in RTL order. Translation is hidden initially. The translation toggle reveals edition text beneath its corresponding verse; if a verse or edition is unavailable, the reader reports that instead of substituting another language.

The reader includes available language selection, Arabic and translation font-size controls, optional available transliteration, Surah bookmarks, verse copy/share, and previous/next Surah navigation.

## Quran Multilingual Translation

The language selector is populated from Quran editions detected in the source database. The Arabic source is loaded independently from the selected translation. Edition normalization supports the database's array and object-based verse shapes, and Surah numbers are used to select the corresponding chapter.

## Hadith Reader

Hadith chapters are loaded on demand. Records are aligned using their book and chapter Hadith identifiers rather than array position. Arabic is fetched from the Arabic edition independently of the selected translation and remains first in the card. Missing translations and missing Arabic text are reported explicitly; no replacement text is fabricated.

## Arabic-First Hadith Display

Each Hadith card presents its number/reference, Arabic text, a divider and selected translation, then optional narrator and grade details. English, Tamil, Malayalam, and Arabic are shown only when the chosen collection has the corresponding source edition. A missing per-Hadith translation is clearly identified.

## Supported Hadith Collections

The reader preserves the collections in the database:

1. Sahih al-Bukhari
2. Sahih Muslim
3. Sunan Abu Dawud
4. Sunan Ibn Majah
5. Sunan an-Nasa'i
6. Jami at-Tirmidhi

## Supported Languages and Availability

Quran and Hadith language choices come from the packaged data manifest. English, Tamil, Malayalam, Arabic, and other editions are offered only when present. Availability can vary between Hadith collections; for example, Abu Dawud does not currently have Tamil or Malayalam chapters in the supplied database.

## JSON Database Architecture

The sibling database project supplies Quran metadata and editions under `quran/`, and Hadith metadata and chapter files under `hadith/chapter-wise/`. The frontend reads the files in place during development. A production build copies the selected files unchanged to `dist/data/` and generates a manifest for that packaged subset. It does not edit, rename, consolidate, or restructure the original JSON.

## Frontend Architecture

- `src/pages/` contains the routed Home, Quran, Hadith, search, settings, bookmark, and history screens.
- `src/components/` contains shared layout and UI components.
- `src/services/` resolves data paths and loads, normalizes, and aligns Quran and Hadith records.
- `src/hooks/` stores shared application state and browser-persisted preferences.
- `src/types.ts` contains the TypeScript data and application-state interfaces.
- `public/assets/bismi-radio-logo.png` is the supplied logo integration point. The image is displayed with its proportions preserved.
- `scripts/copy-data.mjs` packages the selected database files for production.

## Data Loading and Lazy Loading

Vite's development data middleware uses an allow-list of source files and serves read-only data requests. Quran editions are loaded when requested, and Hadith chapter files are fetched individually. The production manifest records only the files included in a build. Search limits data loading to the relevant Quran edition or selected Hadith chapter rather than loading the full Hadith corpus.

## Bookmarks and Reading History

Bookmarks, reading history, and preferences are stored in the user's browser `localStorage`; they are not written to the source database. Quran Surah/verse and Hadith bookmarks retain reader links and available text.

## Installation Instructions

Open a terminal in `quran-hadith-frontend/` and install the dependencies:

```sh
npm install
```

By default, the sibling `quran-hadith-data/` folder is used. If it is elsewhere, set `DATA_SOURCE_DIR` to the directory containing `quran/` and `hadith/`.

## Development Instructions

```sh
npm run dev
```

Vite prints the local development URL. To use a non-default database location in PowerShell:

```powershell
$env:DATA_SOURCE_DIR = 'C:\path\to\database-root'
npm run dev
```

## Production Build Instructions

```sh
npm run build
npm run preview
```

The build runs the TypeScript project build, creates the Vite production output, and copies the selected JSON data under `dist/data/`. By default, all available Quran editions and Hadith collections are packaged. Optional comma-separated filters are `QURAN_LANGUAGES`, `HADITH_COLLECTIONS`, and `HADITH_LANGUAGES`.

## Static Website Deployment

Deploy the contents of `dist/` to a static host. Configure SPA fallback so direct routes, including `/quran/1` and `/hadith/bukhari/1`, serve `index.html`. The production application requires no separate API or database server.

This repository includes a Render Blueprint at its root. Create a Render Static Site from the existing GitHub repository and use the `main` branch. Leave the service's Root Directory blank (the repository root) so the build can access both `quran-hadith-frontend/` and its sibling `quran-hadith-data/` directory. The Blueprint installs and builds the frontend from the repository root, publishes `quran-hadith-frontend/dist/`, and rewrites client-side routes to `index.html`. Node.js `24.22.1` is pinned in the repository's `.node-version` file. No environment variables are required when the sibling `quran-hadith-data/` directory is present in the repository. The build packages all available Quran editions and Hadith collections, so it can take time and produces a sizable static asset set.

## Folder Structure

```text
Sumaya-17-quran-hadith-json-d513ff1/
├── quran-hadith-data/                    # Existing JSON database (read-only)
└── quran-hadith-frontend/                # BISMI RADIO application
    ├── public/assets/                    # Supplied logo
    ├── scripts/                           # Production data packaging
    ├── src/                               # React application
    └── dist/                              # Generated production output
```

## Adding New Quran Editions

Add a language edition to the existing database structure under `quran/edition/`, preserving the source's metadata, filenames, and verse identifiers. The data manifest detects available editions. Validate it in development and include the language in `QURAN_LANGUAGES` if building a filtered deployment.

## Adding New Hadith Collections

Add the collection to the existing database structure under `hadith/chapter-wise/`, preserving its metadata, chapter files, numbering, and identifiers. Confirm an Arabic chapter edition is available, then test chapter navigation and identifier-based matching. Include the collection and desired language folders in the production filters if applicable.

## Handling Missing Translations

The reader never substitutes English for a selected Tamil or Malayalam edition. Missing collection editions, unavailable Hadith translations, and unavailable verse translations are reported in the interface. Original Arabic and translation sources are not fabricated or rewritten.

## Troubleshooting

- **Data manifest unavailable:** ensure the sibling `quran-hadith-data/` folder or `DATA_SOURCE_DIR` points to the database root containing `quran/` and `hadith/`, then restart Vite.
- **Edition or chapter unavailable:** verify that the source file exists and that the language or collection was included in a filtered production build.
- **Invalid source JSON:** the affected file reports a controlled loading error. The source database remains unchanged.
- **Production data is stale:** run `npm run build` again after changing data filters.
- **Language unavailable in a collection:** choose only an edition supplied for that collection; no fallback translation is presented.

## Application Branding and Credits

The product name is **BISMI RADIO**. The browser title, interface, and logo integration use this branding. The provided logo is located at `public/assets/bismi-radio-logo.png`; replace that asset with the official updated logo when supplied, keeping the image's aspect ratio. The application reads the existing Quran and Hadith JSON database without modifying its source files.
