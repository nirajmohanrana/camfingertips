export type FilterPresetId =
  | 'invert'
  | 'sepia'
  | 'noir'
  | 'prism'
  | 'dream'
  | 'neon'
  | 'matrix'
  | 'warm'
  | 'cool'
  | 'xray'
  | 'tvStatic'
  | 'glitch'
  | 'thermal'
  | 'scanline'
  | 'custom'
  | 'particleEngine'

export type CustomFilter = {
  blur: number
  brightness: number
  contrast: number
  grayscale: number
  hueRotate: number
  invert: number
  saturate: number
  sepia: number
}

export type MarkerSettings = {
  markerOpacity: number
  tipOpacity: number
  connectorWidth: number
  landmarkRadius: number
}

export type QuadTextSettings = {
  enabled: boolean
  content: string
  fontSize: number
  color: string
  opacity: number
}

export type QuadConfig = {
  id: string
  label: string
  landmarkA: number
  landmarkB: number
  enabled: boolean
  filterPreset: FilterPresetId
  filterStrength: number
  customFilter: CustomFilter
  borderColor: [number, number, number]
  borderOpacity: number
  borderWidth: number
  text: QuadTextSettings
}

export type AutoCycleSettings = {
  enabled: boolean
  intervalSeconds: number
  mode: 'sync' | 'staggered'
  wireframeEnabled: boolean
  wireframeOpacity: number
}

export type AppSettings = {
  markers: MarkerSettings
  quads: QuadConfig[]
  autoCycle: AutoCycleSettings
}

export type Point2D = { x: number; y: number }
