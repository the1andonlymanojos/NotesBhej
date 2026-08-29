"use client"

import { useCallback, useState } from "react"
import { Loader2, X } from "lucide-react"
import { ApiHttpError, apiSubmitKhaaoDexRestaurant } from "@/lib/api/client"
import type { KhaaoDexCategory, KhaaoDexPriceCategory } from "@/lib/api/types"
import PlaceAutocomplete, { type SelectedGooglePlace } from "./place-autocomplete"
import { SURFACE, categoryLabel } from "./ui"

const categories: KhaaoDexCategory[] = [
  "CAFE",
  "QUICK_BITES",
  "NORTH_INDIAN",
  "SOUTH_INDIAN",
  "CHAAT",
  "SWEETS_BAKERY",
  "DESSERT_PLACE",
  "STREET_FOOD",
  "FINE_DINING",
]
const prices: KhaaoDexPriceCategory[] = ["BUDGET", "MODERATE", "PREMIUM", "LUXURY"]

export default function AddRestaurant({
  onClose,
  onCreated,
  onLogin,
}: {
  onClose: () => void
  onCreated: () => void
  onLogin: () => void
}) {
  const [place, setPlace] = useState<SelectedGooglePlace | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<KhaaoDexCategory[]>([])
  const [cuisine, setCuisine] = useState("")
  const [priceCategory, setPriceCategory] = useState<KhaaoDexPriceCategory | "">("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handlePlaceSelect = useCallback((selected: SelectedGooglePlace) => {
    setPlace(selected)
    setError(null)
  }, [])

  const toggleCategory = (category: KhaaoDexCategory) =>
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )

  const submit = async () => {
    if (!place || !place.name.trim()) {
      setError("Pick a restaurant from the Google search first.")
      return
    }
    if (!selectedCategories.length) {
      setError("Choose at least one category.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await apiSubmitKhaaoDexRestaurant({
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        googlePlaceId: place.googlePlaceId,
        categories: selectedCategories,
        cuisine: cuisine || undefined,
        priceCategory: priceCategory || undefined,
      })
      setSubmitted(true)
      onCreated()
    } catch (submissionError) {
      if (
        submissionError instanceof ApiHttpError &&
        (submissionError.status === 401 || submissionError.status === 403)
      ) {
        onLogin()
      } else {
        setError("Couldn’t submit this restaurant. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center overflow-y-auto bg-muted-teal-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section
        className={`${SURFACE} w-full max-w-lg overflow-hidden rounded-t-[26px] p-5 text-muted-teal-900 dark:text-white sm:rounded-[26px] sm:p-6`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#b34d66]">Grow the Dex</div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight">Add a restaurant</h2>
            <p className="mt-1 text-sm text-muted-teal-500 dark:text-muted-teal-400">
              Pick a real Google place. It joins the review queue before it appears on the map.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-teal-500 transition hover:bg-black/5 hover:text-muted-teal-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-5 rounded-2xl bg-[#b34d66]/10 p-5">
            <div className="text-base font-bold">Submitted for review ✓</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-teal-600 dark:text-muted-teal-300">
              A moderator will verify the place before it becomes part of the public Dex.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-xl bg-muted-teal-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-muted-teal-900"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-muted-teal-700 dark:text-pale-oak-200">
                Google place
              </label>
              <PlaceAutocomplete onSelect={handlePlaceSelect} />
              {place && (
                <div className="mt-2 rounded-xl bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
                  <div className="font-semibold">{place.name}</div>
                  <div className="mt-0.5 text-muted-teal-500 dark:text-muted-teal-400">{place.address}</div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-muted-teal-700 dark:text-pale-oak-200">
                Categories
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((category) => {
                  const active = selectedCategories.includes(category)
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                        active
                          ? "bg-muted-teal-900 text-white dark:bg-white dark:text-muted-teal-900"
                          : "bg-black/[0.05] text-muted-teal-600 hover:bg-black/[0.09] dark:bg-white/10 dark:text-muted-teal-300"
                      }`}
                    >
                      {categoryLabel(category)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-muted-teal-700 dark:text-pale-oak-200">
                Cuisine
                <input
                  value={cuisine}
                  onChange={(event) => setCuisine(event.target.value)}
                  placeholder="e.g. Indian"
                  className="mt-1.5 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm font-normal outline-none focus:border-[#b34d66] dark:border-white/15 dark:bg-white/5"
                />
              </label>
              <label className="text-sm font-medium text-muted-teal-700 dark:text-pale-oak-200">
                Price
                <select
                  value={priceCategory}
                  onChange={(event) => setPriceCategory(event.target.value as KhaaoDexPriceCategory | "")}
                  className="mt-1.5 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm font-normal outline-none focus:border-[#b34d66] dark:border-white/15 dark:bg-white/5"
                >
                  <option value="">Not sure</option>
                  {prices.map((price) => (
                    <option key={price} value={price}>
                      {categoryLabel(price)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b34d66] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3d52] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit restaurant
            </button>
          </>
        )}
      </section>
    </div>
  )
}
