import type { QuadConfig } from '../lib/types'

type PerspectiveQuadTextProps = {
  quads: QuadConfig[]
}

/**
 * Screen-reader layer for perspective text.
 * Visual rendering is done on the canvas via drawPerspectiveTextInQuad.
 */
export default function PerspectiveQuadText({ quads }: PerspectiveQuadTextProps) {
  const active = quads.filter(
    (quad) => quad.text.enabled && quad.text.content.trim().length > 0,
  )

  if (active.length === 0) return null

  return (
    <div className="perspective-quad-text">
      {active.map((quad) => (
        <span key={quad.id} className="perspective-quad-text__sr">
          {quad.label}: {quad.text.content}
        </span>
      ))}
    </div>
  )
}
