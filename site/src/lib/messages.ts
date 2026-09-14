import type { Locale } from '../content'
export const MESSAGES = {
  copied: { en: 'Copied', es: 'Copiado' },
  copyFailed: {
    en: 'Copy failed. Select the text and copy it manually.',
    es: 'No se pudo copiar. Selecciona el texto y cópialo manualmente.',
  },
  actionDone: { en: 'Completed', es: 'Completado' },
  actionFailed: {
    en: 'Action failed. Try again or copy the code manually.',
    es: 'La acción falló. Inténtalo de nuevo o copia el código manualmente.',
  },
  panelFailed: {
    en: 'This diagram could not be displayed.',
    es: 'No se pudo mostrar este diagrama.',
  },
  retry: { en: 'Retry', es: 'Reintentar' },
  skip: { en: 'Skip to diagrams', es: 'Ir a los diagramas' },
  invalidShare: {
    en: 'Invalid or oversized share link. Default examples are shown; your link was not evaluated.',
    es: 'El enlace compartido no es válido o es demasiado grande. Se muestran los ejemplos originales; el enlace no se ha ejecutado.',
  },
  discardInvalid: {
    en: 'Discard invalid JSON before changing language?',
    es: '¿Descartar el JSON no válido antes de cambiar de idioma?',
  },
  invalidColor: {
    en: 'Enter a complete hexadecimal color. The last valid color remains applied.',
    es: 'Introduce un color hexadecimal completo. Se conserva el último color válido.',
  },
  restore: { en: 'Restore valid color', es: 'Restaurar color válido' },
  pendingColors: {
    en: 'Some edits are invalid. Copied CSS contains only the last valid colors.',
    es: 'Hay cambios no válidos. El CSS copiado contiene solo los últimos colores válidos.',
  },
  preview: { en: 'Local theme preview', es: 'Vista previa local del tema' },
  request: { en: 'Request', es: 'Petición' },
  response: { en: 'Response', es: 'Respuesta' },
  manager: { en: 'Package manager', es: 'Gestor de paquetes' },
  installation: { en: 'Installation command', es: 'Comando de instalación' },
  integration: { en: 'Integration code', es: 'Código de integración' },
} satisfies Record<string, Record<Locale, string>>

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
