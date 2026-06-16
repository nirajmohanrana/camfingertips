import type { Point2D } from './types'
import { orderQuadPoints } from './quadGeometry'

export interface Particle {
  u: number      // Normalized horizontal coordinate [0, 1]
  v: number      // Normalized vertical coordinate [0, 1]
  z: number      // Normalized depth [-0.5, 0.5]
  vu: number     // Velocity in u
  vv: number     // Velocity in v
  vz: number     // Velocity in z
  size: number   // Base size in pixels
  alpha: number  // Base opacity
  seed: number   // Random seed for offsets
}

const MAX_PARTICLES = 1200
const particleSystems = new Map<string, Particle[]>()

function initializeParticles(): Particle[] {
  const arr: Particle[] = []
  for (let i = 0; i < MAX_PARTICLES; i++) {
    arr.push({
      u: Math.random(),
      v: Math.random(),
      z: Math.random() - 0.5,
      vu: (Math.random() - 0.5) * 0.003,
      vv: (Math.random() - 0.5) * 0.003,
      vz: (Math.random() - 0.5) * 0.003,
      size: 1 + Math.random() * 2,
      alpha: 0.35 + Math.random() * 0.6,
      seed: Math.random() * 100,
    })
  }
  return arr
}

function updateParticles(particles: Particle[], time: number, strength: number) {
  for (const p of particles) {
    // Inject pseudo-fluid turbulence/noise using trigonometric waves
    const noiseU = Math.sin(time * 0.0018 + p.v * 8 + p.seed) * 0.00015
    const noiseV = Math.cos(time * 0.0015 + p.u * 8 + p.seed) * 0.00015
    const noiseZ = Math.sin(time * 0.0022 + (p.u + p.v) * 6 + p.seed) * 0.0001

    p.vu += noiseU * strength
    p.vv += noiseV * strength
    p.vz += noiseZ * strength

    // Apply drag to keep velocities bounded
    p.vu *= 0.985
    p.vv *= 0.985
    p.vz *= 0.985

    p.u += p.vu
    p.v += p.vv
    p.z += p.vz

    // If particle goes out of bounds, respawn it inside the volume
    if (
      p.u < 0 || p.u > 1 ||
      p.v < 0 || p.v > 1 ||
      p.z < -0.5 || p.z > 0.5
    ) {
      p.u = Math.random()
      p.v = Math.random()
      p.z = Math.random() - 0.5
      p.vu = (Math.random() - 0.5) * 0.003
      p.vv = (Math.random() - 0.5) * 0.003
      p.vz = (Math.random() - 0.5) * 0.003
    }
  }
}

// Thermal gradient calculation to repaint the face on the box walls
function thermalColor(value: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, value))
  if (t < 0.2) {
    const p = t / 0.2
    return [0, 0, Math.floor(80 + p * 120)]
  }
  if (t < 0.45) {
    const p = (t - 0.2) / 0.25
    return [0, Math.floor(p * 200), Math.floor(200 + p * 55)]
  }
  if (t < 0.65) {
    const p = (t - 0.45) / 0.2
    return [Math.floor(p * 120), 255, Math.floor(255 - p * 200)]
  }
  if (t < 0.85) {
    const p = (t - 0.65) / 0.2
    return [Math.floor(120 + p * 135), Math.floor(255 - p * 120), 0]
  }
  const p = (t - 0.85) / 0.15
  return [255, Math.floor(135 - p * 135), 0]
}

export function drawParticleEngine(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  points: Point2D[],
  width: number,
  height: number,
  quadId: string,
  strength: number,
  frameSeed: number,
) {
  // 1. Get or create particle system for this quad ID
  let particles = particleSystems.get(quadId)
  if (!particles) {
    particles = initializeParticles()
    particleSystems.set(quadId, particles)
  }

  // Update particles
  updateParticles(particles, frameSeed, strength)

  // 2. Resolve target quad points (hand tracking vs standby mode)
  const trackingActive = !!(points && points.length === 4)
  const activePoints = trackingActive
    ? orderQuadPoints(points).map((pt) => ({
        x: pt.x * width,
        y: pt.y * height,
      }))
    : (() => {
        // Standby Mode: simulated spinning 3D quad at canvas center
        const cx = width / 2
        const cy = height / 2
        const s = Math.min(width, height) * 0.4
        const w = s * 1.3
        const h = s * 0.8
        const theta = frameSeed * 0.0006
        const dist = 500

        const project = (x3d: number, y3d: number, z3d: number) => {
          const rx = x3d * Math.cos(theta) - z3d * Math.sin(theta)
          const rz = x3d * Math.sin(theta) + z3d * Math.cos(theta)
          const ry = y3d
          const fovScale = dist / (dist + rz)
          return { x: cx + rx * fovScale, y: cy + ry * fovScale }
        }

        return [
          project(-w / 2, -h / 2, 0), // TL
          project(w / 2, -h / 2, 0),  // TR
          project(w / 2, h / 2, 0),   // BR
          project(-w / 2, h / 2, 0),  // BL
        ]
      })()

  const [p0, p1, p2, p3] = activePoints

  // 3. Draw Cyber-Thermal background inside the quad boundaries
  ctx.save()
  // Custom quad clipping path
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.lineTo(p3.x, p3.y)
  ctx.closePath()
  ctx.clip()

  if (trackingActive && video.videoWidth > 0 && video.videoHeight > 0) {
    // Thermal color map on the face/video feed
    const sampleW = Math.max(80, Math.floor(width / 6))
    const sampleH = Math.max(60, Math.floor(height / 6))
    const sampleCanvas = document.createElement('canvas')
    sampleCanvas.width = sampleW
    sampleCanvas.height = sampleH
    const sampleCtx = sampleCanvas.getContext('2d')
    if (sampleCtx) {
      // Draw mirrored webcam frame to fit the canvas dimensions
      sampleCtx.save()
      sampleCtx.translate(sampleW, 0)
      sampleCtx.scale(-1, 1)
      sampleCtx.drawImage(video, 0, 0, sampleW, sampleH)
      sampleCtx.restore()

      const source = sampleCtx.getImageData(0, 0, sampleW, sampleH)
      const output = sampleCtx.createImageData(sampleW, sampleH)

      for (let i = 0; i < source.data.length; i += 4) {
        const lum =
          (source.data[i] * 0.299 +
            source.data[i + 1] * 0.587 +
            source.data[i + 2] * 0.114) /
          255
        const [r, g, b] = thermalColor(lum * strength + lum * (1 - strength) * 0.2)

        output.data[i] = r
        output.data[i + 1] = g
        output.data[i + 2] = b
        // Semi-transparent alpha for hologram glow aesthetic
        output.data[i + 3] = Math.floor(135 * strength)
      }

      sampleCtx.putImageData(output, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(sampleCanvas, 0, 0, width, height)
    }
  } else {
    // Standby mode: fill with cyber grid lines
    ctx.fillStyle = 'rgba(10, 16, 26, 0.6)'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)'
    ctx.lineWidth = 1
    const gridSpacing = 24
    for (let x = 0; x < width; x += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
    }
    for (let y = 0; y < height; y += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }
  }
  ctx.restore()

  // 4. Draw 3D-Projected Particle Cloud
  const phi = frameSeed * 0.0008 // Y-axis rotation angle

  // Connect nearby particles to form a neural pop constellation
  const step = Math.max(5, Math.floor(particles.length / 85))
  for (let i = 0; i < particles.length; i += step) {
    const pA = particles[i]
    const rU_A = (pA.u - 0.5) * Math.cos(phi) - pA.z * Math.sin(phi)
    const uRotA = rU_A + 0.5
    const pxA = (p0.x + uRotA * (p1.x - p0.x)) * (1 - pA.v) + (p3.x + uRotA * (p2.x - p3.x)) * pA.v
    const pyA = (p0.y + uRotA * (p1.y - p0.y)) * (1 - pA.v) + (p3.y + uRotA * (p2.y - p3.y)) * pA.v

    for (let j = i + step; j < particles.length; j += step) {
      const pB = particles[j]
      const rU_B = (pB.u - 0.5) * Math.cos(phi) - pB.z * Math.sin(phi)
      const uRotB = rU_B + 0.5
      const pxB = (p0.x + uRotB * (p1.x - p0.x)) * (1 - pB.v) + (p3.x + uRotB * (p2.x - p3.x)) * pB.v
      const pyB = (p0.y + uRotB * (p1.y - p0.y)) * (1 - pB.v) + (p3.y + uRotB * (p2.y - p3.y)) * pB.v

      const dx = pxA - pxB
      const dy = pyA - pyB
      const distSq = dx * dx + dy * dy
      const maxDist = 45 * strength

      if (distSq < maxDist * maxDist) {
        const d = Math.sqrt(distSq)
        const lineAlpha = (1 - d / maxDist) * 0.14 * strength
        // Gradient interpolation for lines
        const lineT = (uRotA + uRotB) / 2
        const r = Math.floor(255 * (1 - lineT))
        const g = Math.floor(100 * (1 - lineT) + 180 * lineT * 0.25)
        const b = Math.floor(255 * lineT)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha})`
        ctx.lineWidth = 0.6
        ctx.beginPath()
        ctx.moveTo(pxA, pyA)
        ctx.lineTo(pxB, pyB)
        ctx.stroke()
      }
    }
  }

  // Draw individual particles
  for (const p of particles) {
    const uPrime = p.u - 0.5
    const rotU = uPrime * Math.cos(phi) - p.z * Math.sin(phi)
    const rotZ = uPrime * Math.sin(phi) + p.z * Math.cos(phi)
    const uRotated = rotU + 0.5
    const v = p.v

    // Bilinear interpolation
    const topX = p0.x + uRotated * (p1.x - p0.x)
    const topY = p0.y + uRotated * (p1.y - p0.y)
    const bottomX = p3.x + uRotated * (p2.x - p3.x)
    const bottomY = p3.y + uRotated * (p2.y - p3.y)
    const px = topX + v * (bottomX - topX)
    const py = topY + v * (bottomY - topY)

    // Perspective scale and alpha depending on rotZ depth
    const fovScale = 1 + rotZ * 0.5
    const radius = p.size * fovScale * strength
    const alpha = p.alpha * (0.2 + 0.8 * (rotZ + 0.5)) * strength

    // Color: acid orange to blue gradient mapping
    const colorT = Math.max(0, Math.min(1, uRotated))
    const r = Math.floor(255 * (1 - colorT))
    const g = Math.floor(110 * (1 - colorT) + 160 * colorT * 0.25)
    const b = Math.floor(255 * colorT)

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2)
  }

  // 5. Draw Neon AR HUD
  const hudColor = trackingActive ? 'rgba(0, 229, 255, 0.8)' : 'rgba(255, 184, 0, 0.85)'
  const lineHUDColor = trackingActive ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 184, 0, 0.3)'

  // Border frame
  ctx.strokeStyle = lineHUDColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.lineTo(p3.x, p3.y)
  ctx.closePath()
  ctx.stroke()

  // Corner brackets
  const bracketLen = 18
  ctx.strokeStyle = hudColor
  ctx.lineWidth = 2.5

  // TL Corner (p0)
  ctx.beginPath()
  ctx.moveTo(p0.x + bracketLen, p0.y)
  ctx.lineTo(p0.x, p0.y)
  ctx.lineTo(p0.x, p0.y + bracketLen)
  ctx.stroke()

  // TR Corner (p1)
  ctx.beginPath()
  ctx.moveTo(p1.x - bracketLen, p1.y)
  ctx.lineTo(p1.x, p1.y)
  ctx.lineTo(p1.x, p1.y + bracketLen)
  ctx.stroke()

  // BR Corner (p2)
  ctx.beginPath()
  ctx.moveTo(p2.x - bracketLen, p2.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.lineTo(p2.x, p2.y - bracketLen)
  ctx.stroke()

  // BL Corner (p3)
  ctx.beginPath()
  ctx.moveTo(p3.x + bracketLen, p3.y)
  ctx.lineTo(p3.x, p3.y)
  ctx.lineTo(p3.x, p3.y - bracketLen)
  ctx.stroke()

  // Target Crosshair at the center of the quad
  const cx = (p0.x + p1.x + p2.x + p3.x) / 4
  const cy = (p0.y + p1.y + p2.y + p3.y) / 4
  ctx.strokeStyle = trackingActive ? 'rgba(0, 229, 255, 0.55)' : 'rgba(255, 184, 0, 0.5)'
  ctx.lineWidth = 1

  ctx.beginPath()
  ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy)
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
  ctx.stroke()

  // Floating tags on vertices
  ctx.fillStyle = hudColor
  ctx.font = '9px "Share Tech Mono", "JetBrains Mono", monospace'
  
  if (trackingActive) {
    ctx.fillText('[TRK_STATUS: ACTIVE]', p0.x + 6, p0.y - 6)
    ctx.fillText('[VOLUME: LINK_READY]', p1.x - 105, p1.y - 6)
    ctx.fillText('[FPS: 60]', p3.x + 6, p3.y + 14)
    ctx.fillText('[POP_SYS: ON]', p2.x - 70, p2.y + 14)
  } else {
    ctx.fillText('[SYS_STANDBY: WAITING]', p0.x + 6, p0.y - 6)
    ctx.fillText('[VOLUME: DISCONNECTED]', p1.x - 115, p1.y - 6)
    ctx.fillText('[FPS: STBY]', p3.x + 6, p3.y + 14)
    ctx.fillText('[ALIGN HANDS IN VIEW]', p2.x - 110, p2.y + 14)
  }

  // TouchDesigner timeline text overlay
  const frameCount = Math.floor(frameSeed / 16.666) % 600 + 1
  const sec = Math.floor(frameCount / 60)
  const frame = frameCount % 60
  const tcStr = `00:00:${sec.toString().padStart(2, '0')}:${frame.toString().padStart(2, '0')}`

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.font = '9px "Share Tech Mono", "JetBrains Mono", monospace'

  const infoY = Math.max(p2.y, p3.y) + 30
  ctx.fillText(`TouchDesigner, window /null1, resolution ${width} by ${height}`, cx - 140, infoY)
  ctx.fillText(`range 1 to 600 frames, 60 FPS, tempo 120`, cx - 90, infoY + 13)
  ctx.fillText(`timecode ${tcStr}, current frame ${frameCount}, Loop mode`, cx - 110, infoY + 26)
  ctx.fillStyle = trackingActive ? 'rgba(0, 255, 102, 0.85)' : 'rgba(255, 184, 0, 0.85)'
  ctx.fillText(`everything computed live, no pre-render`, cx - 95, infoY + 39)
}
