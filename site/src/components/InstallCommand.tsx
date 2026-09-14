import { PACKAGE_VERSION, RELEASE } from '../generated/quick-start'
import type { Locale } from '../content'
import { InstallSnippet } from './InstallSnippet'

export function InstallCommand({ locale }: { locale: Locale }) {
  return (
    <>
      <p className="mt-6 text-xs text-muted-foreground" data-release-availability="">
        {RELEASE.npmAvailable
          ? locale === 'es'
            ? 'Disponible en npm.'
            : 'Available on npm.'
          : locale === 'es'
            ? 'Versión candidata: todavía no disponible en npm. El comando es para la futura publicación.'
            : 'Release candidate—not yet available on npm. The command is for the future release.'}
      </p>
      <InstallSnippet
        locale={locale}
        packages={`@aesthc/diagram-lib@${PACKAGE_VERSION}`}
        className="mt-3"
        label={locale === 'es' ? 'Instalar paquete' : 'Install package'}
        copyLabel={locale === 'es' ? 'Copiar comando de instalación' : 'Copy installation command'}
      />
    </>
  )
}
