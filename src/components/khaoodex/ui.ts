// Shared visual language for the KhaaoDex surface — one card style, one accent,
// so the floating chrome reads as a single system instead of a pile of stickers.

/** wine-plum — the "you've been here" accent, used sparingly for primary actions. */
export const ACCENT = "#b34d66"
export const ACCENT_HOVER = "#8f3d52"

/** The one floating-panel treatment: frosted card, hairline border, soft lift. */
export const SURFACE =
  "border border-pale-oak-950/[0.08] bg-pale-oak-50/90 shadow-lg shadow-pale-oak-950/[0.06] backdrop-blur-xl dark:border-white/10 dark:bg-muted-teal-900/85"

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
