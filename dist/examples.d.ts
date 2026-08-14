import { DiagramRegistration } from './types.js';

declare const EXAMPLE_DIAGRAMS: Record<string, DiagramRegistration>;
/** Registers every example diagram under its `example-*` key. */
declare function registerExampleDiagrams(): void;

export { EXAMPLE_DIAGRAMS, registerExampleDiagrams };
