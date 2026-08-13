"use client"

import { useEffect, useRef } from "react"
import type { Map as LeafletMap } from "leaflet"
import { landmarkAssets, placeholderRestaurants } from "./data"
import { mapThemes, type KhaaoDexTheme } from "./themes"
import "leaflet/dist/leaflet.css"
import "./khaoodex.css"

type KhaaoDexMapProps = {
  theme: KhaaoDexTheme
}

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

export default function KhaaoDexMap({ theme }: KhaaoDexMapProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    let disposed = false
    let map: LeafletMap | null = null

    const renderMap = async () => {
      const L = await import("leaflet")
      if (disposed || !mapElement.current) return

      const colors = mapThemes[theme]
      const styles = geoJsonStyle(theme)
      map = L.map(mapElement.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        zoomSnap: 0.5,
        minZoom: 10,
      }).setView([26.2495, 78.174,], 13)
      mapRef.current = map
      map.getContainer().style.background = colors.map
      L.control.zoom({ position: "bottomright" }).addTo(map)

      const layerBounds = L.featureGroup().addTo(map)
      const roads = await fetch("/khaoodex/roads.geojson").then((response) => response.json())
      if (disposed || !map) return
      L.geoJSON(roads, { style: styles.roads }).addTo(layerBounds)

      const landmarks = await Promise.all(
        landmarkAssets.map((asset) => fetch(asset).then((response) => response.json()))
      )
      if (disposed || !map) return
      landmarks.forEach((data) => L.geoJSON(data, { style: styles.landmarks }).addTo(layerBounds))

      placeholderRestaurants.forEach((restaurant) => {
        const markerColor = restaurant.status === "visited" ? colors.markerVisited : colors.markerUnvisited
        const marker = L.marker(restaurant.coordinates, {
          icon: L.divIcon({
            className: "khaoodex-marker-wrap",
            html: `<span class="khaoodex-marker khaoodex-marker-${restaurant.status}" style="--marker-color:${markerColor};--marker-halo:${colors.markerHalo}"><span></span></span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        }).addTo(map!)

        marker.bindPopup(
          `<div class="khaoodex-popup"><div class="khaoodex-popup-status">${restaurant.status === "visited" ? "Visited" : "On your radar"}</div><strong>${restaurant.name}</strong><span>${restaurant.cuisine}</span><span>★ ${restaurant.rating} · trusted placeholder</span></div>`
        )
      })

      if (layerBounds.getBounds().isValid()) {
        map.fitBounds(layerBounds.getBounds().pad(0.08), { maxZoom: 13 })
      }
      window.setTimeout(() => map?.invalidateSize(), 50)
    }

    renderMap().catch((error) => console.error("Could not render KhaaoDex map", error))

    return () => {
      disposed = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [theme])

  return <div ref={mapElement} className="h-full w-full" aria-label="Interactive map of Gwalior" />
}
