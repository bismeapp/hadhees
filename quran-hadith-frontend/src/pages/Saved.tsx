import { BookOpen, BookText, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, PageHeading } from '../components/common'
import { useAppState } from '../hooks/useLibraryState'

export function BookmarksPage() {
  const { bookmarks, toggleBookmark } = useAppState()
  return (
    <div>
      <PageHeading eyebrow="KEPT CLOSE" title="Your bookmarks" description="Verses and narrations you’ve saved for another moment." />
      {bookmarks.length ? (
        <div className="saved-list">
          {bookmarks.map((item) => (
            <article className="saved-card" key={item.id}>
              <span className="saved-icon">{item.type === 'verse' ? <BookOpen size={17} /> : <BookText size={17} />}</span>
              <div className="saved-copy"><small>{item.type === 'verse' ? 'QURAN VERSE' : 'HADITH'}</small><h2>{item.title}</h2><p>{item.subtitle}</p><blockquote>{item.text}</blockquote></div>
              <div className="saved-actions">
                <Link to={item.url} className="text-button">Open</Link>
                <button className="icon-button" aria-label="Remove bookmark" title="Remove bookmark" onClick={() => toggleBookmark(item)}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState title="Nothing saved just yet" message="Bookmark a verse or Hadith while reading and it will be kept here." />}
    </div>
  )
}

export function HistoryPage() {
  const { history, removeHistory } = useAppState()
  return (
    <div>
      <PageHeading eyebrow="YOUR READING JOURNEY" title="Reading history" description="Return to recently opened Surahs and Hadith chapters." actions={history.length > 0 ? <span className="soft-label">{history.length} recent items</span> : undefined} />
      {history.length ? (
        <div className="history-list">
          {history.map((item) => (
            <article className="history-row" key={item.id}>
              <span className="history-icon">{item.type === 'quran' ? <BookOpen size={17} /> : <BookText size={17} />}</span>
              <span className="history-copy"><small>{item.type === 'quran' ? 'QURAN' : 'HADITH'}</small><strong>{item.title}</strong><span>{item.subtitle}</span></span>
              <time dateTime={new Date(item.updatedAt).toISOString()}>{new Date(item.updatedAt).toLocaleString()}</time>
              <Link to={item.url} className="history-open">Continue <ArrowRightIcon /></Link>
              <button className="icon-button history-remove" aria-label="Remove from reading history" title="Remove from history" onClick={() => removeHistory(item.id)}><Trash2 size={15} /></button>
            </article>
          ))}
        </div>
      ) : <EmptyState title="Your reading history is empty" message="Open any Surah or Hadith chapter to keep your place here." />}
    </div>
  )
}

function ArrowRightIcon() {
  return <span aria-hidden="true">→</span>
}
