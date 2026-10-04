import type { Locale } from '../content'

export function savedLocale(): Locale {
  try {
    return localStorage.getItem('adl-locale') === 'es' ? 'es' : 'en'
  } catch {
    return 'en'
  }
}

export function saveLocale(locale: Locale) {
  try {
    localStorage.setItem('adl-locale', locale)
  } catch {
    /* Preference is optional. */
  }
}
