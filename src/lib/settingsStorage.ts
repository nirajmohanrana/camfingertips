import { DEFAULT_CUSTOM_FILTER } from './filterPresets'
import {
  INDEX_TIP,
  MIDDLE_TIP,
  RING_TIP,
  THUMB_TIP,
} from './handLandmarks'
import type {
  AppSettings,
  AutoCycleSettings,
  CustomFilter,
  FilterPresetId,
  QuadConfig,
  QuadTextSettings,
} from './types'

export const DEFAULT_QUAD_TEXT: QuadTextSettings = {
  enabled: true,
  content: '',
  fontSize: 42,
  color: '#ffffff',
  opacity: 0.95,
}

export const SETTINGS_STORAGE_KEY = 'camfingertips-settings-v2'
const LEGACY_STORAGE_KEY = 'camfingertips-marker-settings'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export const DEFAULT_QUADS: QuadConfig[] = [
  {
    id: 'quad1',
    label: 'Thumb + Index',
    landmarkA: THUMB_TIP,
    landmarkB: INDEX_TIP,
    enabled: true,
    filterPreset: 'thermal',
    filterStrength: 1,
    customFilter: { ...DEFAULT_CUSTOM_FILTER },
    borderColor: [59, 130, 246],
    borderOpacity: 0.9,
    borderWidth: 3,
    text: { ...DEFAULT_QUAD_TEXT, content: 'LAYER 1' },
  },
  {
    id: 'quad2',
    label: 'Index + Middle',
    landmarkA: INDEX_TIP,
    landmarkB: MIDDLE_TIP,
    enabled: true,
    filterPreset: 'glitch',
    filterStrength: 1,
    customFilter: { ...DEFAULT_CUSTOM_FILTER },
    borderColor: [217, 119, 6],
    borderOpacity: 0.9,
    borderWidth: 3,
    text: { ...DEFAULT_QUAD_TEXT, content: 'LAYER 2' },
  },
  {
    id: 'quad3',
    label: 'Middle + Ring',
    landmarkA: MIDDLE_TIP,
    landmarkB: RING_TIP,
    enabled: true,
    filterPreset: 'tvStatic',
    filterStrength: 1,
    customFilter: { ...DEFAULT_CUSTOM_FILTER },
    borderColor: [168, 85, 247],
    borderOpacity: 0.9,
    borderWidth: 3,
    text: { ...DEFAULT_QUAD_TEXT, content: 'LAYER 3' },
  },
]

export const DEFAULT_AUTO_CYCLE: AutoCycleSettings = {
  enabled: true,
  intervalSeconds: 4,
  mode: 'staggered',
  wireframeEnabled: true,
  wireframeOpacity: 0.55,
}

export const DEFAULT_SETTINGS: AppSettings = {
  markers: {
    markerOpacity: 0.25,
    tipOpacity: 1,
    connectorWidth: 5,
    landmarkRadius: 6,
  },
  quads: DEFAULT_QUADS.map((quad) => ({
    ...quad,
    customFilter: { ...quad.customFilter },
    text: { ...quad.text },
  })),
  autoCycle: { ...DEFAULT_AUTO_CYCLE },
}

function sanitizeAutoCycle(
  value: Partial<AutoCycleSettings> | undefined,
): AutoCycleSettings {
  return {
    enabled: value?.enabled ?? DEFAULT_AUTO_CYCLE.enabled,
    intervalSeconds: clamp(
      Number(value?.intervalSeconds ?? DEFAULT_AUTO_CYCLE.intervalSeconds),
      2,
      15,
    ),
    mode: value?.mode === 'sync' ? 'sync' : 'staggered',
    wireframeEnabled:
      value?.wireframeEnabled ?? DEFAULT_AUTO_CYCLE.wireframeEnabled,
    wireframeOpacity: clamp(
      Number(value?.wireframeOpacity ?? DEFAULT_AUTO_CYCLE.wireframeOpacity),
      0,
      1,
    ),
  }
}

type LegacySettings = {
  markerOpacity?: number
  tipOpacity?: number
  connectorWidth?: number
  landmarkRadius?: number
  quadFillOpacity?: number
  quadStrokeOpacity?: number
  sepiaQuadStrength?: number
  sepiaQuadStrokeOpacity?: number
}

function sanitizeCustomFilter(value: Partial<CustomFilter> | undefined): CustomFilter {
  return {
    blur: clamp(Number(value?.blur ?? DEFAULT_CUSTOM_FILTER.blur), 0, 12),
    brightness: clamp(
      Number(value?.brightness ?? DEFAULT_CUSTOM_FILTER.brightness),
      0.5,
      2,
    ),
    contrast: clamp(
      Number(value?.contrast ?? DEFAULT_CUSTOM_FILTER.contrast),
      0.5,
      2,
    ),
    grayscale: clamp(
      Number(value?.grayscale ?? DEFAULT_CUSTOM_FILTER.grayscale),
      0,
      1,
    ),
    hueRotate: clamp(
      Number(value?.hueRotate ?? DEFAULT_CUSTOM_FILTER.hueRotate),
      0,
      360,
    ),
    invert: clamp(Number(value?.invert ?? DEFAULT_CUSTOM_FILTER.invert), 0, 1),
    saturate: clamp(
      Number(value?.saturate ?? DEFAULT_CUSTOM_FILTER.saturate),
      0,
      3,
    ),
    sepia: clamp(Number(value?.sepia ?? DEFAULT_CUSTOM_FILTER.sepia), 0, 1),
  }
}

function sanitizeQuadText(
  value: Partial<QuadTextSettings> | undefined,
  fallback: QuadTextSettings,
): QuadTextSettings {
  const color = typeof value?.color === 'string' ? value.color : fallback.color

  return {
    enabled: value?.enabled ?? fallback.enabled,
    content: typeof value?.content === 'string' ? value.content : fallback.content,
    fontSize: clamp(Number(value?.fontSize ?? fallback.fontSize), 12, 120),
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback.color,
    opacity: clamp(Number(value?.opacity ?? fallback.opacity), 0, 1),
  }
}

function sanitizeQuad(
  value: Partial<QuadConfig> | undefined,
  fallback: QuadConfig,
): QuadConfig {
  const preset = (value?.filterPreset ?? fallback.filterPreset) as FilterPresetId

  return {
    id: fallback.id,
    label: fallback.label,
    landmarkA: fallback.landmarkA,
    landmarkB: fallback.landmarkB,
    enabled: value?.enabled ?? fallback.enabled,
    filterPreset: preset,
    filterStrength: clamp(
      Number(value?.filterStrength ?? fallback.filterStrength),
      0,
      1,
    ),
    customFilter: sanitizeCustomFilter(value?.customFilter),
    borderColor: [
      clamp(Number(value?.borderColor?.[0] ?? fallback.borderColor[0]), 0, 255),
      clamp(Number(value?.borderColor?.[1] ?? fallback.borderColor[1]), 0, 255),
      clamp(Number(value?.borderColor?.[2] ?? fallback.borderColor[2]), 0, 255),
    ],
    borderOpacity: clamp(
      Number(value?.borderOpacity ?? fallback.borderOpacity),
      0,
      1,
    ),
    borderWidth: clamp(Number(value?.borderWidth ?? fallback.borderWidth), 1, 12),
    text: sanitizeQuadText(value?.text, fallback.text),
  }
}

function migrateLegacySettings(legacy: LegacySettings): AppSettings {
  const quads = DEFAULT_QUADS.map((quad) => ({
    ...quad,
    customFilter: { ...quad.customFilter },
  }))

  quads[0] = {
    ...quads[0],
    filterStrength: clamp(Number(legacy.quadFillOpacity ?? 1), 0, 1),
    borderOpacity: clamp(Number(legacy.quadStrokeOpacity ?? 0.9), 0, 1),
  }

  quads[1] = {
    ...quads[1],
    filterStrength: clamp(Number(legacy.sepiaQuadStrength ?? 1), 0, 1),
    borderOpacity: clamp(Number(legacy.sepiaQuadStrokeOpacity ?? 0.9), 0, 1),
  }

  return {
    markers: {
      markerOpacity: clamp(Number(legacy.markerOpacity ?? 0.25), 0, 1),
      tipOpacity: clamp(Number(legacy.tipOpacity ?? 1), 0, 1),
      connectorWidth: clamp(Number(legacy.connectorWidth ?? 5), 1, 12),
      landmarkRadius: clamp(Number(legacy.landmarkRadius ?? 6), 2, 16),
    },
    quads,
    autoCycle: { ...DEFAULT_AUTO_CYCLE },
  }
}

function sanitizeSettings(value: Partial<AppSettings> | LegacySettings): AppSettings {
  if (!('quads' in value) || !Array.isArray(value.quads)) {
    return migrateLegacySettings(value as LegacySettings)
  }

  const markers = value.markers ?? DEFAULT_SETTINGS.markers
  const quads = DEFAULT_QUADS.map((fallback, index) =>
    sanitizeQuad(value.quads?.[index], fallback),
  )

  return {
    markers: {
      markerOpacity: clamp(
        Number(markers.markerOpacity ?? DEFAULT_SETTINGS.markers.markerOpacity),
        0,
        1,
      ),
      tipOpacity: clamp(
        Number(markers.tipOpacity ?? DEFAULT_SETTINGS.markers.tipOpacity),
        0,
        1,
      ),
      connectorWidth: clamp(
        Number(markers.connectorWidth ?? DEFAULT_SETTINGS.markers.connectorWidth),
        1,
        12,
      ),
      landmarkRadius: clamp(
        Number(markers.landmarkRadius ?? DEFAULT_SETTINGS.markers.landmarkRadius),
        2,
        16,
      ),
    },
    quads,
    autoCycle: sanitizeAutoCycle(value.autoCycle),
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw =
      localStorage.getItem(SETTINGS_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY)

    if (!raw) return DEFAULT_SETTINGS

    return sanitizeSettings(JSON.parse(raw) as Partial<AppSettings> | LegacySettings)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}
