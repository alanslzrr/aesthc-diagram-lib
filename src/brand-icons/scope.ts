/** Scope only trusted, bundled SVG markup; never accepts imported SVG artwork. */
export function scopeIconMarkup(body: string, prefix: string): string {
  return body
    .replace(/id="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/((?:xlink:)?href=")#([^"]+)/g, `$1#${prefix}-$2`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
}
