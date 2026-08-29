"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { FeatureGroup, GeoJSON as GeoJSONLayer, LayerGroup, Map as LeafletMap } from "leaflet"
import type { KhaaoDexRestaurant } from "@/lib/api/types"
import { landmarkAssets } from "./data"
import { mapThemes, type KhaaoDexTheme } from "./themes"
import "leaflet/dist/leaflet.css"
import "./khaoodex.css"

type KhaaoDexMapProps = {
  theme: KhaaoDexTheme
  restaurants: KhaaoDexRestaurant[]
  selectedId: number | null
  onRestaurantSelect: (restaurantId: number) => void
}

const GWALIOR_CENTER: [number, number] = [26.2495, 78.174]

const geoJsonStyle = (theme: KhaaoDexTheme) => {
  const colors = mapThemes[theme]
  return {
    roads: (feature?: GeoJSON.Feature) => ({
      color: feature?.properties?.highway === "primary" ? colors.roadMajor : colors.road,
      weight: feature?.properties?.highway === "primary" ? 1.8 : 1,
      opacity: theme === "matrix" ? 0.82 : 0.72,
      lineCap: "round" as const,
      lineJoin: "round" as const,
    }),
    landmarks: {
      color: colors.landmarkBorder,
      weight: 1,
      fillColor: colors.landmark,
      fillOpacity: theme === "matrix" ? 0.5 : 0.6,
    },
  }
}

// Guard against records with missing or null-island coordinates so they don't
// strand a pin in the corner of the map.
const hasValidCoords = (restaurant: KhaaoDexRestaurant) =>
  Number.isFinite(restaurant.latitude) &&
  Number.isFinite(restaurant.longitude) &&
  !(Math.abs(restaurant.latitude) < 0.01 && Math.abs(restaurant.longitude) < 0.01)

export default function KhaaoDexMap({ theme, restaurants, selectedId, onRestaurantSelect }: KhaaoDexMapProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const roadsRef = useRef<GeoJSONLayer | null>(null)
  const landmarksRef = useRef<LayerGroup | null>(null)
  const markerGroupRef = useRef<FeatureGroup | null>(null)
  const didFitRef = useRef(false)
  const [ready, setReady] = useState(false)

  // Track the latest select handler without forcing the map to re-initialise.
  const onSelectRef = useRef(onRestaurantSelect)
  useEffect(() => {
    onSelectRef.current = onRestaurantSelect
  }, [onRestaurantSelect])

  // Initialise the map, its controls, and the static road/landmark layers exactly
  // once. Filter and "mark visited" changes never tear this down.
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

      const landmarks = L.layerGroup().addTo(map)
      landmarksRef.current = landmarks
      markerGroupRef.current = L.featureGroup().addTo(map)

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
    }

    init().catch((error) => console.error("Could not initialise KhaaoDex map", error))

    return () => {
      disposed = true
      mapRef.current?.remove()
      mapRef.current = null
      roadsRef.current = null
      landmarksRef.current = null
      markerGroupRef.current = null
      didFitRef.current = false
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-style the base layers and re-plot the markers when the theme or the
  // restaurant set changes — an in-place update, not a rebuild.
  const paint = useCallback(async () => {
    const map = mapRef.current
    const markerGroup = markerGroupRef.current
    if (!map || !markerGroup) return

    const L = await import("leaflet")
    const colors = mapThemes[theme]
    const styles = geoJsonStyle(theme)

    map.getContainer().style.background = colors.map
    roadsRef.current?.setStyle(styles.roads)
    landmarksRef.current?.eachLayer((layer) => {
      const geoLayer = layer as GeoJSONLayer
      geoLayer.setStyle(() => styles.landmarks)
    })

    markerGroup.clearLayers()
    restaurants.filter(hasValidCoords).forEach((restaurant) => {
      const visited = Boolean(restaurant.relationship?.visited)
      const selected = restaurant.id === selectedId
      const markerColor = visited ? colors.markerVisited : colors.markerUnvisited
      const classes = [
        "khaoodex-marker",
        visited ? "khaoodex-marker-visited" : "khaoodex-marker-unvisited",
        selected ? "khaoodex-marker-selected" : "",
      ]
        .filter(Boolean)
        .join(" ")
      L.marker([restaurant.latitude, restaurant.longitude], {
        zIndexOffset: selected ? 1000 : 0,
        icon: L.divIcon({
          className: "khaoodex-marker-wrap",
          html: `<span class="${classes}" style="--marker-color:${markerColor};--marker-halo:${colors.markerHalo}"><span></span></span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      })
        .on("click", () => onSelectRef.current(restaurant.id))
        .addTo(markerGroup)
    })

    // Frame the restaurants once, on the first load that actually has any — don't
    // yank the viewport back every time someone toggles a filter.
    if (!didFitRef.current && markerGroup.getBounds().isValid()) {
      map.fitBounds(markerGroup.getBounds().pad(0.15), { maxZoom: 15 })
      didFitRef.current = true
    }
  }, [restaurants, theme, selectedId])

  useEffect(() => {
    if (ready) void paint()
  }, [ready, paint])

  // Ease the map to a freshly selected restaurant so its pin isn't hidden behind the panel.
  useEffect(() => {
    if (!ready || selectedId == null) return
    const target = restaurants.find((restaurant) => restaurant.id === selectedId)
    if (!target || !hasValidCoords(target)) return
    const map = mapRef.current
    if (!map) return
    map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 14), { duration: 0.4 })
  }, [ready, selectedId, restaurants])

  return <div ref={mapElement} className="h-full w-full" aria-label="Interactive map of Gwalior" />
}
