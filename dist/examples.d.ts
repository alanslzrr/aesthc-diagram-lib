import { B as BandDiagramSpec, k as DiagramNodeVisual, l as DiagramRegistration } from './layout-dln3eGv4.js';
import './theme.js';

type Locale = 'en' | 'es';
type Text = Record<Locale, string>;
type ArchitectureExample = {
    title: Text;
    summary: Text;
    notes: Record<Locale, string[]>;
    diagram: Record<Locale, BandDiagramSpec>;
    visuals: Record<string, DiagramNodeVisual>;
    sources: {
        label: string;
        url: string;
    }[];
};
/** Authored reference designs, not claims about a deployed production environment. */
declare const ARCHITECTURE_EXAMPLES: {
    documents: {
        title: {
            en: string;
            es: string;
        };
        summary: {
            en: string;
            es: string;
        };
        notes: {
            en: string[];
            es: string[];
        };
        diagram: {
            en: BandDiagramSpec;
            es: BandDiagramSpec;
        };
        visuals: {
            upload: {
                readonly source: "thesvg";
                readonly key: "google-cloud";
            };
            topic: {
                readonly source: "thesvg";
                readonly key: "google-cloud";
            };
            worker: {
                readonly source: "thesvg";
                readonly key: "google-cloud";
            };
            warehouse: {
                readonly source: "thesvg";
                readonly key: "google-cloud";
            };
            quarantine: {
                readonly source: "phosphor";
                readonly key: "warning";
            };
        };
        sources: {
            label: string;
            url: string;
        }[];
    };
    orders: {
        title: {
            en: string;
            es: string;
        };
        summary: {
            en: string;
            es: string;
        };
        notes: {
            en: string[];
            es: string[];
        };
        diagram: {
            en: BandDiagramSpec;
            es: BandDiagramSpec;
        };
        visuals: {
            api: {
                readonly source: "thesvg";
                readonly key: "azure";
            };
            queue: {
                readonly source: "thesvg";
                readonly key: "azure";
            };
            worker: {
                readonly source: "thesvg";
                readonly key: "azure";
            };
            ledger: {
                readonly source: "thesvg";
                readonly key: "azure";
            };
            deadletter: {
                readonly source: "phosphor";
                readonly key: "warning";
            };
        };
        sources: {
            label: string;
            url: string;
        }[];
    };
    delivery: {
        title: {
            en: string;
            es: string;
        };
        summary: {
            en: string;
            es: string;
        };
        notes: {
            en: string[];
            es: string[];
        };
        diagram: {
            en: BandDiagramSpec;
            es: BandDiagramSpec;
        };
        visuals: {
            commit: {
                source: "phosphor";
                key: "graph";
            };
            checks: {
                source: "phosphor";
                key: "list-checks";
            };
            image: {
                readonly source: "thesvg";
                readonly key: "google-cloud";
            };
            revision: {
                readonly source: "thesvg";
                readonly key: "google-cloud";
            };
            blocked: {
                readonly source: "phosphor";
                readonly key: "warning";
            };
        };
        sources: {
            label: string;
            url: string;
        }[];
    };
};

declare const EXAMPLE_DIAGRAMS: Record<string, DiagramRegistration>;
/** Registers every example diagram under its `example-*` key. */
declare function registerExampleDiagrams(): void;
/** Explicit brand visuals: provider labels alone never select or load an icon. */
declare const CLOUD_ARCHITECTURE_VISUALS: {
    ingress: {
        source: "phosphor";
        key: "brackets-curly";
    };
    gcp: {
        source: "thesvg";
        key: "google-cloud";
    };
    azure: {
        source: "thesvg";
        key: "azure";
    };
};
/** A small illustrative multi-cloud pipeline, not a production deployment recommendation. */
declare const CLOUD_ARCHITECTURE_SPEC: {
    type: "band";
    caption: string;
    legend: {
        main: string;
        branch: string;
    };
    bands: {
        title: string;
    }[];
    nodes: ({
        id: string;
        band: number;
        label: string;
        description: string;
        kind: string;
        sublabel: string;
        weight: "primary";
    } | {
        id: string;
        band: number;
        label: string;
        description: string;
        kind: string;
        sublabel: string;
        weight?: undefined;
    })[];
    edges: ({
        id: string;
        from: string;
        to: string;
        variant?: undefined;
        dashed?: undefined;
    } | {
        id: string;
        from: string;
        to: string;
        variant: "branch";
        dashed: true;
    })[];
};

export { ARCHITECTURE_EXAMPLES, type ArchitectureExample, CLOUD_ARCHITECTURE_SPEC, CLOUD_ARCHITECTURE_VISUALS, EXAMPLE_DIAGRAMS, registerExampleDiagrams };
