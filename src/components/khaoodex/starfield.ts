// The KhaaoDex map draws restaurants as a star chart: every place keeps its own
// point (no clustering), density is handled with brightness + thin constellation
// lines instead. All of it renders on one canvas so redraws stay cheap.

import type { KhaaoDexRestaurant } from "@/lib/api/types"
import { mapThemes, type KhaaoDexTheme } from "./themes"

export type Star = {
  id: number
  lat: number
  lng: number
  name: string
  visited: boolean
  /** 0.3 (obscure) … 1.2 (a place everyone's been to) — drives size + glow. */
  magnitude: number
}

const hasCoords = (r: KhaaoDexRestaurant) =>
  Number.isFinite(r.latitude) &&
  Number.isFinite(r.longitude) &&
  !(Math.abs(r.latitude) < 0.01 && Math.abs(r.longitude) < 0.01)

export function toStars(restaurants: KhaaoDexRestaurant[]): Star[] {
  return restaurants.filter(hasCoords).map((r) => {
    const reviews = Math.max(0, r.reviewCount ?? 0)
    const rating = r.averageRating ?? 0
    const magnitude = Math.min(1.2, 0.3 + 0.14 * Math.log2(reviews + 1) + 0.3 * (rating / 5))
    return {
      id: r.id,
      lat: r.latitude,
      lng: r.longitude,
      name: r.name,
      visited: Boolean(r.relationship?.visited),
      magnitude,
    }
  })
}

/** Rough great-circle distance in km — fine at city scale. */
function distanceKm(a: Star, b: Star) {
  const dLat = (b.lat - a.lat) * 111
  const dLng = (b.lng - a.lng) * 111 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dLat, dLng)
}

/**
 * Euclidean minimum spanning tree (Prim's). Connects the whole set with the
 * fewest, shortest links — the constellation backbone. n is small (< a few
 * hundred) so O(n²) is fine.
 */
export function constellationEdges(stars: Star[]): Array<[number, number, number]> {
  if (stars.length < 2) return []
  const inTree = new Array(stars.length).fill(false)
  const best = new Array(stars.length).fill(Infinity)
  const parent = new Array(stars.length).fill(-1)
  best[0] = 0
  const edges: Array<[number, number, number]> = []

  for (let iter = 0; iter < stars.length; iter++) {
    let u = -1
    for (let i = 0; i < stars.length; i++) {
      if (!inTree[i] && (u === -1 || best[i] < best[u])) u = i
    }
    if (u === -1) break
    inTree[u] = true
    if (parent[u] !== -1) edges.push([parent[u], u, best[u]])
    for (let v = 0; v < stars.length; v++) {
      if (inTree[v]) continue
      const d = distanceKm(stars[u], stars[v])
      if (d < best[v]) {
        best[v] = d
        parent[v] = u
      }
    }
  }
  return edges
}

type ThemeInk = (typeof mapThemes)[KhaaoDexTheme]

function starRadius(magnitude: number, zoom: number) {
  const zoomBoost = Math.max(0.92, Math.min(1.6, 0.92 + (zoom - 12) * 0.08))
  return (3.4 + magnitude * 4.6) * zoomBoost
}

export type DrawOptions = {
  stars: Star[]
  edges: Array<[number, number, number]>
  project: (lat: number, lng: number) => { x: number; y: number }
  theme: KhaaoDexTheme
  colors: ThemeInk
  selectedId: number | null
  hoveredId: number | null
  zoom: number
  width: number
  height: number
  dpr: number
  /** Top inset (px) kept clear of labels so the filter bar never collides. */
  topInset: number
  /** Skip the name pass while the map is being dragged / zoomed. */
  skipLabels?: boolean
}

export function drawStarfield(ctx: CanvasRenderingContext2D, o: DrawOptions) {
  const { stars, edges, project, colors, selectedId, hoveredId, zoom, width, height, dpr, topInset } = o
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const pts = stars.map((s) => project(s.lat, s.lng))
  const onScreen = (p: { x: number; y: number }) =>
    p.x > -80 && p.x < width + 80 && p.y > -80 && p.y < height + 80

  // 1. Constellation lines — short links bright, long ones fade toward nothing.
  ctx.lineCap = "round"
  for (const [a, b, km] of edges) {
    const pa = pts[a]
    const pb = pts[b]
    if (!onScreen(pa) && !onScreen(pb)) continue
    const alpha = Math.max(0, Math.min(0.34, 0.34 * (1 - km / 4)))
    if (alpha < 0.015) continue
    const touchesActive = stars[a].id === selectedId || stars[b].id === selectedId || stars[a].id === hoveredId || stars[b].id === hoveredId
    ctx.strokeStyle = touchesActive ? colors.markerVisited : colors.roadMajor
    ctx.globalAlpha = touchesActive ? Math.min(0.7, alpha + 0.4) : alpha
    ctx.lineWidth = touchesActive ? 1.4 : 1.1
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // Per-star pixel radius + distance to the nearest other pin (drives whether a
  // label has room to breathe).
  const baseR = stars.map((s) => starRadius(s.magnitude, zoom))
  const nearestPx = pts.map((p, i) => {
    let best = Infinity
    for (let j = 0; j < pts.length; j++) {
      if (j === i) continue
      const d = Math.hypot(p.x - pts[j].x, p.y - pts[j].y)
      if (d < best) best = d
    }
    return best
  })

  const priority = (i: number) => (stars[i].id === selectedId ? 2 : stars[i].id === hoveredId ? 1 : 0)

  // 2. Stars. Draw unselected first, then the highlighted one on top.
  const order = [...stars.keys()].sort(
    (i, j) => priority(i) - priority(j) || stars[i].magnitude - stars[j].magnitude,
  )

  for (const i of order) {
    const star = stars[i]
    const p = pts[i]
    if (!onScreen(p)) continue
    const selected = star.id === selectedId
    const hovered = star.id === hoveredId
    const r = baseR[i] * (selected ? 1.55 : hovered ? 1.18 : 1)
    const core = star.visited ? colors.markerVisited : colors.markerUnvisited

    // glow — every star reads as a point of light; brighter ones bloom more.
    const glowR = r * (selected ? 5 : 3.2 + star.magnitude)
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR)
    glow.addColorStop(0, hexAlpha(core, selected ? 0.6 : 0.42 + star.magnitude * 0.22))
    glow.addColorStop(0.5, hexAlpha(core, selected ? 0.22 : 0.12 + star.magnitude * 0.08))
    glow.addColorStop(1, hexAlpha(core, 0))
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2)
    ctx.fill()

    // diffraction spikes on the brightest / active stars
    if (selected || hovered || star.magnitude > 0.85) {
      const spike = r * (selected ? 4.2 : 2.6)
      ctx.strokeStyle = hexAlpha(core, selected ? 0.55 : 0.3)
      ctx.lineWidth = selected ? 1.4 : 1
      ctx.beginPath()
      ctx.moveTo(p.x - spike, p.y)
      ctx.lineTo(p.x + spike, p.y)
      ctx.moveTo(p.x, p.y - spike)
      ctx.lineTo(p.x, p.y + spike)
      ctx.stroke()
    }

    // halo ring for the selected star
    if (selected) {
      ctx.strokeStyle = hexAlpha(core, 0.9)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    // body — a filled point of light with a thin halo ring so it reads on any
    // map colour. Visited stars carry the accent; "on the radar" stars are cooler.
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = core
    ctx.fill()
    ctx.lineWidth = Math.max(1.25, r * 0.32)
    ctx.strokeStyle = hexAlpha(colors.markerHalo, 0.95)
    ctx.stroke()
    // a bright center pip once the star is big enough for it to register
    if (r > 5) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * 0.34, 0, Math.PI * 2)
      ctx.fillStyle = hexAlpha(colors.markerHalo, star.visited ? 0.5 : 0.9)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  if (o.skipLabels) return

  // 3. Labels. A place shows its name when there's room for it: always once
  // zoomed in, and at any zoom when the pin stands on its own. Names are tried in
  // four positions and dropped only if every spot would overlap another label or
  // pin.
  type Rect = { x: number; y: number; w: number; h: number }
  const overlaps = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  const placed: Rect[] = [{ x: -10, y: -10, w: width + 20, h: topInset }]
  ctx.textBaseline = "middle"

  const labelOrder = [...stars.keys()].sort(
    (i, j) => priority(j) - priority(i) || stars[j].magnitude - stars[i].magnitude,
  )

  for (const i of labelOrder) {
    const star = stars[i]
    const p = pts[i]
    if (p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40) continue
    const active = star.id === selectedId || star.id === hoveredId
    const roomy = nearestPx[i] > 44 + baseR[i]
    if (!active && !(zoom >= 13.5 || (zoom >= 11.5 && roomy))) continue

    ctx.font = `${active ? 700 : 600} 12px ui-sans-serif, system-ui, sans-serif`
    const text = star.name.length > 24 ? `${star.name.slice(0, 23)}…` : star.name
    const tw = ctx.measureText(text).width
    const r = baseR[i] * (active ? 1.4 : 1)
    const anchors = [
      { x: p.x + r + 7, y: p.y },
      { x: p.x - r - 7 - tw, y: p.y },
      { x: p.x - tw / 2, y: p.y - r - 13 },
      { x: p.x - tw / 2, y: p.y + r + 13 },
    ]

    let spot: { x: number; y: number } | null = null
    for (const a of anchors) {
      const box: Rect = { x: a.x - 3, y: a.y - 9, w: tw + 6, h: 18 }
      if (box.x < 3 || box.x + box.w > width - 3) continue
      const hitsLabel = placed.some((l) => overlaps(box, l))
      const hitsPin =
        !hitsLabel &&
        pts.some(
          (q, k) =>
            k !== i &&
            q.x > box.x - 3 &&
            q.x < box.x + box.w + 3 &&
            q.y > box.y - 3 &&
            q.y < box.y + box.h + 3,
        )
      if (!hitsLabel && !hitsPin) {
        spot = a
        placed.push(box)
        break
      }
    }
    if (!spot) {
      if (!active) continue
      spot = anchors[0]
      placed.push({ x: spot.x - 3, y: spot.y - 9, w: tw + 6, h: 18 })
    }

    ctx.lineWidth = 3.5
    ctx.strokeStyle = hexAlpha(colors.map, 0.92)
    ctx.strokeText(text, spot.x, spot.y)
    ctx.fillStyle = colors.text
    ctx.globalAlpha = active ? 1 : 0.92
    ctx.fillText(text, spot.x, spot.y)
    ctx.globalAlpha = 1
  }
}

export function hitTest(
  stars: Star[],
  project: (lat: number, lng: number) => { x: number; y: number },
  point: { x: number; y: number },
  zoom: number,
): number | null {
  let bestId: number | null = null
  let bestD = Infinity
  for (const star of stars) {
    const p = project(star.lat, star.lng)
    const hit = Math.max(12, starRadius(star.magnitude, zoom) * 1.6 + 6)
    const d = Math.hypot(p.x - point.x, p.y - point.y)
    if (d < hit && d < bestD) {
      bestD = d
      bestId = star.id
    }
  }
  return bestId
}

/** #rrggbb (+ optional aa) → rgba() string. */
function hexAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
