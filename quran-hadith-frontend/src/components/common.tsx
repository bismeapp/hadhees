import { AlertCircle, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { displayLanguage } from '../services/dataResolver'

export function PageHeading({ eyebrow, title, description, actions }: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Opening the library…' }: { label?: string }) {
  return <div className="loading-state"><img src="/assets/bismi-radio-logo.png" alt="" /><span><strong>BISMI RADIO</strong><small>{label}</small></span></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={21} />
      <div><strong>We could not open this content.</strong><p>{message}</p></div>
      {onRetry && <button className="button button-light" onClick={onRetry}><RotateCw size={15} /> Retry</button>}
    </div>
  )
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><span className="empty-ornament">۞</span><h2>{title}</h2><p>{message}</p></div>
}

export function LanguageSelect({
  value,
  languages,
  onChange,
  label,
}: {
  value: string
  languages: string[]
  onChange: (value: string) => void
  label: string
}) {
  const selectedLanguage = languages.find((language) => language.toLowerCase() === value.toLowerCase()) ?? value
  return (
    <label className="select-label">{label}
      <select value={selectedLanguage} onChange={(event) => onChange(event.target.value)}>
        {!languages.some((language) => language.toLowerCase() === value.toLowerCase()) && (
          <option value={value}>{displayLanguage(value)} (unavailable)</option>
        )}
        {languages.map((language) => <option key={language} value={language}>{displayLanguage(language)}</option>)}
      </select>
    </label>
  )
}
