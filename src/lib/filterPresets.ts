import type { CustomFilter, FilterPresetId } from './types'

export type FilterPresetOption = {
  id: FilterPresetId
  label: string
  description: string
}

export const FILTER_PRESETS: FilterPresetOption[] = [
  { id: 'invert', label: 'Invert', description: 'Cyber / x-ray' },
  { id: 'sepia', label: 'Sepia', description: 'Vintage film' },
  { id: 'noir', label: 'Noir', description: 'Black & white' },
  { id: 'prism', label: 'Prism', description: 'Rainbow holographic' },
  { id: 'dream', label: 'Dream', description: 'Frosted glass glow' },
  { id: 'neon', label: 'Neon', description: 'Pop / arcade' },
  { id: 'matrix', label: 'Matrix', description: 'Green terminal' },
  { id: 'warm', label: 'Warm', description: 'Golden hour' },
  { id: 'cool', label: 'Cool', description: 'Cold cyber blue' },
  { id: 'xray', label: 'X-Ray', description: 'High-contrast negative' },
  { id: 'tvStatic', label: 'TV Static', description: 'Old TV snow & flicker' },
  { id: 'glitch', label: 'Glitch', description: 'Tearing & RGB split' },
  { id: 'thermal', label: 'Thermal', description: 'Heatmap spectrogram' },
  { id: 'scanline', label: 'Scanlines', description: 'CRT rolling bar' },
  { id: 'custom', label: 'Custom', description: 'Build your own' },
]

export const CYCLABLE_PRESETS: FilterPresetId[] = [
  'invert',
  'sepia',
  'noir',
  'prism',
  'neon',
  'matrix',
  'warm',
  'cool',
  'xray',
  'tvStatic',
  'glitch',
  'thermal',
  'scanline',
]

export const DEFAULT_CUSTOM_FILTER: CustomFilter = {
  blur: 0,
  brightness: 1,
  contrast: 1,
  grayscale: 0,
  hueRotate: 0,
  invert: 0,
  saturate: 1,
  sepia: 0,
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function buildCustomFilterString(custom: CustomFilter, strength: number): string {
  const blur = lerp(0, custom.blur, strength)
  const brightness = lerp(1, custom.brightness, strength)
  const contrast = lerp(1, custom.contrast, strength)
  const grayscale = lerp(0, custom.grayscale, strength)
  const hueRotate = lerp(0, custom.hueRotate, strength)
  const invert = lerp(0, custom.invert, strength)
  const saturate = lerp(1, custom.saturate, strength)
  const sepia = lerp(0, custom.sepia, strength)

  const parts: string[] = []

  if (blur > 0.01) parts.push(`blur(${blur.toFixed(2)}px)`)
  if (Math.abs(brightness - 1) > 0.01) {
    parts.push(`brightness(${brightness.toFixed(2)})`)
  }
  if (Math.abs(contrast - 1) > 0.01) {
    parts.push(`contrast(${contrast.toFixed(2)})`)
  }
  if (grayscale > 0.01) parts.push(`grayscale(${grayscale.toFixed(2)})`)
  if (hueRotate > 0.5) parts.push(`hue-rotate(${hueRotate.toFixed(0)}deg)`)
  if (invert > 0.01) parts.push(`invert(${invert.toFixed(2)})`)
  if (Math.abs(saturate - 1) > 0.01) {
    parts.push(`saturate(${saturate.toFixed(2)})`)
  }
  if (sepia > 0.01) parts.push(`sepia(${sepia.toFixed(2)})`)

  return parts.length > 0 ? parts.join(' ') : 'none'
}

function buildPresetFilterString(
  preset: Exclude<FilterPresetId, 'custom' | 'tvStatic' | 'glitch' | 'thermal' | 'scanline'>,
  strength: number,
): string {
  if (strength <= 0) return 'none'

  switch (preset) {
    case 'invert':
      return `invert(${strength})`
    case 'sepia':
      return `sepia(${strength})`
    case 'noir':
      return `grayscale(${strength}) contrast(${lerp(1, 1.3, strength).toFixed(2)})`
    case 'prism':
      return `hue-rotate(${lerp(0, 120, strength).toFixed(0)}deg) saturate(${lerp(1, 2, strength).toFixed(2)})`
    case 'dream':
      return `blur(${lerp(0, 6, strength).toFixed(1)}px) brightness(${lerp(1, 1.1, strength).toFixed(2)}) saturate(${lerp(1, 1.3, strength).toFixed(2)})`
    case 'neon':
      return `contrast(${lerp(1, 1.5, strength).toFixed(2)}) saturate(${lerp(1, 2.5, strength).toFixed(2)}) hue-rotate(${lerp(0, 90, strength).toFixed(0)}deg)`
    case 'matrix':
      return `grayscale(${strength}) hue-rotate(${lerp(0, 90, strength).toFixed(0)}deg) contrast(${lerp(1, 1.4, strength).toFixed(2)})`
    case 'warm':
      return `sepia(${lerp(0, 0.6, strength).toFixed(2)}) brightness(${lerp(1, 1.1, strength).toFixed(2)}) saturate(${lerp(1, 1.4, strength).toFixed(2)})`
    case 'cool':
      return `hue-rotate(${lerp(0, 200, strength).toFixed(0)}deg) saturate(${lerp(1, 1.5, strength).toFixed(2)}) contrast(${lerp(1, 1.2, strength).toFixed(2)})`
    case 'xray':
      return `invert(${strength}) contrast(${lerp(1, 1.5, strength).toFixed(2)}) brightness(${lerp(1, 0.9, strength).toFixed(2)})`
    default:
      return 'none'
  }
}

export function buildFilter(
  preset: FilterPresetId,
  strength: number,
  custom: CustomFilter = DEFAULT_CUSTOM_FILTER,
): string {
  if (strength <= 0) return 'none'

  if (
    preset === 'custom' ||
    preset === 'tvStatic' ||
    preset === 'glitch' ||
    preset === 'thermal' ||
    preset === 'scanline'
  ) {
    if (preset === 'custom') {
      return buildCustomFilterString(custom, strength)
    }
    return 'none'
  }

  return buildPresetFilterString(preset, strength)
}
