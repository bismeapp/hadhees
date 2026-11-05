import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] Unhandled rendering error.', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-state">
          <div className="status-icon">!</div>
          <h1>Something interrupted the reading experience</h1>
          <p>{this.state.error.message}</p>
          <button className="button button-primary" onClick={() => window.location.reload()}>
            Reload the library
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
