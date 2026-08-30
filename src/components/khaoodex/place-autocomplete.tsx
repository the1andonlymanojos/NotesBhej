"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, MapPin, Search, X } from "lucide-react"

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

/* ---- Minimal typings for the bits of the new Places API we touch ---- */

type PlaceLike = {
  id?: string
  displayName?: string | { text?: string } | null
  formattedAddress?: string | null
  location?: { lat: () => number; lng: () => number } | null
  fetchFields: (options: { fields: string[] }) => Promise<unknown>
}

type Prediction = {
  placeId?: string
  text?: { text?: string }
  mainText?: { text?: string } | null
  secondaryText?: { text?: string } | null
  toPlace: () => PlaceLike
}

type Suggestion = { placePrediction?: Prediction | null }

type PlacesLib = {
  AutocompleteSessionToken: new () => object
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string
      sessionToken?: object
      includedRegionCodes?: string[]
      includedPrimaryTypes?: string[]
      locationBias?: { center: { lat: number; lng: number }; radius: number }
    }) => Promise<{ suggestions: Suggestion[] }>
  }
}

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (name: string) => Promise<unknown>
        places?: PlacesLib
      }
    }
    __khaaoDexGooglePlacesPromise?: Promise<PlacesLib>
  }
}

const GWALIOR = { lat: 26.2025, lng: 78.1746 }

function loadPlaces(): Promise<PlacesLib> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"))
  if (window.google?.maps?.places?.AutocompleteSuggestion) {
    return Promise.resolve(window.google.maps.places)
  }
  if (window.__khaaoDexGooglePlacesPromise) return window.__khaaoDexGooglePlacesPromise

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"))

  window.__khaaoDexGooglePlacesPromise = new Promise<PlacesLib>((resolve, reject) => {
    const finish = async () => {
      try {
        await window.google?.maps?.importLibrary?.("places")
        const places = window.google?.maps?.places
        if (!places?.AutocompleteSuggestion) throw new Error("Places library did not load")
        resolve(places)
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Could not load Google Places"))
      }
    }
    const existing = document.getElementById("khaaodex-gmaps") as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", finish)
      existing.addEventListener("error", () => reject(new Error("Could not load Google Places")))
      return
    }
    const script = document.createElement("script")
    script.id = "khaaodex-gmaps"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places&loading=async`
    script.async = true
    script.onload = finish
    script.onerror = () => reject(new Error("Could not load Google Places"))
    document.head.appendChild(script)
  })
  return window.__khaaoDexGooglePlacesPromise
}

export default function PlaceAutocomplete({ onSelect }: PlaceAutocompleteProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const libRef = useRef<PlacesLib | null>(null)
  const tokenRef = useRef<object | null>(null)
  const seqRef = useRef(0)

  // Warm the library as soon as the field mounts so the first keystroke is quick.
  useEffect(() => {
    let alive = true
    loadPlaces()
      .then((lib) => {
        if (alive) libRef.current = lib
      })
      .catch((loadError: Error) => {
        if (alive) setError(loadError.message)
      })
    return () => {
      alive = false
    }
  }, [])

  const runSearch = useCallback(async (input: string) => {
    const seq = ++seqRef.current
    let lib = libRef.current
    if (!lib) {
      try {
        lib = await loadPlaces()
        libRef.current = lib
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load Google Places")
        return
      }
    }
    if (!tokenRef.current) tokenRef.current = new lib.AutocompleteSessionToken()
    setLoading(true)
    try {
      const { suggestions: raw } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: tokenRef.current,
        includedRegionCodes: ["in"],
        // Food places only — keeps localities like "Burari" out of the list.
        includedPrimaryTypes: ["restaurant", "cafe", "bakery", "bar", "meal_takeaway"],
        locationBias: { center: GWALIOR, radius: 40000 },
      })
      if (seq !== seqRef.current) return
      setSuggestions(raw.map((s) => s.placePrediction).filter((p): p is Prediction => Boolean(p)))
      setOpen(true)
    } catch {
      if (seq === seqRef.current) setError("Google search is unavailable right now.")
    } finally {
      if (seq === seqRef.current) setLoading(false)
    }
  }, [])

  // Debounce the lookups.
  useEffect(() => {
    const input = query.trim()
    if (picked || input.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const id = window.setTimeout(() => void runSearch(input), 220)
    return () => window.clearTimeout(id)
  }, [query, picked, runSearch])

  const choose = async (prediction: Prediction) => {
    setOpen(false)
    setLoading(true)
    setError(null)
    try {
      const place = prediction.toPlace()
      await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] })
      const name =
        typeof place.displayName === "string" ? place.displayName : place.displayName?.text ?? ""
      if (!place.id || !place.location || !name.trim()) {
        setError("Google didn't return full details for that place. Try another result.")
        return
      }
      setQuery(name.trim())
      setPicked(true)
      setSuggestions([])
      // A session ends when a place is picked; start fresh next time.
      tokenRef.current = null
      onSelect({
        googlePlaceId: place.id,
        name: name.trim(),
        address: place.formattedAddress ?? "",
        latitude: place.location.lat(),
        longitude: place.location.lng(),
      })
    } catch {
      setError("Couldn't fetch that place. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setQuery("")
    setPicked(false)
    setSuggestions([])
    setOpen(false)
    setError(null)
  }

  const showList = open && !picked && suggestions.length > 0
  const inputId = useMemo(() => `khaaodex-place-${Math.random().toString(36).slice(2, 8)}`, [])

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-teal-400" />
        <input
          id={inputId}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (picked) setPicked(false)
          }}
          onFocus={() => {
            if (!picked && suggestions.length > 0) setOpen(true)
          }}
          autoComplete="off"
          placeholder="Search for a restaurant…"
          className="h-11 w-full rounded-xl border border-black/10 bg-white/70 pl-9 pr-9 text-base outline-none focus:border-[#b34d66] sm:text-sm dark:border-white/15 dark:bg-white/5"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${inputId}-list`}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-teal-400" />
        ) : query ? (
          <button
            type="button"
            onClick={reset}
            aria-label="Clear"
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-teal-400 transition hover:bg-black/5 hover:text-muted-teal-700 dark:hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {showList && (
        <ul
          id={`${inputId}-list`}
          role="listbox"
          className="mt-1.5 max-h-60 overflow-y-auto overscroll-contain rounded-xl border border-black/10 bg-pale-oak-50 py-1 shadow-lg dark:border-white/15 dark:bg-muted-teal-900"
        >
          {suggestions.map((prediction, index) => {
            const main = prediction.mainText?.text ?? prediction.text?.text ?? "Unnamed place"
            const secondary = prediction.secondaryText?.text
            return (
              <li key={prediction.placeId ?? index} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => void choose(prediction)}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#b34d66]" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-muted-teal-900 dark:text-white">
                      {main}
                    </span>
                    {secondary && (
                      <span className="block truncate text-xs text-muted-teal-500 dark:text-muted-teal-400">
                        {secondary}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
          <li className="px-3 pt-1 text-right text-[10px] uppercase tracking-wide text-muted-teal-400">
            Powered by Google
          </li>
        </ul>
      )}

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
