import { traceQuadPath } from './quadGeometry'
import type { FilterPresetId, Point2D } from './types'
import { drawParticleEngine } from './particleEngine'

export const PROCEDURAL_PRESETS: FilterPresetId[] = [
  'tvStatic',
  'glitch',
  'thermal',
  'scanline',
  'particleEngine',
]

export function isProceduralPreset(
  preset: FilterPresetId,
): preset is 'tvStatic' | 'glitch' | 'thermal' | 'scanline' | 'particleEngine' {
  return PROCEDURAL_PRESETS.includes(preset)
}

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

function drawScanlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
  spacing = 3,
) {
  ctx.fillStyle = `rgba(0, 0, 0, ${0.25 * strength})`
  for (let y = 0; y < height; y += spacing) {
    ctx.fillRect(0, y, width, 1)
  }
}

function drawTvStatic(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  strength: number,
  frameSeed: number,
) {
  ctx.filter = `contrast(${1.4 + strength}) brightness(${0.75 + strength * 0.1}) saturate(0.35) hue-rotate(190deg)`
  ctx.drawImage(video, 0, 0, width, height)
  ctx.filter = 'none'

  const noiseW = Math.max(64, Math.floor(width / 4))
  const noiseH = Math.max(48, Math.floor(height / 4))
  const imageData = ctx.createImageData(noiseW, noiseH)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const n = Math.random()
    const flicker = 0.65 + Math.sin(frameSeed * 0.05 + i) * 0.35
    const v = Math.floor(n * 255 * flicker * strength)

    data[i] = Math.floor(v * 0.35)
    data[i + 1] = Math.floor(v * 0.55)
    data[i + 2] = Math.floor(v * 0.95 + 40)
    data[i + 3] = Math.floor(140 + n * 115 * strength)
  }

  const noiseCanvas = document.createElement('canvas')
  noiseCanvas.width = noiseW
  noiseCanvas.height = noiseH
  const noiseCtx = noiseCanvas.getContext('2d')
  noiseCtx?.putImageData(imageData, 0, 0)

  if (noiseCtx) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.55 + Math.sin(frameSeed * 0.12) * 0.15
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(noiseCanvas, 0, 0, width, height)
    ctx.restore()
  }

  drawScanlines(ctx, width, height, strength, 2)
}

function drawGlitch(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  strength: number,
  frameSeed: number,
) {
  const flicker = 0.82 + Math.sin(frameSeed * 0.2) * 0.18 * strength
  ctx.globalAlpha = flicker

  ctx.filter = `grayscale(${0.7 + strength * 0.3}) contrast(${1.6 + strength * 0.8}) brightness(${0.9 + Math.sin(frameSeed * 0.3) * 0.1})`
  ctx.drawImage(video, 0, 0, width, height)
  ctx.filter = 'none'
  ctx.globalAlpha = 1

  const sliceCount = Math.floor(6 + strength * 14)
  const sliceHeight = Math.ceil(height / sliceCount)

  for (let i = 0; i < sliceCount; i++) {
    const sy = i * sliceHeight
    const sh = Math.min(sliceHeight, height - sy)
    const roll = Math.sin(frameSeed * 0.07 + i * 1.7)

    if (Math.random() < 0.22 * strength) {
      const offset = (Math.random() - 0.5) * 80 * strength
      ctx.drawImage(video, 0, sy, width, sh, offset, sy, width, sh)
    }

    if (Math.random() < 0.12 * strength) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = 0.35 * strength
      ctx.drawImage(video, 0, sy, width, sh, 6 * roll, sy, width, sh)
      ctx.globalCompositeOperation = 'multiply'
      ctx.drawImage(video, 0, sy, width, sh, -6 * roll, sy, width, sh)
      ctx.restore()
    }
  }

  if (Math.random() < 0.08 * strength) {
    const bandY = Math.random() * height
    const bandH = 4 + Math.random() * 20
    ctx.fillStyle = `rgba(255, 255, 255, ${0.15 * strength})`
    ctx.fillRect(0, bandY, width, bandH)
  }

  drawScanlines(ctx, width, height, strength * 0.6, 4)
}

function drawThermal(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  strength: number,
) {
  const sampleW = Math.max(80, Math.floor(width / 6))
  const sampleH = Math.max(60, Math.floor(height / 6))
  const sampleCanvas = document.createElement('canvas')
  sampleCanvas.width = sampleW
  sampleCanvas.height = sampleH
  const sampleCtx = sampleCanvas.getContext('2d')
  if (!sampleCtx) return

  sampleCtx.drawImage(video, 0, 0, sampleW, sampleH)
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
    output.data[i + 3] = 255
  }

  sampleCtx.putImageData(output, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(sampleCanvas, 0, 0, width, height)
}

function drawScanlineEffect(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  strength: number,
  frameSeed: number,
) {
  const roll = Math.sin(frameSeed * 0.08) * 4
  ctx.filter = `brightness(${0.85 + strength * 0.15}) contrast(${1.1 + strength * 0.3})`
  ctx.drawImage(video, 0, roll, width, height)
  ctx.filter = 'none'
  drawScanlines(ctx, width, height, strength, 3)

  const barY = (frameSeed * 2.5) % height
  ctx.fillStyle = `rgba(255, 255, 255, ${0.08 * strength})`
  ctx.fillRect(0, barY, width, 8)
}

export function drawProceduralEffectInQuad(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  points: Point2D[],
  width: number,
  height: number,
  preset: 'tvStatic' | 'glitch' | 'thermal' | 'scanline' | 'particleEngine',
  strength: number,
  frameSeed: number,
  quadId: string,
) {
  if (strength <= 0) return

  if (preset === 'particleEngine') {
    drawParticleEngine(ctx, video, points, width, height, quadId, strength, frameSeed)
    return
  }

  if (points.length !== 4) return

  ctx.save()
  traceQuadPath(ctx, points, width, height)
  ctx.clip()

  switch (preset) {
    case 'tvStatic':
      drawTvStatic(ctx, video, width, height, strength, frameSeed)
      break
    case 'glitch':
      drawGlitch(ctx, video, width, height, strength, frameSeed)
      break
    case 'thermal':
      drawThermal(ctx, video, width, height, strength)
      break
    case 'scanline':
      drawScanlineEffect(ctx, video, width, height, strength, frameSeed)
      break
  }

  ctx.restore()
}
