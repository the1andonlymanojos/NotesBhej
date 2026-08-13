"use client"

import { useEffect, useRef, useState } from "react"

export type SelectedGooglePlace = {
  googlePlaceId: string
  name: string
  address: string
  latitude: number
  longitude: number
}

type PlaceAutocompleteProps = {
  onSelect: (place: SelectedGooglePlace) => void
}

type GooglePlaceResult = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { lat: () => number; lng: () => number }
}

type GooglePlacePrediction = {
  toPlace: () => { fetchFields: (options: { fields: string[] }) => Promise<void> } & GooglePlaceResult
}

type GooglePlaceSelectEvent = Event & {
  placePrediction?: GooglePlacePrediction
  detail?: { placePrediction?: GooglePlacePrediction }
}

type GooglePlacesAutocompleteElement = HTMLElement & {
  placeholder: string
  className: string
  addEventListener: (type: string, listener: EventListener) => void
}

type GoogleNamespace = {
  maps?: {
    places?: {
      PlaceAutocompleteElement: new (options: {
        includedRegionCodes: string[]
        locationBias: { center: { lat: number; lng: number }; radius: number }
      }) => GooglePlacesAutocompleteElement
    }
  }
}

declare global {
  interface Window {
    google?: GoogleNamespace
    __khaaoDexGooglePlacesPromise?: Promise<void>
  }
}

function loadGooglePlaces() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Places is browser-only"))
  if (window.google?.maps?.places) return Promise.resolve()
  if (window.__khaaoDexGooglePlacesPromise) return window.__khaaoDexGooglePlacesPromise

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"))

  window.__khaaoDexGooglePlacesPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Could not load Google Places"))
    document.head.appendChild(script)
  })
  return window.__khaaoDexGooglePlacesPromise
}

export default function PlaceAutocomplete({ onSelect }: PlaceAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    const container = containerRef.current
    loadGooglePlaces().then(() => {
      if (disposed || !container || !window.google?.maps?.places) return
      const autocomplete = new window.google.maps.places.PlaceAutocompleteElement({
        includedRegionCodes: ["in"],
        locationBias: {
          center: { lat: 26.2025, lng: 78.1746 },
          radius: 30000,
        },
      })
      autocomplete.placeholder = "Search Google for a restaurant…"
      autocomplete.className = "khaoodex-google-autocomplete"
      autocomplete.addEventListener("gmp-select", async (event: Event) => {
        const selectedEvent = event as GooglePlaceSelectEvent
        const prediction = selectedEvent.placePrediction ?? selectedEvent.detail?.placePrediction
        if (!prediction) return
        const place = prediction.toPlace()
        await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] })
        if (!place.id || !place.location) return
        onSelect({
          googlePlaceId: place.id,
          name: place.displayName?.text || "",
          address: place.formattedAddress || "",
          latitude: place.location.lat(),
          longitude: place.location.lng(),
        })
      })
      container.replaceChildren(autocomplete)
    }).catch((loadError: Error) => setError(loadError.message))

    return () => { disposed = true; container?.replaceChildren() }
  }, [onSelect])

  return <div><div ref={containerRef} className="min-h-10" />{error && <p className="mt-2 text-xs font-semibold text-red-600">{error}. Add the Google key to `.env.local` and reload.</p>}</div>
}
