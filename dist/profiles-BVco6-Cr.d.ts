import { j as Diagnostic, g as DiagramDocument, k as Result } from './layout-D_aGN70Q.js';

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
/**
 * Opt-in, declarative deployment profile. Activation is authored
 * (`metadata.engineeringProfile === 'deployment-ownership'`); an explicit
 * `enabled:true` only opts in for pre-field hosts and can never disable an
 * authored policy. Rules read declared metadata only and never discover
 * infrastructure.
 */
declare function validateDeploymentProfile(input: DiagramDocument, options?: {
    enabled?: boolean;
}): Result<DeploymentProfileReport>;

export { type DeploymentProfileReport as D, type DeploymentRule as a, validateDeploymentProfile as v };
