import { shallowEqual, useEditor, useEditorSelector } from '@aesthc/diagram-lib/editor'
import { ExportDialog as ReadOnlyExportDialog, type ExportDialogProps } from './ExportDialog'

/** Only this adapter depends on the mutable editor; the shared dialog does not. */
export function ExportDialog(props: Omit<ExportDialogProps, 'source'>) {
  const snapshot = useEditorSelector(
    (state) => ({ document: state.document, selection: state.selection }),
    shallowEqual,
  )
  const { theme, registry } = useEditor()
  return (
    <ReadOnlyExportDialog
      {...props}
      source={{ ...snapshot, theme: theme ?? snapshot.document.presentation.theme.mode, registry }}
    />
  )
}
