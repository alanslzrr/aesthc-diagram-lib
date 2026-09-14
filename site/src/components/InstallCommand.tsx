import { PACKAGE_VERSION } from '../generated/quick-start'
import type { Locale } from '../content'
import { InstallSnippet } from './InstallSnippet'

export function InstallCommand({ locale }: { locale: Locale }) {
  return (
    <InstallSnippet
      packages={`@aesthc/diagram-lib@${PACKAGE_VERSION}`}
      className="mt-6"
      label={locale === 'es' ? 'Instalar paquete' : 'Install package'}
      copyLabel={locale === 'es' ? 'Copiar comando de instalación' : 'Copy installation command'}
    />
  )
}
