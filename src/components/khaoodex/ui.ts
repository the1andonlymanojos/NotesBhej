// Shared visual language for the KhaaoDex surface — one card style, one accent,
// so the floating chrome reads as a single system instead of a pile of stickers.

export const ACCENT = "#ef7d57"

/** The one floating-panel treatment: frosted card, hairline border, soft lift. */
export const SURFACE =
  "border border-black/[0.07] bg-white/90 shadow-lg shadow-black/[0.06] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/85"

export function categoryLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function priceLabel(price?: string | null) {
  if (!price) return null
  return price.charAt(0) + price.slice(1).toLowerCase()
}

/**
 * Google Maps "Directions" deep link. Uses the stored Place ID when we have one
 * (most accurate), otherwise falls back to the coordinates.
 * https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function googleDirectionsUrl(place: {
  name: string
  latitude: number
  longitude: number
  googlePlaceId?: string | null
}) {
  const params = new URLSearchParams({ api: "1" })
  if (place.googlePlaceId) {
    params.set("destination", place.name)
    params.set("destination_place_id", place.googlePlaceId)
  } else {
    params.set("destination", `${place.latitude},${place.longitude}`)
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
