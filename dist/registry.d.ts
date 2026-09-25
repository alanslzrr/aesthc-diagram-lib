import { k as DiagramSpec, ag as LocalizedDiagram, m as DiagramNodeVisual, n as DiagramRegistration } from './layout-C01UhqPQ.js';
import './theme.js';

interface RegistryEntry<T extends DiagramSpec = DiagramSpec> {
    diagram: LocalizedDiagram<T>;
    visuals: Record<string, DiagramNodeVisual>;
}
declare function registerDiagram<T extends DiagramSpec>(key: string, registration: DiagramRegistration<T>): void;
declare function getDiagramEntry(key: string): RegistryEntry | undefined;
declare function hasDiagram(key: string): boolean;
declare function getDiagram(key: string, locale: string): DiagramSpec;
declare function getDiagramVisuals(key: string): Record<string, DiagramNodeVisual>;
declare function getDiagramKeys(): string[];
declare function registerDiagrams(entries: Record<string, DiagramRegistration>): void;

export { type RegistryEntry, getDiagram, getDiagramEntry, getDiagramKeys, getDiagramVisuals, hasDiagram, registerDiagram, registerDiagrams };
