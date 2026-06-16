import { useEffect, useRef, useState } from 'react'
import {
  DrawingUtils,
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import {
  advanceCyclePresets,
  buildInitialCyclePresets,
  resolveActivePreset,
} from '../lib/autoCycle'
import { buildFilter } from '../lib/filterPresets'
import { HIGHLIGHT_TIPS } from '../lib/handLandmarks'

const HIGHLIGHT_TIPS_SET = new Set<number>(HIGHLIGHT_TIPS)
import {
  drawProceduralEffectInQuad,
  isProceduralPreset,
} from '../lib/proceduralEffects'
import {
  drawFilteredVideoInQuad,
  drawQuadBorder,
  drawQuadWireframe,
  getQuadPoints,
} from '../lib/quadGeometry'
import { drawPerspectiveTextInQuad } from '../lib/perspectiveText'
import { loadSettings, saveSettings } from '../lib/settingsStorage'
import type { AppSettings, FilterPresetId, Point2D } from '../lib/types'
import { ControlCenter, LayersPanel } from './ControlsPanel'
import PerspectiveQuadText from './PerspectiveQuadText'
import './HandTracker.css'

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export default function HandTracker() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const drawingUtilsRef = useRef<DrawingUtils | null>(null)
  const animationRef = useRef<number>(0)
  const lastVideoTimeRef = useRef(-1)
  const cachedLandmarksRef = useRef<NormalizedLandmark[][]>([])
  const cachedQuadPointsRef = useRef<Map<string, Point2D[]>>(new Map())
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const settingsRef = useRef(settings)
  const [activeCyclePresets, setActiveCyclePresets] = useState<
    Record<string, FilterPresetId>
  >(() => buildInitialCyclePresets(loadSettings().quads))
  const activeCyclePresetsRef = useRef(activeCyclePresets)

  const [cameraRequested, setCameraRequested] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(true)
  const [layersOpen, setLayersOpen] = useState(true)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            setCameraRequested(true)
            setStatus('loading')
          }
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              setCameraRequested(true)
              setStatus('loading')
            }
          }
        })
        .catch((err) => {
          console.warn('Camera permission query is not fully supported in this browser:', err)
        })
    }
  }, [])

  useEffect(() => {
    settingsRef.current = settings
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    activeCyclePresetsRef.current = activeCyclePresets
  }, [activeCyclePresets])

  useEffect(() => {
    if (!settings.autoCycle.enabled) return

    const intervalMs = settings.autoCycle.intervalSeconds * 1000
    const timer = window.setInterval(() => {
      setActiveCyclePresets((current) =>
        advanceCyclePresets(
          current,
          settingsRef.current.quads,
          settingsRef.current.autoCycle.mode,
        ),
      )
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [
    settings.autoCycle.enabled,
    settings.autoCycle.intervalSeconds,
    settings.autoCycle.mode,
    settings.quads.length,
  ])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCyclePresets(buildInitialCyclePresets(settings.quads))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.quads.length])

  useEffect(() => {
    if (!cameraRequested) return

    let stream: MediaStream | null = null
    let cancelled = false

    async function start() {
      try {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        video.srcObject = stream
        await video.play()

        const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        })

        if (cancelled) {
          landmarker.close()
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        landmarkerRef.current = landmarker

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')

        drawingUtilsRef.current = new DrawingUtils(ctx)

        const resizeCanvas = () => {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }

        video.addEventListener('loadeddata', resizeCanvas)
        resizeCanvas()

        setStatus('ready')

        const render = () => {
          if (cancelled || !landmarkerRef.current || !drawingUtilsRef.current) {
            return
          }

          const currentVideo = videoRef.current
          const currentCanvas = canvasRef.current
          if (!currentVideo || !currentCanvas) return

          if (currentVideo.videoWidth > 0 && currentVideo.videoHeight > 0) {
            if (
              currentCanvas.width !== currentVideo.videoWidth ||
              currentCanvas.height !== currentVideo.videoHeight
            ) {
              currentCanvas.width = currentVideo.videoWidth
              currentCanvas.height = currentVideo.videoHeight
            }

            if (currentVideo.currentTime !== lastVideoTimeRef.current) {
              lastVideoTimeRef.current = currentVideo.currentTime

              const results = landmarkerRef.current.detectForVideo(
                currentVideo,
                performance.now(),
              )

              cachedLandmarksRef.current = results.landmarks

              const nextQuadPoints = new Map<string, Point2D[]>()
              for (const quad of settingsRef.current.quads) {
                nextQuadPoints.set(
                  quad.id,
                  getQuadPoints(
                    results.landmarks,
                    quad.landmarkA,
                    quad.landmarkB,
                  ),
                )
              }
              cachedQuadPointsRef.current = nextQuadPoints
            }

            const ctx2d = currentCanvas.getContext('2d')
            if (ctx2d) {
              const { width, height } = currentCanvas
              const { markers, quads, autoCycle } = settingsRef.current
              const frameSeed = performance.now()

              ctx2d.clearRect(0, 0, width, height)
              ctx2d.drawImage(currentVideo, 0, 0, width, height)

              for (const quad of quads) {
                if (!quad.enabled || quad.filterStrength <= 0) continue

                const points = cachedQuadPointsRef.current.get(quad.id) ?? []
                const activePreset = resolveActivePreset(
                  quad.id,
                  quad.filterPreset,
                  autoCycle,
                  activeCyclePresetsRef.current,
                )

                if (isProceduralPreset(activePreset)) {
                  drawProceduralEffectInQuad(
                    ctx2d,
                    currentVideo,
                    points,
                    width,
                    height,
                    activePreset,
                    quad.filterStrength,
                    frameSeed,
                    quad.id,
                  )
                } else {
                  const filter = buildFilter(
                    activePreset,
                    quad.filterStrength,
                    quad.customFilter,
                  )

                  drawFilteredVideoInQuad(
                    ctx2d,
                    currentVideo,
                    points,
                    width,
                    height,
                    filter,
                  )
                }
              }

              for (const quad of quads) {
                if (!quad.enabled) continue

                const points = cachedQuadPointsRef.current.get(quad.id) ?? []
                drawPerspectiveTextInQuad(
                  ctx2d,
                  points,
                  width,
                  height,
                  quad.text,
                )
              }

              if (autoCycle.wireframeEnabled) {
                const enabledQuads = quads.filter((quad) => quad.enabled)
                for (let i = 0; i < enabledQuads.length - 1; i++) {
                  const fromQuad = enabledQuads[i]
                  const toQuad = enabledQuads[i + 1]
                  drawQuadWireframe(
                    ctx2d,
                    cachedQuadPointsRef.current.get(fromQuad.id) ?? [],
                    cachedQuadPointsRef.current.get(toQuad.id) ?? [],
                    width,
                    height,
                    autoCycle.wireframeOpacity,
                  )
                }
              }

              for (const landmarks of cachedLandmarksRef.current) {
                drawingUtilsRef.current.drawConnectors(
                  landmarks,
                  HandLandmarker.HAND_CONNECTIONS,
                  {
                    color: `rgba(0, 255, 0, ${markers.markerOpacity})`,
                    lineWidth: markers.connectorWidth,
                  },
                )
                drawingUtilsRef.current.drawLandmarks(landmarks, {
                  color: ({ index }: { index?: number }) =>
                    index !== undefined &&
                    HIGHLIGHT_TIPS_SET.has(index)
                      ? `rgba(255, 0, 0, ${markers.tipOpacity})`
                      : `rgba(255, 0, 0, ${markers.markerOpacity})`,
                  lineWidth: 2,
                  radius: markers.landmarkRadius,
                })
              }

              for (const quad of quads) {
                if (!quad.enabled) continue

                const points = cachedQuadPointsRef.current.get(quad.id) ?? []
                drawQuadBorder(
                  ctx2d,
                  points,
                  width,
                  height,
                  quad.borderOpacity,
                  quad.borderWidth,
                  quad.borderColor,
                )
              }
            }
          }

          animationRef.current = requestAnimationFrame(render)
        }

        animationRef.current = requestAnimationFrame(render)
      } catch (error) {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to start camera',
          )
        }
      }
    }

    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(animationRef.current)
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      drawingUtilsRef.current = null
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [cameraRequested])

  return (
    <div className="hand-tracker">
      <video ref={videoRef} className="hand-tracker__video" playsInline muted />
      <canvas ref={canvasRef} className="hand-tracker__canvas" />

      {!cameraRequested ? (
        <div className="hand-tracker__landing-screen">
          <div className="hand-tracker__landing-card">
            <div className="hand-tracker__landing-badge">✨ Interactive Demo</div>
            <h1 className="hand-tracker__landing-title">Cam Fingertips</h1>
            <p className="hand-tracker__landing-subtitle">
              Experience dynamic, interactive video effects controlled by your hands.
              Connect fingers in the air to build custom filtered shapes!
            </p>

            <div className="hand-tracker__landing-features">
              <div className="hand-tracker__landing-feature">
                <span className="hand-tracker__landing-feature-icon">📐</span>
                <div>
                  <strong>Finger Quads</strong>
                  <p>Create floating filter zones between your thumb, index, middle, and ring fingers.</p>
                </div>
              </div>
              <div className="hand-tracker__landing-feature">
                <span className="hand-tracker__landing-feature-icon">🔮</span>
                <div>
                  <strong>Procedural Filters</strong>
                  <p>Tweak Glitch, Thermal, TV Static, and Custom overlays in real-time.</p>
                </div>
              </div>
              <div className="hand-tracker__landing-feature">
                <span className="hand-tracker__landing-feature-icon">✍️</span>
                <div>
                  <strong>Perspective Labels</strong>
                  <p>Attach dynamic text that moves and rotates in 3D space with your fingers.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="hand-tracker__start-btn"
              onClick={() => setCameraRequested(true)}
            >
              <span>📷</span> Enable Camera & Start Demo
            </button>

            <p className="hand-tracker__landing-privacy">
              🔒 <strong>Privacy Note:</strong> All hand tracking runs entirely locally in your browser.
              No camera data is ever sent to a server.
            </p>
          </div>
        </div>
      ) : (
        <>
          {status === 'loading' && (
            <div className="hand-tracker__overlay">
              <div className="hand-tracker__spinner"></div>
              <p>Initializing camera & hand model…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="hand-tracker__overlay hand-tracker__overlay--error">
              <p>Could not access camera</p>
              <p className="hand-tracker__error-detail">{errorMessage}</p>
              <button
                type="button"
                className="hand-tracker__reset"
                style={{ width: 'auto', marginTop: '1rem' }}
                onClick={() => setCameraRequested(false)}
              >
                Go Back
              </button>
            </div>
          )}

          <PerspectiveQuadText quads={settings.quads} />

          {controlsOpen ? (
            <ControlCenter
              settings={settings}
              onChange={setSettings}
              activeCyclePresets={activeCyclePresets}
              onClose={() => setControlsOpen(false)}
            />
          ) : (
            <button
              type="button"
              className="hand-tracker__sidebar-trigger hand-tracker__sidebar-trigger--left"
              onClick={() => setControlsOpen(true)}
              title="Expand System Settings"
            >
              [⚙ CONFIG_SYS]
            </button>
          )}

          {layersOpen ? (
            <LayersPanel
              settings={settings}
              onChange={setSettings}
              activeCyclePresets={activeCyclePresets}
              onClose={() => setLayersOpen(false)}
            />
          ) : (
            <button
              type="button"
              className="hand-tracker__sidebar-trigger hand-tracker__sidebar-trigger--right"
              onClick={() => setLayersOpen(true)}
              title="Expand Shape Layers"
            >
              [🎛 SHAPE_LYR]
            </button>
          )}
        </>
      )}
    </div>
  )
}
