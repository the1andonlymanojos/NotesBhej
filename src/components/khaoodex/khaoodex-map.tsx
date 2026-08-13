"use client"

import { useEffect, useRef } from "react"
import type { Map as LeafletMap } from "leaflet"
import type { KhaaoDexRestaurant } from "@/lib/api/types"
import { landmarkAssets } from "./data"
import { mapThemes, type KhaaoDexTheme } from "./themes"
import "leaflet/dist/leaflet.css"
import "./khaoodex.css"

type KhaaoDexMapProps = {
  theme: KhaaoDexTheme
  restaurants: KhaaoDexRestaurant[]
  onRestaurantSelect: (restaurantId: number) => void
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

function categoryLabel(category: string) {
  return category.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}

export default function KhaaoDexMap({ theme, restaurants, onRestaurantSelect }: KhaaoDexMapProps) {
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

      restaurants.forEach((restaurant) => {
        const markerColor = restaurant.relationship?.visited ? colors.markerVisited : colors.markerUnvisited
        const marker = L.marker([restaurant.latitude, restaurant.longitude], {
          icon: L.divIcon({
            className: "khaoodex-marker-wrap",
            html: `<span class="khaoodex-marker khaoodex-marker-${restaurant.relationship?.visited ? "visited" : "unvisited"}" style="--marker-color:${markerColor};--marker-halo:${colors.markerHalo}"><span></span></span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        }).addTo(map!)

        marker.on("click", () => onRestaurantSelect(restaurant.id))
        marker.bindPopup(`<div class="khaoodex-popup"><div class="khaoodex-popup-status">${restaurant.relationship?.visited ? "Visited" : "On your radar"}</div><strong>${restaurant.name}</strong><span>${restaurant.categories?.map(categoryLabel).join(" · ") || restaurant.cuisine || "Category not listed"}</span><span>★ ${restaurant.averageRating?.toFixed(1) || "—"} · ${restaurant.reviewCount} reviews</span></div>`)
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
  }, [onRestaurantSelect, restaurants, theme])

  return <div ref={mapElement} className="h-full w-full" aria-label="Interactive map of Gwalior" />
}
