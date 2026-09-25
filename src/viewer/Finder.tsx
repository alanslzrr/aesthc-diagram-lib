import { useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { GraphSnapshot } from '../graph'
import { searchNodes } from '../graph'

export interface FinderProps {
  graph: GraphSnapshot
  /** Accessible name of the search input, e.g. "Origin node". */
  label: string
  onSelect: (nodeId: string) => void
  placeholder?: string
  disabled?: boolean
}
/**
 * Semantic finder: ID, label and kind search with deterministic ordering
 * (exact ID, label prefix, label substring, kind prefix, kind substring, then
 * authored order). Unicode case-insensitive, original text preserved.
 */
export function Finder({ graph, label, onSelect, placeholder, disabled }: FinderProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const results = useMemo(() => searchNodes(graph, query, 8), [graph, query])
  const open = query.length > 0 && results.length > 0
  function choose(nodeId: string) {
    onSelect(nodeId)
    setQuery('')
    setActive(0)
    input.current?.focus()
  }
  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault()
      choose(results[active]?.id ?? results[0].id)
    } else if (event.key === 'Escape') {
      setQuery('')
      setActive(0)
    }
  }
  return (
    <div className="adl-viewer-finder">
      <input
        ref={input}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="adl-viewer-finder-results" id={listId} role="listbox" aria-label={label}>
          {results.map((result, index) => (
            <li key={result.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? 'adl-viewer-active' : undefined}
                onClick={() => choose(result.id)}
                onMouseEnter={() => setActive(index)}
              >
                <span>{result.label}</span>
                <span className="adl-viewer-finder-meta">
                  {result.id}
                  {result.kind ? ` · ${result.kind}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.length > 0 && results.length === 0 && (
        <p className="adl-viewer-finder-empty" role="status">
          No matches for “{query}”.
        </p>
      )}
    </div>
  )
}
