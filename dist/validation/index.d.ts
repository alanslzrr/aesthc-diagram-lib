import { k as DiagramSpec } from '../layout-DyDatn-R.js';
import '../theme.js';

interface ValidationIssue {
    path: string;
    code: string;
    message: string;
}
type ValidationResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    issues: ValidationIssue[];
};
declare function diagramNodeIds(spec: DiagramSpec): string[];
/** Validate the TypeScript-derived structure, then reference/identity invariants. */
declare function validateDiagramSpec(input: unknown): ValidationResult<DiagramSpec>;
declare function assertDiagramSpec(input: unknown): asserts input is DiagramSpec;
/** Locale validation does not mutate either input spec. */
declare function validateLocalizedDiagram(input: unknown): ValidationResult<{
    en: DiagramSpec;
    es: DiagramSpec;
}>;

export { type ValidationIssue, type ValidationResult, assertDiagramSpec, diagramNodeIds, validateDiagramSpec, validateLocalizedDiagram };
