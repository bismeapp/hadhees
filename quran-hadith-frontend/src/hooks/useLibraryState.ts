import { useContext } from 'react'
import { AppStateContext } from './stateContext'

export function useAppState() {
  const state = useContext(AppStateContext)
  if (!state) throw new Error('useAppState must be used within AppStateProvider.')
  return state
}
