// @aesthc/diagram-lib — public API.
//
// Core barrel (types, theme, common layout, registry). This module is
// deliberately free of the per-type layouts so consumers that only render one
// type (e.g. `band`) do not pull the other layout engines into their bundle.
//
//   Core / registry ......... from '@aesthc/diagram-lib'
//   Layout dispatcher ......... from '@aesthc/diagram-lib/layouts'
//   Single layout (band) ...... from '@aesthc/diagram-lib/layouts/band'
//   SVG canvas ................ from '@aesthc/diagram-lib/canvas'
//   Example diagrams .......... from '@aesthc/diagram-lib/examples'

export * from './types'
export * from './theme'
export * from './layout'
export * from './registry'
