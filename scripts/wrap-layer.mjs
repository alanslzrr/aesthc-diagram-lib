// Wrap the ENTIRE compiled CSS in a dedicated `diagram-lib` cascade layer.
//
// Tailwind v4 emits utilities as UNLAYERED CSS when compiled through
// `@import 'tailwindcss/utilities'` (only the --tw-* property defaults go
// into `@layer properties`). Unlayered CSS always beats layered CSS, so
// importing that stylesheet into a host app would let the package's utility
// names (e.g. `.hidden`) override the host's responsive variants
// (`.sm:flex`) regardless of import order.
//
// Wrapping everything in `@layer diagram-lib { … }` puts the package BELOW
// the host's `utilities` layer in the cascade (the host declares its layers
// after `diagram-lib`), so the host always wins on shared class names.
import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../dist/styles.css', import.meta.url)
const iconStylesFile = new URL('../src/icon-styles.css', import.meta.url)
let css = readFileSync(file, 'utf8')
const iconStyles = readFileSync(iconStylesFile, 'utf8').trim()

// Drop any leading `@layer diagram-lib;` statement (we re-add it as a block).
css = css.replace(/^@layer diagram-lib;\s*/, '')

// Normalize nested layers to sub-layers of diagram-lib for consistency.
css = css.replace(/@layer properties\{/g, '@layer diagram-lib.properties{')
css = css.replace(/@layer utilities\{/g, '@layer diagram-lib.utilities{')

// Wrap the utility output inside the diagram-lib layer. Icon visibility rules
// are appended outside the layer because they must beat a host `svg { display:
// block }` reset while remaining scoped to the library's own class names.
css = `@layer diagram-lib {\n${css}\n}\n${iconStyles}\n`

writeFileSync(file, css)
console.log('dist/styles.css fully wrapped in @layer diagram-lib')
