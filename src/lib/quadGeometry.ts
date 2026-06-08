import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { QUAD_POINT_COUNT } from './handLandmarks'
import type { Point2D } from './types'

export function getQuadPoints(
  landmarks: NormalizedLandmark[][],
  landmarkA: number,
  landmarkB: number,
): Point2D[] {
  const points: Point2D[] = []

  for (const hand of landmarks) {
    points.push({ x: hand[landmarkA].x, y: hand[landmarkA].y })
    points.push({ x: hand[landmarkB].x, y: hand[landmarkB].y })
  }

  return points
}

export function orderQuadPoints(points: Point2D[]): Point2D[] {
  const centerX =
    points.reduce((sum, point) => sum + point.x, 0) / points.length
  const centerY =
    points.reduce((sum, point) => sum + point.y, 0) / points.length

  return [...points].sort(
    (a, b) =>
      Math.atan2(a.y - centerY, a.x - centerX) -
      Math.atan2(b.y - centerY, b.x - centerX),
  )
}

export function traceQuadPath(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  width: number,
  height: number,
) {
  const ordered = orderQuadPoints(points)

  ctx.beginPath()
  ctx.moveTo(ordered[0].x * width, ordered[0].y * height)

  for (let i = 1; i < ordered.length; i++) {
    ctx.lineTo(ordered[i].x * width, ordered[i].y * height)
  }

  ctx.closePath()
}

export function drawFilteredVideoInQuad(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  points: Point2D[],
  width: number,
  height: number,
  filter: string,
) {
  if (points.length !== QUAD_POINT_COUNT || filter === 'none') return

  ctx.save()
  traceQuadPath(ctx, points, width, height)
  ctx.clip()
  ctx.filter = filter
  ctx.drawImage(video, 0, 0, width, height)
  ctx.restore()
}

export function toPixelPoints(
  points: Point2D[],
  width: number,
  height: number,
): Point2D[] {
  return orderQuadPoints(points).map((point) => ({
    x: point.x * width,
    y: point.y * height,
  }))
}

export function drawQuadWireframe(
  ctx: CanvasRenderingContext2D,
  fromPoints: Point2D[],
  toPoints: Point2D[],
  width: number,
  height: number,
  opacity: number,
) {
  if (fromPoints.length !== QUAD_POINT_COUNT || toPoints.length !== QUAD_POINT_COUNT) {
    return
  }
  if (opacity <= 0) return

  const fromPixels = toPixelPoints(fromPoints, width, height)
  const toPixels = toPixelPoints(toPoints, width, height)

  ctx.save()
  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`
  ctx.lineWidth = 1.5

  for (let i = 0; i < QUAD_POINT_COUNT; i++) {
    ctx.beginPath()
    ctx.moveTo(fromPixels[i].x, fromPixels[i].y)
    ctx.lineTo(toPixels[i].x, toPixels[i].y)
    ctx.stroke()
  }

  ctx.restore()
}

export function drawQuadBorder(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  width: number,
  height: number,
  strokeOpacity: number,
  borderWidth: number,
  rgb: [number, number, number],
) {
  if (points.length !== QUAD_POINT_COUNT || strokeOpacity <= 0) return

  const [r, g, b] = rgb

  ctx.save()
  traceQuadPath(ctx, points, width, height)
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${strokeOpacity})`
  ctx.lineWidth = borderWidth
  ctx.stroke()
  ctx.restore()
}
