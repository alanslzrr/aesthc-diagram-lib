// Live token editor: edits feed a <style> tag that overrides the host theme
// contract, so every diagram on the page restyles in real time. "Copy CSS"
// exports the exact block the README documents.

import { useEffect, useMemo, useState } from 'react'

import type { Locale } from '../content'
import { STRINGS } from '../content'
import { themeCss, type ThemeTokens } from '../lib/code'
import { CopyButton, MonoButton } from './ui'

const DEFAULT_LIGHT: ThemeTokens = {
  background: '#e9eef4',
  foreground: '#202b38',
  card: '#f9fbfd',
  border: '#aebdcd',
  mutedForeground: '#536273',
  cobalt: '#087cbd',
  branch: '#a66b21',
}

const DEFAULT_DARK: ThemeTokens = {
  background: '#070707',
  foreground: '#f2f2ee',
  card: '#101010',
  border: '#242424',
  mutedForeground: '#a8a8a1',
  cobalt: '#14a8ff',
  branch: '#d6a55e',
}

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

  useEffect(() => {
    let styleTag = document.getElementById('theme-studio-overrides')
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = 'theme-studio-overrides'
      document.head.appendChild(styleTag)
    }
    styleTag.textContent = css
  }, [css])

  const activeTokens = theme === 'dark' ? dark : light
  const setActiveTokens = theme === 'dark' ? setDark : setLight

  const applyPreset = (candidate: Preset) => {
    setPreset(candidate.name)
    setLight({ ...DEFAULT_LIGHT, ...candidate.light })
    setDark({ ...DEFAULT_DARK, ...candidate.dark })
  }

  return (
    <div className="relative mt-6 bg-background [--diagram-frame-opacity:0.2]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground opacity-[var(--diagram-frame-opacity)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-5 py-3.5">
        <span className="inline-flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground/75">
          <i className="inline-block h-[7px] w-[7px] rounded-full bg-branch shadow-[0_0_8px_color-mix(in_srgb,var(--color-branch)_55%,transparent)]" />
          {STRINGS.themeMode[locale]} / {theme}
        </span>
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-foreground/75">{STRINGS.presets[locale]}</span>
          {PRESETS.map((candidate) => (
            <MonoButton
              key={candidate.name}
              active={preset === candidate.name}
              onClick={() => applyPreset(candidate)}
            >
              {candidate.name}
            </MonoButton>
          ))}
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
          <CopyButton
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

      <svg
        role="img"
        aria-label="Local theme preview"
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
          Request
        </text>
        <text x="520" y="76" textAnchor="middle" fill="var(--foreground)">
          Response
        </text>
      </svg>
      <div className="grid gap-x-8 gap-y-5 px-5 py-8 sm:grid-cols-2 sm:px-7 lg:grid-cols-3">
        {FIELDS.map((field) => (
          <label key={field.token} className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-foreground/80">
              {field.label}
              <span className="mt-0.5 block font-mono text-[10px] font-normal text-foreground/75">
                {field.cssVar}
              </span>
            </span>
            <span className="inline-flex items-center gap-2.5">
              <input
                type="text"
                value={activeTokens[field.token]}
                onChange={(event) => {
                  setPreset('custom')
                  setActiveTokens((tokens) => ({ ...tokens, [field.token]: event.target.value }))
                }}
                aria-label={`${field.cssVar} — ${STRINGS.hexAria[locale]}`}
                className="w-[86px] border border-border bg-transparent px-2 py-1 font-mono text-[10.5px] text-foreground/80 outline-none focus:border-foreground/35"
              />
              <input
                type="color"
                value={toHex(activeTokens[field.token])}
                onChange={(event) => {
                  setPreset('custom')
                  setActiveTokens((tokens) => ({ ...tokens, [field.token]: event.target.value }))
                }}
                aria-label={`${field.cssVar} — ${STRINGS.pickerAria[locale]}`}
                className="h-7 w-9 cursor-pointer border border-border bg-transparent p-0.5"
              />
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

const toHex = (value: string): string => (/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#888888')
