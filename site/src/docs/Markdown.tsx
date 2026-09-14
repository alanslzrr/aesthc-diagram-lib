import { InstallSnippet } from '../components/InstallSnippet'
import { CopyIcon } from '../components/primitives/icons'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { useEffect, useState } from 'react'
import type { DocToken } from './model'
import { safeHref } from './model'
import { ScrollArea } from '../components/primitives/ScrollArea'

export function DocLink({ href = '', children, ...props }: React.ComponentProps<'a'>) {
  const safe = safeHref(href)
  return /\/(?:docs|agents)\//.test(safe) &&
    safe.startsWith('/') &&
    !/\.[a-z0-9]+(?:[#?]|$)/i.test(safe) &&
    !props.download ? (
    <Link to={safe} {...props}>
      {children}
    </Link>
  ) : (
    <a href={safe} {...props}>
      {children}
    </a>
  )
}
const decode = (text = '') =>
  text.replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos);/gi, (full, entity: string) => {
    const chars: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
    if (entity[0] !== '#') return chars[entity] ?? full
    const n = entity[1] === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : full
  })
export function CopyCode({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const [status, setStatus] = useState('Copy')
  useEffect(() => {
    if (status === 'Copy') return
    const timer = setTimeout(() => setStatus('Copy'), 1800)
    return () => clearTimeout(timer)
  }, [status])
  return (
    <button
      type="button"
      className="control copy-code js-only"
      data-copy-code
      data-copy-agent={label === 'Copy integration request' ? '' : undefined}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setStatus('Copied')
        } catch {
          setStatus('Copy failed')
        }
      }}
    >
      <CopyIcon />
      <span aria-hidden="true">{status}</span>
      <span className="sr-only" role="status">
        {status !== 'Copy'
          ? status === 'Copied'
            ? 'Copied to clipboard'
            : 'Copy failed. Select the code and copy it manually.'
          : ''}
      </span>
    </button>
  )
}
export function CodeBlock({
  text,
  language = 'text',
  highlighted,
  label,
}: {
  text: string
  language?: string
  highlighted?: string
  label?: string
}) {
  const install = language === 'bash' && /^npm install [^\n]+$/.test(text.trim())
  if (install)
    return (
      <InstallSnippet
        packages={text.trim().replace(/^npm install /, '')}
        label={label ?? 'Install package'}
      />
    )
  const code = text
  return (
    <section className="code-block not-typeset">
      <div className="code-toolbar">
        <span>{language}</span>
        <CopyCode
          text={code}
          label={label ? `Copy ${label.toLowerCase()}` : `Copy ${language} code`}
        />
      </div>
      <ScrollArea orientation="both" label={label ?? `${language} code`} className="code-scroll">
        <pre>
          <code>
            {highlighted ? <span dangerouslySetInnerHTML={{ __html: highlighted }} /> : code}
          </code>
        </pre>
      </ScrollArea>
    </section>
  )
}
export function Tokens({ tokens = [] }: { tokens?: DocToken[] }) {
  return (
    <>
      {tokens.map((token, index) => (
        <Fragment key={index}>
          <Token token={token} />
        </Fragment>
      ))}
    </>
  )
}
function Token({ token: t }: { token: DocToken }) {
  const nested = t.tokens ? <Tokens tokens={t.tokens} /> : decode(t.text)
  switch (t.type) {
    case 'space':
    case 'def':
      return null
    case 'text':
    case 'escape':
      return nested
    case 'paragraph':
      return <p>{nested}</p>
    case 'strong':
      return <strong>{nested}</strong>
    case 'em':
      return <em>{nested}</em>
    case 'del':
      return <del>{nested}</del>
    case 'br':
      return <br />
    case 'hr':
      return <hr />
    case 'codespan':
      return <code>{decode(t.text)}</code>
    case 'link':
      return (
        <DocLink href={t.href} title={t.title ?? undefined}>
          {nested}
        </DocLink>
      )
    case 'image':
      return (
        <img
          src={safeHref(t.href)}
          alt={decode(t.text)}
          title={t.title ?? undefined}
          loading="lazy"
        />
      )
    case 'heading': {
      const Tag = `h${t.depth}` as 'h1' | 'h2' | 'h3' | 'h4'
      return (
        <Tag id={t.id}>
          {nested}
          {t.depth !== 1 && (
            <a
              className="heading-anchor"
              href={`#${t.id}`}
              aria-label={`Link to ${decode(t.text).replace(/[`*_]/g, '')}`}
            >
              #
            </a>
          )}
        </Tag>
      )
    }
    case 'blockquote':
      return <blockquote>{nested}</blockquote>
    case 'list': {
      const Tag = t.ordered ? 'ol' : 'ul'
      return (
        <Tag start={t.ordered ? t.start : undefined}>
          {t.items?.map((item, index) => (
            <li key={index}>
              {item.task && (
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled
                  aria-label="Task completion"
                />
              )}
              <Tokens tokens={item.tokens} />
            </li>
          ))}
        </Tag>
      )
    }
    case 'code':
      return (
        <CodeBlock text={t.text ?? ''} language={t.lang ?? 'text'} highlighted={t.highlighted} />
      )
    case 'table':
      return (
        <ScrollArea orientation="horizontal" label="Documentation table" className="table-scroll">
          <table>
            <thead>
              <tr>
                {t.header?.map((cell, index) => (
                  <th key={index} style={{ textAlign: t.align?.[index] ?? undefined }}>
                    <Tokens tokens={cell.tokens} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows?.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, i) => (
                    <td key={i} style={{ textAlign: t.align?.[i] ?? undefined }}>
                      <Tokens tokens={cell.tokens} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      )
    // Raw HTML remains text, never a JSX or executable-content boundary.
    default:
      return decode(t.text)
  }
}
