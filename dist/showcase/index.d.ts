import * as react from 'react';

/** A single showcase entry: which diagram key + its localized title/description. */
interface ShowcaseEntry {
    key: string;
    title: string;
    description: string;
}
interface DiagramShowcaseProps {
    /** 'en' or 'es' — selects the localized spec from the registry. */
    locale?: 'en' | 'es';
    /** Optional localized strings; defaults to English. */
    label?: string;
    hoverHint?: string;
    heading?: string;
    headingAccent?: string;
    intro?: string;
    /** Ordered list of diagram keys + copy to showcase. */
    entries: ShowcaseEntry[];
}
/**
 * Full showcase page/component: hero + one interactive panel per entry.
 * Render it inside any React app that provides the host theme variables
 * (see README → Theming). No i18n framework required — pass localized
 * strings via props (defaults are English).
 */
declare function DiagramShowcase({ locale, label, hoverHint, heading, headingAccent, intro, entries, }: DiagramShowcaseProps): react.JSX.Element;

/**
 * Default showcase lineup — one entry per supported diagram type.
 * Localized copy is provided by the host (see DiagramShowcase props);
 * the English defaults below match the library's example diagrams.
 */
declare const DEFAULT_SHOWCASE_ENTRIES: ShowcaseEntry[];

export { DEFAULT_SHOWCASE_ENTRIES, DiagramShowcase, DiagramShowcase as DiagramShowcaseDefault, type DiagramShowcaseProps, type ShowcaseEntry };
