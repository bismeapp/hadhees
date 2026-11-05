import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LibraryLayout } from './components/LibraryLayout'
import { AppStateProvider } from './hooks/useAppState'
import { HadithCollectionPage, HadithOverviewPage, HadithReaderPage } from './pages/Hadith'
import { HomePage } from './pages/Home'
import { QuranOverviewPage, QuranReaderPage } from './pages/Quran'
import { SearchPage } from './pages/Search'
import { BookmarksPage, HistoryPage } from './pages/Saved'
import { SettingsPage } from './pages/Settings'
import './App.css'
import './theme.css'

export default function App() {
  return (
    <BrowserRouter>
      <AppStateProvider>
        <ErrorBoundary>
          <Routes>
            <Route element={<LibraryLayout />}>
              <Route index element={<HomePage />} />
              <Route path="quran" element={<QuranOverviewPage />} />
              <Route path="quran/:surahNumber" element={<QuranReaderPage />} />
              <Route path="hadith" element={<HadithOverviewPage />} />
              <Route path="hadith/:collection" element={<HadithCollectionPage />} />
              <Route path="hadith/:collection/:chapterNumber" element={<HadithReaderPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="bookmarks" element={<BookmarksPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </AppStateProvider>
    </BrowserRouter>
  )
}
