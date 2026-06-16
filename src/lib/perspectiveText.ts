import { orderQuadPoints, toPixelPoints } from './quadGeometry'
import type { Point2D, QuadTextSettings } from './types'

const TEXT_PLANE_WIDTH = 320
const TEXT_PLANE_HEIGHT = 96

type Triangle = [Point2D, Point2D, Point2D]

function solveAffineFromTriangles(src: Triangle, dst: Triangle) {
  const [s0, s1, s2] = src
  const [d0, d1, d2] = dst

  const denom =
    (s0.x - s2.x) * (s1.y - s2.y) - (s1.x - s2.x) * (s0.y - s2.y)

  if (Math.abs(denom) < 1e-6) return null

  const a =
    ((d0.x - d2.x) * (s1.y - s2.y) - (d1.x - d2.x) * (s0.y - s2.y)) / denom
  const c =
    ((d1.x - d2.x) * (s0.x - s2.x) - (d0.x - d2.x) * (s1.x - s2.x)) / denom
  const e =
    d2.x - a * s2.x - c * s2.y

  const b =
    ((d0.y - d2.y) * (s1.y - s2.y) - (d1.y - d2.y) * (s0.y - s2.y)) / denom
  const d =
    ((d1.y - d2.y) * (s0.x - s2.x) - (d0.y - d2.y) * (s1.x - s2.x)) / denom
  const f =
    d2.y - b * s2.x - d * s2.y

  return { a, b, c, d, e, f }
}

function clipTriangle(
  ctx: CanvasRenderingContext2D,
  triangle: Triangle,
) {
  const [p0, p1, p2] = triangle

  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.closePath()
  ctx.clip()
}

function drawTextTriangle(
  ctx: CanvasRenderingContext2D,
  text: string,
  src: Triangle,
  dst: Triangle,
  settings: QuadTextSettings,
) {
  const transform = solveAffineFromTriangles(src, dst)
  if (!transform) return

  ctx.save()
  clipTriangle(ctx, dst)
  ctx.setTransform(
    transform.a,
    transform.b,
    transform.c,
    transform.d,
    transform.e,
    transform.f,
  )
  ctx.globalAlpha = settings.opacity
  ctx.fillStyle = settings.color
  ctx.font = `700 ${settings.fontSize}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
  ctx.shadowBlur = 6
  ctx.translate(TEXT_PLANE_WIDTH / 2, TEXT_PLANE_HEIGHT / 2)
  ctx.scale(-1, 1)
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

export function drawPerspectiveTextInQuad(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  width: number,
  height: number,
  settings: QuadTextSettings,
) {
  if (!settings.enabled || !settings.content.trim() || points.length !== 4) {
    return
  }

  const pixels = toPixelPoints(points, width, height)
  const [p0, p1, p2, p3] = pixels

  const srcA: Triangle = [
    { x: 0, y: 0 },
    { x: TEXT_PLANE_WIDTH, y: 0 },
    { x: TEXT_PLANE_WIDTH, y: TEXT_PLANE_HEIGHT },
  ]
  const srcB: Triangle = [
    { x: 0, y: 0 },
    { x: TEXT_PLANE_WIDTH, y: TEXT_PLANE_HEIGHT },
    { x: 0, y: TEXT_PLANE_HEIGHT },
  ]

  drawTextTriangle(ctx, settings.content, srcA, [p0, p1, p2], settings)
  drawTextTriangle(ctx, settings.content, srcB, [p0, p2, p3], settings)
}

export function getOrderedPixelQuad(
  points: Point2D[],
  width: number,
  height: number,
) {
  return orderQuadPoints(points).map((point) => ({
    x: point.x * width,
    y: point.y * height,
  }))
}
