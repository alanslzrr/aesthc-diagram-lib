// Keep editable text separate from validated colors. Only the local SVG preview
// receives custom tokens; copying exports the valid host theme block.

import { useMemo, useState } from 'react'

import type { Locale } from '../content'
import { STRINGS } from '../content'
import { isHexColor, themeCss, type ThemeTokens } from '../lib/code'
import { DEFAULT_LIGHT, DEFAULT_DARK } from '../lib/palette'
import { MESSAGES } from '../lib/messages'
import { CopyButton, ControlButton } from './ui'

interface Preset {
  name: string
  light: Partial<ThemeTokens>
  dark: Partial<ThemeTokens>
}

const PRESETS: Preset[] = [
  { name: 'aesthc', light: {}, dark: {} },
  {
    name: 'moss',
    light: { cobalt: '#0d9c6f', branch: '#b0873f' },
    dark: { cobalt: '#17c08a', branch: '#c69a52' },
  },
  {
    name: 'violet',
    light: { cobalt: '#7c5cf0', branch: '#d6746e' },
    dark: { cobalt: '#9678ff', branch: '#e08a84' },
  },
  {
    name: 'ember',
    light: { cobalt: '#e0662e', branch: '#6f7d90' },
    dark: { cobalt: '#ff7f45', branch: '#8b9aae' },
  },
]

const FIELDS: Array<{ token: keyof ThemeTokens; label: string; cssVar: string }> = [
  { token: 'cobalt', label: 'cobalt · main', cssVar: '--cobalt' },
  { token: 'branch', label: 'branch · alt', cssVar: '--branch' },
  { token: 'background', label: 'background', cssVar: '--background' },
  { token: 'card', label: 'card', cssVar: '--card' },
  { token: 'border', label: 'border', cssVar: '--border' },
  { token: 'foreground', label: 'foreground', cssVar: '--foreground' },
]

export function ThemeStudio({ locale, theme }: { locale: Locale; theme: 'light' | 'dark' }) {
  const [light, setLight] = useState<ThemeTokens>(DEFAULT_LIGHT)
  const [dark, setDark] = useState<ThemeTokens>(DEFAULT_DARK)
  const [preset, setPreset] = useState('aesthc')

  const css = useMemo(() => themeCss(light, dark), [light, dark])

  const [lightText, setLightText] = useState(DEFAULT_LIGHT)
  const [darkText, setDarkText] = useState(DEFAULT_DARK)
  const previewCss = useMemo(() => themeCss(light, dark, '.theme-studio-preview'), [light, dark])
  const activeTokens = theme === 'dark' ? dark : light
  const activeText = theme === 'dark' ? darkText : lightText
  const setActiveText = theme === 'dark' ? setDarkText : setLightText
  const hasErrors = [...Object.values(lightText), ...Object.values(darkText)].some(
    (value) => !isHexColor(value),
  )
  const edit = (token: keyof ThemeTokens, value: string) => {
    setPreset('custom')
    setActiveText((tokens) => ({ ...tokens, [token]: value }))
    if (isHexColor(value)) setActiveTokens((tokens) => ({ ...tokens, [token]: value }))
  }
  const setActiveTokens = theme === 'dark' ? setDark : setLight

  const applyPreset = (candidate: Preset) => {
    setPreset(candidate.name)
    setLight({ ...DEFAULT_LIGHT, ...candidate.light })
    setDark({ ...DEFAULT_DARK, ...candidate.dark })
    setLightText({ ...DEFAULT_LIGHT, ...candidate.light })
    setDarkText({ ...DEFAULT_DARK, ...candidate.dark })
  }

  return (
    <div className="relative mt-6 overflow-hidden rounded-lg border border-border bg-background">
      <div className="relative flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-5 py-3.5">
        <span className="inline-flex items-center gap-3 font-sans text-xs tracking-normal text-foreground/75">
          {STRINGS.themeMode[locale]} /{' '}
          {locale === 'es' ? (theme === 'dark' ? 'oscuro' : 'claro') : theme}
        </span>
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-foreground/75">{STRINGS.presets[locale]}</span>
          {PRESETS.map((candidate) => (
            <ControlButton
              key={candidate.name}
              active={preset === candidate.name}
              onClick={() => applyPreset(candidate)}
            >
              {candidate.name}
            </ControlButton>
          ))}
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
          <CopyButton
            locale={locale}
            label={STRINGS.copyCss[locale]}
            copiedLabel={STRINGS.copied[locale]}
            getText={() => css}
          />
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--border)_10%,var(--border)_90%,transparent)] opacity-70"
        />
      </div>

      <style>{previewCss}</style>
      {hasErrors ? (
        <p role="status" className="px-5 text-xs">
          {MESSAGES.pendingColors[locale]}
        </p>
      ) : null}
      <div className="theme-studio-preview" style={{ background: 'var(--background)' }}>
        <svg
          role="img"
          aria-label={MESSAGES.preview[locale]}
          viewBox="0 0 640 140"
          className="mx-auto mt-6 w-full max-w-2xl px-5"
        >
          <rect
            x="10"
            y="20"
            width="220"
            height="100"
            rx="8"
            fill="var(--card)"
            stroke="var(--diagram-node-border)"
          />
          <rect
            x="410"
            y="20"
            width="220"
            height="100"
            rx="8"
            fill="var(--card)"
            stroke="var(--diagram-node-border)"
          />
          <path d="M230 70H410" stroke="var(--cobalt)" strokeWidth="2" />
          <text x="120" y="76" textAnchor="middle" fill="var(--foreground)">
            {MESSAGES.request[locale]}
          </text>
          <text x="520" y="76" textAnchor="middle" fill="var(--foreground)">
            {MESSAGES.response[locale]}
          </text>
        </svg>
      </div>
      <div className="grid gap-x-8 gap-y-5 px-5 py-8 sm:grid-cols-2 sm:px-7 lg:grid-cols-3">
        {FIELDS.map((field) => (
          <label key={field.token} className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-medium text-foreground/80">
              {locale === 'es'
                ? {
                    cobalt: 'cobalto · principal',
                    branch: 'rama · alternativa',
                    background: 'fondo',
                    card: 'superficie',
                    border: 'borde',
                    foreground: 'texto',
                    mutedForeground: 'texto secundario',
                  }[field.token]
                : field.label}
              <span className="mt-0.5 block font-sans text-xs font-normal text-foreground/75">
                {field.cssVar}
              </span>
            </span>
            <span className="inline-flex items-center gap-2.5">
              <input
                type="text"
                value={activeText[field.token]}
                onChange={(event) => {
                  edit(field.token, event.target.value)
                }}
                aria-invalid={!isHexColor(activeText[field.token])}
                aria-describedby={
                  !isHexColor(activeText[field.token])
                    ? `theme-${theme}-${field.token}-error`
                    : undefined
                }
                aria-label={`${field.cssVar} — ${STRINGS.hexAria[locale]}`}
                className="w-[86px] border border-border bg-transparent px-2 py-1 font-sans text-xs text-foreground/80 outline-none focus:border-foreground/35"
              />
              <input
                type="color"
                value={toHex(activeTokens[field.token])}
                onChange={(event) => {
                  edit(field.token, event.target.value)
                }}
                aria-label={`${field.cssVar} — ${STRINGS.pickerAria[locale]}`}
                className="h-7 w-9 cursor-pointer border border-border bg-transparent p-0.5"
              />
            </span>
            {!isHexColor(activeText[field.token]) ? (
              <span id={`theme-${theme}-${field.token}-error`} className="text-xs" role="alert">
                {MESSAGES.invalidColor[locale]}{' '}
                <button type="button" onClick={() => edit(field.token, activeTokens[field.token])}>
                  {MESSAGES.restore[locale]}
                </button>
              </span>
            ) : null}
          </label>
        ))}
      </div>
    </div>
  )
}

const toHex = (value: string): string =>
  value.length <= 5
    ? '#' +
      value
        .slice(1, 4)
        .split('')
        .map((part) => part + part)
        .join('')
    : value.slice(0, 7)
