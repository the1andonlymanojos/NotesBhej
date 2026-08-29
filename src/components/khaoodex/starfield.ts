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

  // 2. Stars. Draw unselected first, then the highlighted one on top.
  const order = [...stars.keys()].sort((i, j) => {
    const si = stars[i].id === selectedId ? 2 : stars[i].id === hoveredId ? 1 : 0
    const sj = stars[j].id === selectedId ? 2 : stars[j].id === hoveredId ? 1 : 0
    return si - sj || stars[i].magnitude - stars[j].magnitude
  })

  const labels: Array<{ x: number; y: number; w: number; h: number }> = []
  ctx.textBaseline = "middle"

  for (const i of order) {
    const star = stars[i]
    const p = pts[i]
    if (!onScreen(p)) continue
    const selected = star.id === selectedId
    const hovered = star.id === hoveredId
    const r = starRadius(star.magnitude, zoom) * (selected ? 1.55 : hovered ? 1.18 : 1)
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

    // label — always for selected/hover, otherwise only bright stars once zoomed in
    const showLabel = selected || hovered || (star.magnitude > 0.8 && zoom >= 13.5) || zoom >= 15.5
    if (!showLabel) continue
    ctx.font = `${selected ? 700 : 600} 12px ui-sans-serif, system-ui, sans-serif`
    const text = star.name.length > 26 ? `${star.name.slice(0, 25)}…` : star.name
    const tw = ctx.measureText(text).width
    const lx = p.x + r + 6
    const ly = p.y
    const box = { x: lx - 2, y: ly - 9, w: tw + 4, h: 18 }
    if (ly < topInset + 8) continue
    const collides = labels.some(
      (l) => box.x < l.x + l.w && box.x + box.w > l.x && box.y < l.y + l.h && box.y + box.h > l.y,
    )
    if (collides && !selected && !hovered) continue
    labels.push(box)
    ctx.lineWidth = 3
    ctx.strokeStyle = hexAlpha(colors.map, 0.9)
    ctx.strokeText(text, lx, ly)
    ctx.fillStyle = colors.text
    ctx.fillText(text, lx, ly)
  }
  ctx.globalAlpha = 1
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
