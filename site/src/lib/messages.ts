import type { Locale } from '../content'
export { savedLocale, saveLocale } from './locale'
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
  zoom: { en: 'Canvas zoom', es: 'Zoom del canvas' },
  zoomIn: { en: 'Zoom in', es: 'Acercar' },
  zoomOut: { en: 'Zoom out', es: 'Alejar' },
  fit: { en: 'Fit diagram to the panel', es: 'Ajustar el diagrama al panel' },
  fitShort: { en: 'Fit', es: 'Ajustar' },
  actualSize: { en: 'Actual size', es: 'Tamaño real' },
  importTooLarge: {
    en: 'The JSON file exceeds 1 MiB. Nothing was imported.',
    es: 'El archivo JSON supera 1 MiB. No se importó nada.',
  },
  importInvalid: {
    en: 'The JSON is invalid or exceeds the document limits.',
    es: 'El JSON no es válido o supera los límites del documento.',
  },
  importDone: {
    en: 'Document imported. Undo is available.',
    es: 'Documento importado. Podés deshacer.',
  },
  readFailed: {
    en: 'The file could not be read. The current document is unchanged.',
    es: 'No se pudo leer el archivo. El documento actual no cambió.',
  },
  importStale: {
    en: 'Canceled: the document changed before the import finished.',
    es: 'Cancelado: el documento cambió antes de que terminara la importación.',
  },
  language: { en: 'Language', es: 'Idioma' },
  theme: { en: 'Theme', es: 'Tema' },
  light: { en: 'Light', es: 'Claro' },
  dark: { en: 'Dark', es: 'Oscuro' },
  diagramStudio: { en: 'Diagram Studio', es: 'Estudio de diagramas' },
  semanticViewer: { en: 'Semantic viewer', es: 'Visor semántico' },
  importJson: { en: 'Import JSON', es: 'Importar JSON' },
  compareWith: { en: 'Compare with…', es: 'Comparar con…' },
  reset: { en: 'Reset', es: 'Restaurar' },
  backToGallery: { en: 'Back to all diagrams', es: 'Volver a todos los diagramas' },
  hostAppearanceNote: {
    en: 'Host theme is separate from the document appearance used in exports.',
    es: 'El tema del host es independiente de la apariencia del documento usada al exportar.',
  },
} satisfies Record<string, Record<Locale, string>>
