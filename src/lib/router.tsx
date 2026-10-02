/* ============================================================
   KUDII — Hash Router (static-host friendly)
   ============================================================ */
import { useEffect, useState, useCallback } from 'react'

export function useHashPath(): string {
  const [path, setPath] = useState(() => normalize(window.location.hash))
  useEffect(() => {
    const onChange = () => setPath(normalize(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return path
}

function normalize(hash: string): string {
  const h = (hash || '').replace(/^#/, '')
  if (!h) return '/'
  return h.startsWith('/') ? h : '/' + h
}

export function navigate(to: string, opts?: { replace?: boolean }) {
  const target = to.startsWith('/') ? to : '/' + to
  if (opts?.replace) {
    history.replaceState(null, '', '#' + target)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = target
  }
  // scroll to top on navigation
  window.scrollTo({ top: 0, behavior: 'auto' })
}

export interface Route {
  path: string
  segments: string[]
  query: URLSearchParams
}

export function useRoute(): Route {
  const path = useHashPath()
  const [clean, queryStr] = path.split('?')
  const segments = clean.split('/').filter(Boolean)
  return { path: clean, segments, query: new URLSearchParams(queryStr || '') }
}

export function useNavigate() {
  return useCallback((to: string, opts?: { replace?: boolean }) => navigate(to, opts), [])
}
