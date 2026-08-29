"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { GeoJSON as GeoJSONLayer, LayerGroup, LeafletMouseEvent, Map as LeafletMap } from "leaflet"
import type { KhaaoDexRestaurant } from "@/lib/api/types"
import { landmarkAssets } from "./data"
import { mapThemes, type KhaaoDexTheme } from "./themes"
import {
  constellationEdges,
  drawStarfield,
  hitTest,
  layoutStars,
  toStars,
  type Placed,
  type Star,
} from "./starfield"
import "leaflet/dist/leaflet.css"
import "./khaoodex.css"

type KhaaoDexMapProps = {
  theme: KhaaoDexTheme
  restaurants: KhaaoDexRestaurant[]
  selectedId: number | null
  onRestaurantSelect: (restaurantId: number | null) => void
}

const GWALIOR_CENTER: [number, number] = [26.2495, 78.174]
/** Keep labels out from under the top bar + filter row. */
const TOP_INSET = 116

const geoJsonStyle = (theme: KhaaoDexTheme) => {
  const colors = mapThemes[theme]
  return {
    roads: (feature?: GeoJSON.Feature) => ({
      color: feature?.properties?.highway === "primary" ? colors.roadMajor : colors.road,
      weight: feature?.properties?.highway === "primary" ? 1.8 : 1,
      opacity: theme === "dusk" ? 0.82 : 0.72,
      lineCap: "round" as const,
      lineJoin: "round" as const,
    }),
    landmarks: {
      color: colors.landmarkBorder,
      weight: 1,
      fillColor: colors.landmark,
      fillOpacity: theme === "dusk" ? 0.5 : 0.6,
    },
  }
}

export default function KhaaoDexMap({ theme, restaurants, selectedId, onRestaurantSelect }: KhaaoDexMapProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const roadsRef = useRef<GeoJSONLayer | null>(null)
  const landmarksRef = useRef<LayerGroup | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const hoveredRef = useRef<number | null>(null)
  const interactingRef = useRef(false)
  /** Last drawn star positions (post-declutter) — hit-testing reads these instead
   *  of re-projecting + re-laying-out on every pointer move. */
  const layoutRef = useRef<Placed[]>([])
  const didFitRef = useRef(false)
  const [ready, setReady] = useState(false)

  const stars = useMemo<Star[]>(() => toStars(restaurants), [restaurants])
  const edges = useMemo(() => constellationEdges(stars), [stars])

  // Keep the drawing inputs on refs so the rAF loop never sees stale data and the
  // map never has to re-initialise.
  const drawState = useRef({ stars, edges, theme, selectedId })
  drawState.current = { stars, edges, theme, selectedId }
  const onSelectRef = useRef(onRestaurantSelect)
  useEffect(() => {
    onSelectRef.current = onRestaurantSelect
  }, [onRestaurantSelect])

  const draw = useCallback(() => {
    rafRef.current = null
    const map = mapRef.current
    const canvas = canvasRef.current
    if (!map || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = map.getSize()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== size.x * dpr || canvas.height !== size.y * dpr) {
      canvas.width = size.x * dpr
      canvas.height = size.y * dpr
      canvas.style.width = `${size.x}px`
      canvas.style.height = `${size.y}px`
    }

    const { stars: s, edges: e, theme: t, selectedId: sel } = drawState.current
    const cheap = interactingRef.current
    const zoom = map.getZoom()
    const placed = layoutStars(s, (lat, lng) => map.latLngToContainerPoint([lat, lng]), zoom, !cheap)
    layoutRef.current = placed
    drawStarfield(ctx, {
      placed,
      edges: e,
      colors: mapThemes[t],
      selectedId: sel,
      hoveredId: hoveredRef.current,
      zoom,
      width: size.x,
      height: size.y,
      dpr,
      topInset: TOP_INSET,
      cheap,
    })
  }, [])

  const scheduleDraw = useCallback(() => {
    if (rafRef.current == null) rafRef.current = window.requestAnimationFrame(draw)
  }, [draw])

  // Init once: the map, controls, static layers, and the starfield canvas.
  useEffect(() => {
    let disposed = false

    const init = async () => {
      const L = await import("leaflet")
      if (disposed || !mapElement.current || mapRef.current) return

      const styles = geoJsonStyle(theme)
      const map = L.map(mapElement.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        zoomSnap: 0.5,
        minZoom: 10,
      }).setView(GWALIOR_CENTER, 12)
      mapRef.current = map
      map.getContainer().style.background = mapThemes[theme].map
      L.control.zoom({ position: "bottomright" }).addTo(map)

      const canvas = document.createElement("canvas")
      canvas.className = "khaoodex-starfield"
      canvas.setAttribute("aria-hidden", "true")
      map.getContainer().appendChild(canvas)
      canvasRef.current = canvas

      const landmarks = L.layerGroup().addTo(map)
      landmarksRef.current = landmarks

      let zooming = false
      map.on("move zoom resize", scheduleDraw)
      // Panning: draw a cheap version each frame so the stars track the drag.
      map.on("movestart", () => {
        if (!zooming) interactingRef.current = true
      })
      map.on("moveend", () => {
        if (!zooming) {
          interactingRef.current = false
          scheduleDraw()
        }
      })
      // Zooming: Leaflet animates the base map on its own; hide the overlay for
      // that ~200ms and fade it back in, redrawn, rather than fighting the anim.
      map.on("zoomstart", () => {
        zooming = true
        interactingRef.current = true
        if (canvasRef.current) canvasRef.current.style.opacity = "0"
      })
      map.on("zoomend", () => {
        zooming = false
        interactingRef.current = false
        scheduleDraw()
        if (canvasRef.current) canvasRef.current.style.opacity = "1"
      })
      map.on("click", (event: LeafletMouseEvent) => {
        // A tap on a touch device also fires a synthetic mousemove with no
        // matching mouseout — clear any stuck hover so a pin doesn't stay big.
        if (hoveredRef.current != null) {
          hoveredRef.current = null
          scheduleDraw()
        }
        onSelectRef.current(hitTest(layoutRef.current, event.containerPoint))
      })

      // Hover styling is for real pointers only; touch devices skip it entirely.
      const finePointer =
        typeof window !== "undefined" &&
        window.matchMedia?.("(hover: hover) and (pointer: fine)").matches
      if (finePointer) {
        map.on("mousemove", (event: LeafletMouseEvent) => {
          const id = hitTest(layoutRef.current, event.containerPoint)
          if (id !== hoveredRef.current) {
            hoveredRef.current = id
            map.getContainer().style.cursor = id != null ? "pointer" : ""
            scheduleDraw()
          }
        })
        map.on("mouseout", () => {
          if (hoveredRef.current != null) {
            hoveredRef.current = null
            map.getContainer().style.cursor = ""
            scheduleDraw()
          }
        })
      }

      try {
        const [roadsData, ...landmarkData] = await Promise.all([
          fetch("/khaoodex/roads.geojson").then((response) => response.json()),
          ...landmarkAssets.map((asset) => fetch(asset).then((response) => response.json())),
        ])
        if (disposed || !mapRef.current) return
        const roads = L.geoJSON(roadsData, { style: styles.roads }).addTo(map)
        roads.bringToBack()
        roadsRef.current = roads
        landmarkData.forEach((data) => L.geoJSON(data, { style: () => styles.landmarks }).addTo(landmarks))
      } catch (error) {
        console.error("Could not load KhaaoDex base map layers", error)
      }

      window.setTimeout(() => mapRef.current?.invalidateSize(), 50)
      if (!disposed) setReady(true)
      scheduleDraw()
    }

    init().catch((error) => console.error("Could not initialise KhaaoDex map", error))

    return () => {
      disposed = true
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      roadsRef.current = null
      landmarksRef.current = null
      canvasRef.current = null
      hoveredRef.current = null
      didFitRef.current = false
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Theme: restyle the (heavy) base layers only when the theme actually changes.
  useEffect(() => {
    if (!ready) return
    const map = mapRef.current
    if (!map) return
    const styles = geoJsonStyle(theme)
    map.getContainer().style.background = mapThemes[theme].map
    roadsRef.current?.setStyle(styles.roads)
    landmarksRef.current?.eachLayer((layer) => {
      const geoLayer = layer as GeoJSONLayer
      geoLayer.setStyle(() => styles.landmarks)
    })
    scheduleDraw()
  }, [ready, theme, scheduleDraw])

  // Stars / selection: cheap canvas redraw, no layer work.
  useEffect(() => {
    if (ready) scheduleDraw()
  }, [ready, stars, edges, selectedId, scheduleDraw])

  // Fit once to the restaurants; then ease to whatever gets selected.
  useEffect(() => {
    if (!ready || !mapRef.current || stars.length === 0) return
    const map = mapRef.current
    void import("leaflet").then((L) => {
      if (!mapRef.current) return
      if (!didFitRef.current) {
        // Frame the dense middle of the set, not the far-flung outliers, so the
        // constellation actually fills the view.
        const lats = stars.map((s) => s.lat).sort((a, b) => a - b)
        const lngs = stars.map((s) => s.lng).sort((a, b) => a - b)
        const lo = Math.floor(stars.length * 0.08)
        const hi = Math.ceil(stars.length * 0.92) - 1
        const bounds = L.latLngBounds(
          [lats[lo], lngs[lo]],
          [lats[Math.max(hi, lo)], lngs[Math.max(hi, lo)]],
        )
        if (bounds.isValid()) map.fitBounds(bounds.pad(0.25), { maxZoom: 15 })
        didFitRef.current = true
      }
    })
  }, [ready, stars])

  useEffect(() => {
    if (!ready || selectedId == null) return
    const target = stars.find((s) => s.id === selectedId)
    const map = mapRef.current
    if (!target || !map) return
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), { duration: 0.4 })
  }, [ready, selectedId, stars])

  return <div ref={mapElement} className="h-full w-full" aria-label="Star map of Gwalior restaurants" />
}
