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
  [59, 130, 246],  // Blue
  [217, 119, 6],   // Orange
  [168, 85, 247],  // Purple
  [34, 197, 94],   // Green
  [239, 68, 68],   // Red
  [244, 244, 245], // White
]

const PRESET_DESCRIPTIONS: Record<FilterPresetId, string> = {
  invert: 'Negative photo-chemical color inversion.',
  sepia: 'Warm nostalgic sepia tone wash.',
  noir: 'Sleek, high-contrast black & white filter.',
  prism: 'Vibrant shifting rainbow hue scale.',
  dream: 'Soft focus frosted glass aesthetic glow.',
  neon: 'Intense arcade color saturation boosting.',
  matrix: 'Futuristic monochrome computer console code green.',
  warm: 'Cozy golden hour afternoon sunset lighting filter.',
  cool: 'Deep frozen cybernetic blue hue wash.',
  xray: 'High contrast reverse skeletal vision.',
  tvStatic: 'Classic analogue CRT noise & flickering.',
  glitch: 'Digital interference and signal distortion.',
  thermal: 'Infrared heat vision color grading.',
  scanline: 'Horizontal display scanlines with roll.',
  particleEngine: 'TouchDesigner POP particle volume with orange-blue gradient & neon HUD.',
  custom: 'Manually tweak contrast, saturation, hue, blur, etc.',
}

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

// ----------------------------------------------------
// Custom Mini Binary Toggle Component [ OFF | ON ]
// ----------------------------------------------------
type BinaryToggleProps = {
  checked: boolean
  onChange: (val: boolean) => void
  label: string
  desc?: string
}

function BinaryToggle({ checked, onChange, label, desc }: BinaryToggleProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onChange(!checked)
    }
  }
  return (
    <div className="telemetry-toggle-row">
      <div className="telemetry-toggle-labels">
        <span className="telemetry-label-title">{label}</span>
        {desc && <span className="telemetry-label-desc">{desc}</span>}
      </div>
      <div
        className="binary-toggle"
        role="button"
        tabIndex={0}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        onKeyDown={handleKeyDown}
      >
        <span className={`binary-toggle__option ${!checked ? 'binary-toggle__option--active' : ''}`}>OFF</span>
        <span className={`binary-toggle__option ${checked ? 'binary-toggle__option--active' : ''}`}>ON</span>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// Left Panel: Control Center Component
// ----------------------------------------------------
export function ControlCenter({
  settings,
  onChange,
  activeCyclePresets,
  onClose,
}: ControlsPanelProps & { onClose: () => void }) {
  const [markersExpanded, setMarkersExpanded] = useState(true)
  const [autoCycleExpanded, setAutoCycleExpanded] = useState(true)

  const updateMarkers = <K extends keyof AppSettings['markers']>(
    key: K,
    value: AppSettings['markers'][K],
  ) => {
    onChange({
      ...settings,
      markers: { ...settings.markers, [key]: value },
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

  return (
    <div className="hand-tracker__telemetry-panel hand-tracker__control-center">
      <div className="hand-tracker__panel-header">
        <div className="hand-tracker__panel-header-title">
          <span className="panel-dot panel-dot--amber"></span>
          <span className="panel-title-text">SYS_CONTROL_CENTER</span>
        </div>
        <button
          type="button"
          className="hand-tracker__panel-close-btn"
          onClick={onClose}
          title="Collapse Panel"
        >
          [◀ HIDE]
        </button>
      </div>

      <div className="hand-tracker__panel-scroll-content">
        {/* Markers Section */}
        <div className={`telemetry-card ${markersExpanded ? 'is-open' : ''}`}>
          <div
            className="telemetry-card__header"
            role="button"
            tabIndex={0}
            aria-expanded={markersExpanded}
            onClick={() => setMarkersExpanded(!markersExpanded)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setMarkersExpanded(!markersExpanded)
              }
            }}
          >
            <span className="telemetry-card__title">🔬 HAND_MARKERS</span>
            <span className="telemetry-card__caret">{markersExpanded ? '[-]' : '[+]'}</span>
          </div>

          {markersExpanded && (
            <div className="telemetry-card__body">
              <label className="hand-tracker__control">
                <span className="hand-tracker__control-label">
                  Marker Opacity
                  <span className="hand-tracker__control-value">
                    [{Math.round(settings.markers.markerOpacity * 100)}%]
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
                  Fingertip Opacity
                  <span className="hand-tracker__control-value">
                    [{Math.round(settings.markers.tipOpacity * 100)}%]
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
                  Line Thickness
                  <span className="hand-tracker__control-value">
                    [{settings.markers.connectorWidth}px]
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
                  Joint Point Size
                  <span className="hand-tracker__control-value">
                    [{settings.markers.landmarkRadius}px]
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
            </div>
          )}
        </div>

        {/* Auto Cycle Section */}
        <div className={`telemetry-card ${autoCycleExpanded ? 'is-open' : ''}`}>
          <div
            className="telemetry-card__header"
            role="button"
            tabIndex={0}
            aria-expanded={autoCycleExpanded}
            onClick={() => setAutoCycleExpanded(!autoCycleExpanded)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setAutoCycleExpanded(!autoCycleExpanded)
              }
            }}
          >
            <span className="telemetry-card__title">🔄 AUTO_CYCLE_ENGINE</span>
            <span className="telemetry-card__caret">{autoCycleExpanded ? '[-]' : '[+]'}</span>
          </div>

          {autoCycleExpanded && (
            <div className="telemetry-card__body">
              <BinaryToggle
                checked={settings.autoCycle.enabled}
                onChange={(val) => updateAutoCycle('enabled', val)}
                label="Filter Rotation Cycle"
                desc="Cycle space presets automatically."
              />

              <label className="hand-tracker__control">
                <span className="hand-tracker__control-label">
                  Rotation Interval
                  <span className="hand-tracker__control-value">
                    [{settings.autoCycle.intervalSeconds}s]
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
                <span className="hand-tracker__control-label">Rotation Method</span>
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
                  <option value="staggered">STAGGERED (Independent offsets)</option>
                  <option value="sync">SYNCED (All space loops together)</option>
                </select>
              </label>

              <div style={{ marginTop: '0.4rem', marginBottom: '0.6rem' }}>
                <BinaryToggle
                  checked={settings.autoCycle.wireframeEnabled}
                  onChange={(val) => updateAutoCycle('wireframeEnabled', val)}
                  label="Inter-Layer Wireframes"
                  desc="Bridge spaces with vectors."
                />
              </div>

              <label className="hand-tracker__control">
                <span className="hand-tracker__control-label">
                  Wireframe Opacity
                  <span className="hand-tracker__control-value">
                    [{Math.round(settings.autoCycle.wireframeOpacity * 100)}%]
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
                  <span className="hand-tracker__subsection-header">TELEMETRY_CYCLE_STATUS</span>
                  {settings.quads.map((quad) => (
                    <div key={quad.id} className="hand-tracker__cycle-row">
                      <span>{quad.label.toUpperCase()}</span>
                      <span className="hand-tracker__cycle-pill">
                        {getPresetLabel(activeCyclePresets[quad.id] ?? quad.filterPreset).toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="hand-tracker__reset"
          onClick={() => onChange(DEFAULT_SETTINGS)}
        >
          <span>[RESET_SYSTEM_DEFAULTS]</span>
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// Right Panel: Layers Panel
// ----------------------------------------------------
type LayersPanelProps = {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
  activeCyclePresets: Record<string, FilterPresetId>
  onClose: () => void
}

export function LayersPanel({
  settings,
  onChange,
  activeCyclePresets,
  onClose,
}: LayersPanelProps) {
  const updateQuad = (quadId: string, patch: Partial<QuadConfig>) => {
    onChange({
      ...settings,
      quads: settings.quads.map((quad) =>
        quad.id === quadId ? { ...quad, ...patch } : quad,
      ),
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
    <div className="hand-tracker__telemetry-panel hand-tracker__layers-panel">
      <div className="hand-tracker__panel-header">
        <div className="hand-tracker__panel-header-title">
          <span className="panel-dot panel-dot--green"></span>
          <span className="panel-title-text">LAYER_CONFIG_SPACE</span>
        </div>
        <button
          type="button"
          className="hand-tracker__panel-close-btn"
          onClick={onClose}
          title="Collapse Panel"
        >
          [HIDE ▶]
        </button>
      </div>

      <div className="hand-tracker__panel-scroll-content">
        {settings.quads.map((quad, index) => {
          const activePresetId = settings.autoCycle.enabled && activeCyclePresets[quad.id]
            ? activeCyclePresets[quad.id]
            : quad.filterPreset

          return (
            <LayerCard
              key={quad.id}
              quad={quad}
              autoCycleEnabled={settings.autoCycle.enabled}
              activePresetId={activePresetId}
              updateQuad={updateQuad}
              updateQuadText={updateQuadText}
              updateCustomFilter={updateCustomFilter}
              defaultOpen={index === 0}
            />
          )
        })}
      </div>
    </div>
  )
}

// ----------------------------------------------------
// Sub-component: LayerCard (collapsible card)
// ----------------------------------------------------
type LayerCardProps = {
  quad: QuadConfig
  autoCycleEnabled: boolean
  activePresetId: FilterPresetId
  updateQuad: (quadId: string, patch: Partial<QuadConfig>) => void
  updateQuadText: (quadId: string, patch: Partial<QuadTextSettings>) => void
  updateCustomFilter: (quadId: string, key: keyof CustomFilter, value: number) => void
  defaultOpen: boolean
}

function LayerCard({
  quad,
  autoCycleEnabled,
  activePresetId,
  updateQuad,
  updateQuadText,
  updateCustomFilter,
  defaultOpen,
}: LayerCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggleHeader = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.layer-card__header-checkbox')) {
      return
    }
    setIsOpen(!isOpen)
  }

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('.layer-card__header-checkbox')) {
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className={`layer-card layer-card--${quad.id}${isOpen ? ' is-open' : ''}${quad.enabled ? ' is-enabled' : ''}`}>
      {/* Header */}
      <div
        className="layer-card__header"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={toggleHeader}
        onKeyDown={handleHeaderKeyDown}
      >
        <div className="layer-card__title-area">
          <div className="layer-card__accent-bar"></div>
          <span className="layer-card__title">{quad.label.toUpperCase()}</span>
        </div>
        <div className="layer-card__header-right">
          <input
            type="checkbox"
            className="layer-card__header-checkbox"
            checked={quad.enabled}
            title={quad.enabled ? 'Deactivate Layer' : 'Activate Layer'}
            onChange={(event) =>
              updateQuad(quad.id, { enabled: event.target.checked })
            }
          />
          <span className="layer-card__caret">{isOpen ? '[-]' : '[+]'}</span>
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="layer-card__body">
          {/* Active Preset */}
          <label className="hand-tracker__control">
            <span className="hand-tracker__control-label">
              Overlay Effect
              {autoCycleEnabled && (
                <span className="telemetry-tag">ROTATING</span>
              )}
            </span>
            <select
              className="hand-tracker__select"
              value={quad.filterPreset}
              onChange={(event) =>
                updateQuad(quad.id, {
                  filterPreset: event.target.value as QuadConfig['filterPreset'],
                })
              }
              disabled={autoCycleEnabled}
            >
              {FILTER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label.toUpperCase()}
                </option>
              ))}
            </select>
            <span className="telemetry-description">
              // {PRESET_DESCRIPTIONS[activePresetId] ?? ''}
            </span>
          </label>

          {/* Effect Strength */}
          <label className="hand-tracker__control">
            <span className="hand-tracker__control-label">
              Effect Strength
              <span className="hand-tracker__control-value">
                [{Math.round(quad.filterStrength * 100)}%]
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

          {/* Border Settings */}
          <div className="hand-tracker__subsection">
            <span className="hand-tracker__subsection-header">BORDER_OVERLAY_TELEMETRY</span>

            <label className="hand-tracker__control">
              <span className="hand-tracker__control-label">
                Border Opacity
                <span className="hand-tracker__control-value">
                  [{Math.round(quad.borderOpacity * 100)}%]
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
                Border Thickness
                <span className="hand-tracker__control-value">
                  [{quad.borderWidth}px]
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
              <span className="hand-tracker__control-label">Vector Color Hue</span>
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
                    aria-label={`Select vector color ${rgbToHex(color)}`}
                    onClick={() => updateQuad(quad.id, { borderColor: color })}
                  />
                ))}
                <span className="hand-tracker__color-picker-wrapper">
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CUST:</span>
                  <input
                    type="color"
                    className="hand-tracker__color-input"
                    value={rgbToHex(quad.borderColor)}
                    onChange={(event) => {
                      const rgb = hexToRgb(event.target.value)
                      if (rgb) updateQuad(quad.id, { borderColor: rgb })
                    }}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Perspective Text settings */}
          <div className="hand-tracker__subsection">
            <span className="hand-tracker__subsection-header">3D_PERSPECTIVE_TXT_LAYER</span>

            <BinaryToggle
              checked={quad.text.enabled}
              onChange={(val) => updateQuadText(quad.id, { enabled: val })}
              label="Render Label in Quad"
              desc="Align text with hand angles."
            />

            <label className="hand-tracker__control">
              <span className="hand-tracker__control-label">Text string</span>
              <input
                type="text"
                className="hand-tracker__text-input"
                value={quad.text.content}
                placeholder="LABEL_STRING..."
                onChange={(event) =>
                  updateQuadText(quad.id, { content: event.target.value })
                }
                disabled={!quad.text.enabled}
              />
            </label>

            <label className="hand-tracker__control">
              <span className="hand-tracker__control-label">
                Font Size Metric
                <span className="hand-tracker__control-value">
                  [{quad.text.fontSize}px]
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
                Text Opacity
                <span className="hand-tracker__control-value">
                  [{Math.round(quad.text.opacity * 100)}%]
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
              <span className="hand-tracker__control-label">Text Color Hex</span>
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

          {/* Custom filters parameters */}
          {quad.filterPreset === 'custom' && (
            <div className="hand-tracker__subsection">
              <span className="hand-tracker__subsection-header">FINE_TUNING_PARAMETERS</span>

              <label className="hand-tracker__control">
                <span className="hand-tracker__control-label">
                  Gauss Blur
                  <span className="hand-tracker__control-value">
                    [{quad.customFilter.blur.toFixed(1)}px]
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
                  Brightness Scalar
                  <span className="hand-tracker__control-value">
                    [{quad.customFilter.brightness.toFixed(2)}]
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
                  Contrast Scalar
                  <span className="hand-tracker__control-value">
                    [{quad.customFilter.contrast.toFixed(2)}]
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
                  Grayscale Mix
                  <span className="hand-tracker__control-value">
                    [{Math.round(quad.customFilter.grayscale * 100)}%]
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
                  Hue Rotation
                  <span className="hand-tracker__control-value">
                    [{Math.round(quad.customFilter.hueRotate)}°]
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
                  Invert Ratio
                  <span className="hand-tracker__control-value">
                    [{Math.round(quad.customFilter.invert * 100)}%]
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
                  Saturation Scalar
                  <span className="hand-tracker__control-value">
                    [{quad.customFilter.saturate.toFixed(2)}]
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
                  Sepia Ratio
                  <span className="hand-tracker__control-value">
                    [{Math.round(quad.customFilter.sepia * 100)}%]
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
}
