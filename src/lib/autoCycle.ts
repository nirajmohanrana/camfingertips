import { CYCLABLE_PRESETS, FILTER_PRESETS } from './filterPresets'
import type { AppSettings, FilterPresetId } from './types'

export function getPresetLabel(presetId: FilterPresetId) {
  return (
    FILTER_PRESETS.find((preset) => preset.id === presetId)?.label ?? presetId
  )
}

export function buildInitialCyclePresets(
  quads: AppSettings['quads'],
): Record<string, FilterPresetId> {
  const presets: Record<string, FilterPresetId> = {}

  quads.forEach((quad, index) => {
    presets[quad.id] = CYCLABLE_PRESETS[index % CYCLABLE_PRESETS.length]
  })

  return presets
}

export function advanceCyclePresets(
  current: Record<string, FilterPresetId>,
  quads: AppSettings['quads'],
  mode: AppSettings['autoCycle']['mode'],
): Record<string, FilterPresetId> {
  const next: Record<string, FilterPresetId> = { ...current }

  if (mode === 'sync') {
    const firstQuadId = quads[0]?.id
    const currentPreset = firstQuadId ? current[firstQuadId] : CYCLABLE_PRESETS[0]
    const currentIndex = CYCLABLE_PRESETS.indexOf(currentPreset)
    const nextPreset =
      CYCLABLE_PRESETS[(currentIndex + 1) % CYCLABLE_PRESETS.length]

    for (const quad of quads) {
      next[quad.id] = nextPreset
    }

    return next
  }

  for (const quad of quads) {
    const currentPreset = current[quad.id] ?? CYCLABLE_PRESETS[0]
    const currentIndex = Math.max(0, CYCLABLE_PRESETS.indexOf(currentPreset))
    next[quad.id] =
      CYCLABLE_PRESETS[(currentIndex + 1) % CYCLABLE_PRESETS.length]
  }

  return next
}

export function resolveActivePreset(
  quadId: string,
  manualPreset: FilterPresetId,
  autoCycle: AppSettings['autoCycle'],
  cyclePresets: Record<string, FilterPresetId>,
): FilterPresetId {
  if (autoCycle.enabled && cyclePresets[quadId]) {
    return cyclePresets[quadId]
  }

  return manualPreset
}
