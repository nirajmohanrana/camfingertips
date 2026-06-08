import { useState } from 'react'
import { getPresetLabel } from '../lib/autoCycle'
import { FILTER_PRESETS } from '../lib/filterPresets'
import { DEFAULT_SETTINGS } from '../lib/settingsStorage'
import type {
  AppSettings,
  CustomFilter,
  FilterPresetId,
  QuadConfig,
  QuadTextSettings,
} from '../lib/types'

const BORDER_SWATCHES: [number, number, number][] = [
  [59, 130, 246],
  [217, 119, 6],
  [168, 85, 247],
  [34, 197, 94],
  [239, 68, 68],
  [244, 244, 245],
]

type ControlsPanelProps = {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
  activeCyclePresets: Record<string, FilterPresetId>
}

function rgbToHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}

export default function ControlsPanel({
  settings,
  onChange,
  activeCyclePresets,
}: ControlsPanelProps) {
  const [openQuadId, setOpenQuadId] = useState<string | null>(
    settings.quads[0]?.id ?? null,
  )

  const updateMarkers = <K extends keyof AppSettings['markers']>(
    key: K,
    value: AppSettings['markers'][K],
  ) => {
    onChange({
      ...settings,
      markers: { ...settings.markers, [key]: value },
    })
  }

  const updateQuad = (quadId: string, patch: Partial<QuadConfig>) => {
    onChange({
      ...settings,
      quads: settings.quads.map((quad) =>
        quad.id === quadId ? { ...quad, ...patch } : quad,
      ),
    })
  }

  const updateAutoCycle = <K extends keyof AppSettings['autoCycle']>(
    key: K,
    value: AppSettings['autoCycle'][K],
  ) => {
    onChange({
      ...settings,
      autoCycle: { ...settings.autoCycle, [key]: value },
    })
  }

  const updateQuadText = (
    quadId: string,
    patch: Partial<QuadTextSettings>,
  ) => {
    const quad = settings.quads.find((entry) => entry.id === quadId)
    if (!quad) return

    updateQuad(quadId, {
      text: { ...quad.text, ...patch },
    })
  }

  const updateCustomFilter = (
    quadId: string,
    key: keyof CustomFilter,
    value: number,
  ) => {
    const quad = settings.quads.find((entry) => entry.id === quadId)
    if (!quad) return

    updateQuad(quadId, {
      customFilter: { ...quad.customFilter, [key]: value },
    })
  }

  return (
    <div className="hand-tracker__controls">
      <h2 className="hand-tracker__controls-title">Markers</h2>

      <label className="hand-tracker__control">
        <span className="hand-tracker__control-label">
          Marker opacity
          <span className="hand-tracker__control-value">
            {Math.round(settings.markers.markerOpacity * 100)}%
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.markers.markerOpacity * 100)}
          onChange={(event) =>
            updateMarkers('markerOpacity', Number(event.target.value) / 100)
          }
        />
      </label>

      <label className="hand-tracker__control">
        <span className="hand-tracker__control-label">
          Tip opacity
          <span className="hand-tracker__control-value">
            {Math.round(settings.markers.tipOpacity * 100)}%
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.markers.tipOpacity * 100)}
          onChange={(event) =>
            updateMarkers('tipOpacity', Number(event.target.value) / 100)
          }
        />
      </label>

      <label className="hand-tracker__control">
        <span className="hand-tracker__control-label">
          Line width
          <span className="hand-tracker__control-value">
            {settings.markers.connectorWidth}px
          </span>
        </span>
        <input
          type="range"
          min={1}
          max={12}
          value={settings.markers.connectorWidth}
          onChange={(event) =>
            updateMarkers('connectorWidth', Number(event.target.value))
          }
        />
      </label>

      <label className="hand-tracker__control">
        <span className="hand-tracker__control-label">
          Dot size
          <span className="hand-tracker__control-value">
            {settings.markers.landmarkRadius}px
          </span>
        </span>
        <input
          type="range"
          min={2}
          max={16}
          value={settings.markers.landmarkRadius}
          onChange={(event) =>
            updateMarkers('landmarkRadius', Number(event.target.value))
          }
        />
      </label>

      <h2 className="hand-tracker__controls-title">Auto Cycle</h2>

      <label className="hand-tracker__toggle">
        <input
          type="checkbox"
          checked={settings.autoCycle.enabled}
          onChange={(event) =>
            updateAutoCycle('enabled', event.target.checked)
          }
        />
        <span>Cycle effects automatically</span>
      </label>

      <label className="hand-tracker__control">
        <span className="hand-tracker__control-label">
          Cycle interval
          <span className="hand-tracker__control-value">
            {settings.autoCycle.intervalSeconds}s
          </span>
        </span>
        <input
          type="range"
          min={2}
          max={15}
          value={settings.autoCycle.intervalSeconds}
          onChange={(event) =>
            updateAutoCycle('intervalSeconds', Number(event.target.value))
          }
          disabled={!settings.autoCycle.enabled}
        />
      </label>

      <label className="hand-tracker__control">
        <span className="hand-tracker__control-label">Cycle mode</span>
        <select
          className="hand-tracker__select"
          value={settings.autoCycle.mode}
          onChange={(event) =>
            updateAutoCycle(
              'mode',
              event.target.value as AppSettings['autoCycle']['mode'],
            )
          }
          disabled={!settings.autoCycle.enabled}
        >
          <option value="staggered">Staggered (each quad different)</option>
          <option value="sync">Sync (all quads together)</option>
        </select>
      </label>

      <label className="hand-tracker__toggle">
        <input
          type="checkbox"
          checked={settings.autoCycle.wireframeEnabled}
          onChange={(event) =>
            updateAutoCycle('wireframeEnabled', event.target.checked)
          }
        />
        <span>Wireframe between quads</span>
      </label>

      <label className="hand-tracker__control">
        <span className="hand-tracker__control-label">
          Wireframe opacity
          <span className="hand-tracker__control-value">
            {Math.round(settings.autoCycle.wireframeOpacity * 100)}%
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.autoCycle.wireframeOpacity * 100)}
          onChange={(event) =>
            updateAutoCycle('wireframeOpacity', Number(event.target.value) / 100)
          }
          disabled={!settings.autoCycle.wireframeEnabled}
        />
      </label>

      {settings.autoCycle.enabled && (
        <div className="hand-tracker__cycle-status">
          {settings.quads.map((quad) => (
            <div key={quad.id} className="hand-tracker__cycle-row">
              <span>{quad.label}</span>
              <span className="hand-tracker__cycle-pill">
                {getPresetLabel(activeCyclePresets[quad.id] ?? quad.filterPreset)}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 className="hand-tracker__controls-title">Quadrilaterals</h2>

      {settings.quads.map((quad) => {
        const isOpen = openQuadId === quad.id

        return (
          <div key={quad.id} className="hand-tracker__accordion">
            <button
              type="button"
              className="hand-tracker__accordion-header"
              onClick={() => setOpenQuadId(isOpen ? null : quad.id)}
              aria-expanded={isOpen}
            >
              <span>{quad.label}</span>
              <span className="hand-tracker__accordion-icon">
                {isOpen ? '−' : '+'}
              </span>
            </button>

            {isOpen && (
              <div className="hand-tracker__accordion-body">
                <label className="hand-tracker__toggle">
                  <input
                    type="checkbox"
                    checked={quad.enabled}
                    onChange={(event) =>
                      updateQuad(quad.id, { enabled: event.target.checked })
                    }
                  />
                  <span>Enabled</span>
                </label>

                <label className="hand-tracker__control">
                  <span className="hand-tracker__control-label">
                    Filter preset
                    {settings.autoCycle.enabled && (
                      <span className="hand-tracker__control-note">
                        cycling
                      </span>
                    )}
                  </span>
                  <select
                    className="hand-tracker__select"
                    value={quad.filterPreset}
                    onChange={(event) =>
                      updateQuad(quad.id, {
                        filterPreset: event.target
                          .value as QuadConfig['filterPreset'],
                      })
                    }
                    disabled={settings.autoCycle.enabled}
                  >
                    {FILTER_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label} — {preset.description}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="hand-tracker__control">
                  <span className="hand-tracker__control-label">
                    Effect strength
                    <span className="hand-tracker__control-value">
                      {Math.round(quad.filterStrength * 100)}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(quad.filterStrength * 100)}
                    onChange={(event) =>
                      updateQuad(quad.id, {
                        filterStrength: Number(event.target.value) / 100,
                      })
                    }
                  />
                </label>

                <label className="hand-tracker__control">
                  <span className="hand-tracker__control-label">
                    Border opacity
                    <span className="hand-tracker__control-value">
                      {Math.round(quad.borderOpacity * 100)}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(quad.borderOpacity * 100)}
                    onChange={(event) =>
                      updateQuad(quad.id, {
                        borderOpacity: Number(event.target.value) / 100,
                      })
                    }
                  />
                </label>

                <label className="hand-tracker__control">
                  <span className="hand-tracker__control-label">
                    Border width
                    <span className="hand-tracker__control-value">
                      {quad.borderWidth}px
                    </span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={quad.borderWidth}
                    onChange={(event) =>
                      updateQuad(quad.id, {
                        borderWidth: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <div className="hand-tracker__control">
                  <span className="hand-tracker__control-label">Border color</span>
                  <div className="hand-tracker__swatches">
                    {BORDER_SWATCHES.map((color) => (
                      <button
                        key={color.join('-')}
                        type="button"
                        className={`hand-tracker__swatch${
                          quad.borderColor.join('-') === color.join('-')
                            ? ' hand-tracker__swatch--active'
                            : ''
                        }`}
                        style={{ backgroundColor: rgbToHex(color) }}
                        aria-label={`Border color ${rgbToHex(color)}`}
                        onClick={() => updateQuad(quad.id, { borderColor: color })}
                      />
                    ))}
                    <input
                      type="color"
                      className="hand-tracker__color-input"
                      value={rgbToHex(quad.borderColor)}
                      onChange={(event) => {
                        const rgb = hexToRgb(event.target.value)
                        if (rgb) updateQuad(quad.id, { borderColor: rgb })
                      }}
                    />
                  </div>
                </div>

                <div className="hand-tracker__custom-filters">
                  <h3 className="hand-tracker__subsection-title">Perspective text</h3>

                  <label className="hand-tracker__toggle">
                    <input
                      type="checkbox"
                      checked={quad.text.enabled}
                      onChange={(event) =>
                        updateQuadText(quad.id, { enabled: event.target.checked })
                      }
                    />
                    <span>Show text in quad</span>
                  </label>

                  <label className="hand-tracker__control">
                    <span className="hand-tracker__control-label">Text</span>
                    <input
                      type="text"
                      className="hand-tracker__text-input"
                      value={quad.text.content}
                      placeholder="Enter label..."
                      onChange={(event) =>
                        updateQuadText(quad.id, { content: event.target.value })
                      }
                      disabled={!quad.text.enabled}
                    />
                  </label>

                  <label className="hand-tracker__control">
                    <span className="hand-tracker__control-label">
                      Font size
                      <span className="hand-tracker__control-value">
                        {quad.text.fontSize}px
                      </span>
                    </span>
                    <input
                      type="range"
                      min={12}
                      max={120}
                      value={quad.text.fontSize}
                      onChange={(event) =>
                        updateQuadText(quad.id, {
                          fontSize: Number(event.target.value),
                        })
                      }
                      disabled={!quad.text.enabled}
                    />
                  </label>

                  <label className="hand-tracker__control">
                    <span className="hand-tracker__control-label">
                      Text opacity
                      <span className="hand-tracker__control-value">
                        {Math.round(quad.text.opacity * 100)}%
                      </span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(quad.text.opacity * 100)}
                      onChange={(event) =>
                        updateQuadText(quad.id, {
                          opacity: Number(event.target.value) / 100,
                        })
                      }
                      disabled={!quad.text.enabled}
                    />
                  </label>

                  <label className="hand-tracker__control">
                    <span className="hand-tracker__control-label">Text color</span>
                    <input
                      type="color"
                      className="hand-tracker__color-input hand-tracker__color-input--wide"
                      value={quad.text.color}
                      onChange={(event) =>
                        updateQuadText(quad.id, { color: event.target.value })
                      }
                      disabled={!quad.text.enabled}
                    />
                  </label>
                </div>

                {quad.filterPreset === 'custom' && (
                  <div className="hand-tracker__custom-filters">
                    <h3 className="hand-tracker__subsection-title">Custom filter</h3>

                    <label className="hand-tracker__control">
                      <span className="hand-tracker__control-label">
                        Blur
                        <span className="hand-tracker__control-value">
                          {quad.customFilter.blur.toFixed(1)}px
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={12}
                        step={0.1}
                        value={quad.customFilter.blur}
                        onChange={(event) =>
                          updateCustomFilter(
                            quad.id,
                            'blur',
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>

                    <label className="hand-tracker__control">
                      <span className="hand-tracker__control-label">
                        Brightness
                        <span className="hand-tracker__control-value">
                          {quad.customFilter.brightness.toFixed(2)}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={50}
                        max={200}
                        value={Math.round(quad.customFilter.brightness * 100)}
                        onChange={(event) =>
                          updateCustomFilter(
                            quad.id,
                            'brightness',
                            Number(event.target.value) / 100,
                          )
                        }
                      />
                    </label>

                    <label className="hand-tracker__control">
                      <span className="hand-tracker__control-label">
                        Contrast
                        <span className="hand-tracker__control-value">
                          {quad.customFilter.contrast.toFixed(2)}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={50}
                        max={200}
                        value={Math.round(quad.customFilter.contrast * 100)}
                        onChange={(event) =>
                          updateCustomFilter(
                            quad.id,
                            'contrast',
                            Number(event.target.value) / 100,
                          )
                        }
                      />
                    </label>

                    <label className="hand-tracker__control">
                      <span className="hand-tracker__control-label">
                        Grayscale
                        <span className="hand-tracker__control-value">
                          {Math.round(quad.customFilter.grayscale * 100)}%
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(quad.customFilter.grayscale * 100)}
                        onChange={(event) =>
                          updateCustomFilter(
                            quad.id,
                            'grayscale',
                            Number(event.target.value) / 100,
                          )
                        }
                      />
                    </label>

                    <label className="hand-tracker__control">
                      <span className="hand-tracker__control-label">
                        Hue rotate
                        <span className="hand-tracker__control-value">
                          {Math.round(quad.customFilter.hueRotate)}°
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={Math.round(quad.customFilter.hueRotate)}
                        onChange={(event) =>
                          updateCustomFilter(
                            quad.id,
                            'hueRotate',
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>

                    <label className="hand-tracker__control">
                      <span className="hand-tracker__control-label">
                        Invert
                        <span className="hand-tracker__control-value">
                          {Math.round(quad.customFilter.invert * 100)}%
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(quad.customFilter.invert * 100)}
                        onChange={(event) =>
                          updateCustomFilter(
                            quad.id,
                            'invert',
                            Number(event.target.value) / 100,
                          )
                        }
                      />
                    </label>

                    <label className="hand-tracker__control">
                      <span className="hand-tracker__control-label">
                        Saturate
                        <span className="hand-tracker__control-value">
                          {quad.customFilter.saturate.toFixed(2)}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={300}
                        value={Math.round(quad.customFilter.saturate * 100)}
                        onChange={(event) =>
                          updateCustomFilter(
                            quad.id,
                            'saturate',
                            Number(event.target.value) / 100,
                          )
                        }
                      />
                    </label>

                    <label className="hand-tracker__control">
                      <span className="hand-tracker__control-label">
                        Sepia
                        <span className="hand-tracker__control-value">
                          {Math.round(quad.customFilter.sepia * 100)}%
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(quad.customFilter.sepia * 100)}
                        onChange={(event) =>
                          updateCustomFilter(
                            quad.id,
                            'sepia',
                            Number(event.target.value) / 100,
                          )
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        className="hand-tracker__reset"
        onClick={() => onChange(DEFAULT_SETTINGS)}
      >
        Reset defaults
      </button>
    </div>
  )
}
