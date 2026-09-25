import { i as Diagnostic, g as DiagramDocument, j as Result } from './layout-BhvxbOAw.js';

type DeploymentRule = 'profile.owner-missing' | 'profile.region-conflict' | 'profile.public-entity' | 'profile.crossing-missing';
interface DeploymentProfileReport {
    enabled: boolean;
    facts: {
        nodes: number;
        regions: number;
        crossRegionEdges: number;
    };
    diagnostics: Diagnostic[];
}
/** Opt-in, declarative deployment profile. When disabled (the default) no rule
 * is imposed and no infrastructure is inspected; when enabled, failures are
 * reported by exact fact, never discovered from the environment. */
declare function validateDeploymentProfile(input: DiagramDocument, options?: {
    enabled?: boolean;
}): Result<DeploymentProfileReport>;

export { type DeploymentProfileReport as D, type DeploymentRule as a, validateDeploymentProfile as v };
