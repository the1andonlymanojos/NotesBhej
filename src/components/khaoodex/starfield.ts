// The KhaaoDex map draws restaurants as a star chart: every place keeps its own
// point (no clustering). Density is handled with brightness, thin constellation
// lines, and a gentle spread of pins that would otherwise sit on top of each
// other. All of it renders on one canvas.

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

/** A star projected to the canvas, after the declutter nudge. */
export type Placed = { star: Star; x: number; y: number; r: number }

type Project = (lat: number, lng: number) => { x: number; y: number }
type ThemeInk = (typeof mapThemes)[KhaaoDexTheme]

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
 * fewest, shortest links — the constellation backbone. Computed once per
 * restaurant set, not per frame.
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

function starRadius(magnitude: number, zoom: number) {
  const zoomBoost = Math.max(0.92, Math.min(1.6, 0.92 + (zoom - 12) * 0.08))
  return (3.4 + magnitude * 4.6) * zoomBoost
}

/**
 * Project every star, then relax the ones that would fully cover each other a few
 * pixels apart — enough that both are visible and tappable, never so far that a
 * pin lies about where a place is (each stays within DRIFT_CAP px of its point).
 */
export function layoutStars(stars: Star[], project: Project, zoom: number, declutter: boolean): Placed[] {
  const n = stars.length
  const x = new Float64Array(n)
  const y = new Float64Array(n)
  const ox = new Float64Array(n)
  const oy = new Float64Array(n)
  const r = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const p = project(stars[i].lat, stars[i].lng)
    x[i] = ox[i] = p.x
    y[i] = oy[i] = p.y
    r[i] = starRadius(stars[i].magnitude, zoom)
  }

  if (declutter && n > 1 && n <= 500) {
    const DRIFT_CAP = 15
    for (let pass = 0; pass < 5; pass++) {
      let moved = false
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = x[j] - x[i]
          let dy = y[j] - y[i]
          let d = Math.hypot(dx, dy)
          const min = r[i] + r[j] + 3
          if (d >= min) continue
          if (d < 0.01) {
            dx = i - j || 1
            dy = 0.7
            d = Math.hypot(dx, dy)
          }
          const push = ((min - d) / 2) * 0.55
          const ux = dx / d
          const uy = dy / d
          x[i] -= ux * push
          y[i] -= uy * push
          x[j] += ux * push
          y[j] += uy * push
          moved = true
        }
      }
      if (!moved) break
    }
    for (let i = 0; i < n; i++) {
      const dx = x[i] - ox[i]
      const dy = y[i] - oy[i]
      const len = Math.hypot(dx, dy)
      if (len > DRIFT_CAP) {
        x[i] = ox[i] + (dx / len) * DRIFT_CAP
        y[i] = oy[i] + (dy / len) * DRIFT_CAP
      }
    }
  }

  return stars.map((star, i) => ({ star, x: x[i], y: y[i], r: r[i] }))
}

export type DrawOptions = {
  placed: Placed[]
  edges: Array<[number, number, number]>
  colors: ThemeInk
  selectedId: number | null
  hoveredId: number | null
  zoom: number
  width: number
  height: number
  dpr: number
  /** Top inset (px) kept clear of labels so the filter bar never collides. */
  topInset: number
  /** While the map is being dragged / zoomed: skip glow, spikes, and labels. */
  cheap?: boolean
}

export function drawStarfield(ctx: CanvasRenderingContext2D, o: DrawOptions) {
  const { placed, edges, colors, selectedId, hoveredId, zoom, width, height, dpr, topInset, cheap } = o
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const onScreen = (p: { x: number; y: number }) =>
    p.x > -80 && p.x < width + 80 && p.y > -80 && p.y < height + 80
  const isActive = (id: number) => id === selectedId || id === hoveredId

  // 1. Constellation lines — short links bright, long ones fade toward nothing.
  ctx.lineCap = "round"
  for (const [a, b, km] of edges) {
    const pa = placed[a]
    const pb = placed[b]
    if (!pa || !pb || (!onScreen(pa) && !onScreen(pb))) continue
    const alpha = Math.max(0, Math.min(0.34, 0.34 * (1 - km / 4)))
    if (alpha < 0.015) continue
    const active = isActive(pa.star.id) || isActive(pb.star.id)
    ctx.strokeStyle = active ? colors.markerVisited : colors.roadMajor
    ctx.globalAlpha = active ? Math.min(0.7, alpha + 0.4) : alpha
    ctx.lineWidth = active ? 1.4 : 1.1
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const priority = (p: Placed) => (p.star.id === selectedId ? 2 : p.star.id === hoveredId ? 1 : 0)
  const order = [...placed.keys()].sort(
    (i, j) => priority(placed[i]) - priority(placed[j]) || placed[i].star.magnitude - placed[j].star.magnitude,
  )

  // 2. Stars.
  for (const i of order) {
    const { star, x, y } = placed[i]
    if (!onScreen(placed[i])) continue
    const selected = star.id === selectedId
    const hovered = star.id === hoveredId
    const rr = placed[i].r * (selected ? 1.55 : hovered ? 1.18 : 1)
    const core = star.visited ? colors.markerVisited : colors.markerUnvisited

    if (!cheap) {
      const glowR = rr * (selected ? 5 : 3.2 + star.magnitude)
      const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR)
      glow.addColorStop(0, hexAlpha(core, selected ? 0.6 : 0.42 + star.magnitude * 0.22))
      glow.addColorStop(0.5, hexAlpha(core, selected ? 0.22 : 0.12 + star.magnitude * 0.08))
      glow.addColorStop(1, hexAlpha(core, 0))
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, glowR, 0, Math.PI * 2)
      ctx.fill()

      if (selected || hovered || star.magnitude > 0.85) {
        const spike = rr * (selected ? 4.2 : 2.6)
        ctx.strokeStyle = hexAlpha(core, selected ? 0.55 : 0.3)
        ctx.lineWidth = selected ? 1.4 : 1
        ctx.beginPath()
        ctx.moveTo(x - spike, y)
        ctx.lineTo(x + spike, y)
        ctx.moveTo(x, y - spike)
        ctx.lineTo(x, y + spike)
        ctx.stroke()
      }
    }

    if (selected) {
      ctx.strokeStyle = hexAlpha(core, 0.9)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, rr + 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(x, y, rr, 0, Math.PI * 2)
    ctx.fillStyle = core
    ctx.fill()
    ctx.lineWidth = Math.max(1.25, rr * 0.32)
    ctx.strokeStyle = hexAlpha(colors.markerHalo, 0.95)
    ctx.stroke()
    if (rr > 5) {
      ctx.beginPath()
      ctx.arc(x, y, rr * 0.34, 0, Math.PI * 2)
      ctx.fillStyle = hexAlpha(colors.markerHalo, star.visited ? 0.5 : 0.9)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  if (cheap) return

  // 3. Labels. A place shows its name when there's room: always once zoomed in,
  // and at any zoom when the pin stands clear of its neighbours. Each name is
  // tried in four positions and dropped only if every spot would overlap another
  // label or pin.
  type Rect = { x: number; y: number; w: number; h: number }
  const overlaps = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

  const nearest = placed.map((p, i) => {
    let best = Infinity
    for (let j = 0; j < placed.length; j++) {
      if (j === i) continue
      const d = Math.hypot(p.x - placed[j].x, p.y - placed[j].y)
      if (d < best) best = d
    }
    return best
  })

  const boxes: Rect[] = [{ x: -10, y: -10, w: width + 20, h: topInset }]
  ctx.textBaseline = "middle"
  const labelOrder = [...placed.keys()].sort(
    (i, j) => priority(placed[j]) - priority(placed[i]) || placed[j].star.magnitude - placed[i].star.magnitude,
  )

  for (const i of labelOrder) {
    const { star, x, y, r } = placed[i]
    if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue
    const active = isActive(star.id)
    const roomy = nearest[i] > 44 + r
    if (!active && !(zoom >= 13.5 || (zoom >= 11.5 && roomy))) continue

    ctx.font = `${active ? 700 : 600} 12px ui-sans-serif, system-ui, sans-serif`
    const text = star.name.length > 24 ? `${star.name.slice(0, 23)}…` : star.name
    const tw = ctx.measureText(text).width
    const rad = r * (active ? 1.4 : 1)
    const anchors = [
      { x: x + rad + 7, y },
      { x: x - rad - 7 - tw, y },
      { x: x - tw / 2, y: y - rad - 13 },
      { x: x - tw / 2, y: y + rad + 13 },
    ]

    let spot: { x: number; y: number } | null = null
    for (const a of anchors) {
      const box: Rect = { x: a.x - 3, y: a.y - 9, w: tw + 6, h: 18 }
      if (box.x < 3 || box.x + box.w > width - 3) continue
      const hitsLabel = boxes.some((l) => overlaps(box, l))
      const hitsPin =
        !hitsLabel &&
        placed.some(
          (q, k) =>
            k !== i &&
            q.x > box.x - 3 &&
            q.x < box.x + box.w + 3 &&
            q.y > box.y - 3 &&
            q.y < box.y + box.h + 3,
        )
      if (!hitsLabel && !hitsPin) {
        spot = a
        boxes.push(box)
        break
      }
    }
    if (!spot) {
      if (!active) continue
      spot = anchors[0]
      boxes.push({ x: spot.x - 3, y: spot.y - 9, w: tw + 6, h: 18 })
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

export function hitTest(placed: Placed[], point: { x: number; y: number }): number | null {
  let bestId: number | null = null
  let bestD = Infinity
  for (const p of placed) {
    const hit = Math.max(12, p.r * 1.6 + 6)
    const d = Math.hypot(p.x - point.x, p.y - point.y)
    if (d < hit && d < bestD) {
      bestD = d
      bestId = p.star.id
    }
  }
  return bestId
}

/** #rrggbb → rgba() string. */
function hexAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
