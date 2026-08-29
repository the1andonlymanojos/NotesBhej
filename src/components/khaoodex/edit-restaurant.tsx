"use client"

import { useMemo, useState } from "react"
import { Loader2, X } from "lucide-react"
import { ApiHttpError, apiSubmitKhaaoDexEdit } from "@/lib/api/client"
import type {
  KhaaoDexCategory,
  KhaaoDexEditRequest,
  KhaaoDexPriceCategory,
  KhaaoDexRestaurant,
} from "@/lib/api/types"
import { SHEET, categoryLabel } from "./ui"

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

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join()

export default function EditRestaurant({
  restaurant,
  onClose,
  onLogin,
  onSubmitted,
}: {
  restaurant: KhaaoDexRestaurant
  onClose: () => void
  onLogin: () => void
  onSubmitted: () => void
}) {
  const [name, setName] = useState(restaurant.name ?? "")
  const [address, setAddress] = useState(restaurant.address ?? "")
  const [cuisine, setCuisine] = useState(restaurant.cuisine ?? "")
  const [priceCategory, setPriceCategory] = useState<KhaaoDexPriceCategory | "">(
    (restaurant.priceCategory as KhaaoDexPriceCategory) ?? "",
  )
  const [selectedCategories, setSelectedCategories] = useState<KhaaoDexCategory[]>(restaurant.categories ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const toggleCategory = (category: KhaaoDexCategory) =>
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )

  // Only send what the moderator would actually need to review.
  const patch = useMemo<KhaaoDexEditRequest>(() => {
    const body: KhaaoDexEditRequest = {}
    if (name.trim() && name.trim() !== restaurant.name) body.name = name.trim()
    if (address.trim() !== (restaurant.address ?? "")) body.address = address.trim()
    if (cuisine.trim() !== (restaurant.cuisine ?? "")) body.cuisine = cuisine.trim()
    if ((priceCategory || "") !== (restaurant.priceCategory ?? "")) {
      body.priceCategory = (priceCategory || undefined) as KhaaoDexPriceCategory | undefined
    }
    if (!sameSet(selectedCategories, restaurant.categories ?? [])) body.categories = selectedCategories
    return body
  }, [name, address, cuisine, priceCategory, selectedCategories, restaurant])

  const changeCount = Object.keys(patch).length

  const submit = async () => {
    if (changeCount === 0) {
      setError("Nothing has changed yet.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await apiSubmitKhaaoDexEdit(restaurant.id, patch)
      setSubmitted(true)
      onSubmitted()
    } catch (submissionError) {
      if (
        submissionError instanceof ApiHttpError &&
        (submissionError.status === 401 || submissionError.status === 403)
      ) {
        onLogin()
      } else {
        setError("Couldn’t submit this edit. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center overflow-y-auto bg-muted-teal-950/55 p-0 duration-150 animate-in fade-in sm:items-center sm:p-4">
      <section
        className={`${SHEET} w-full max-w-lg overflow-hidden rounded-t-[26px] p-5 text-muted-teal-900 duration-200 ease-out animate-in slide-in-from-bottom-8 dark:text-white sm:rounded-[26px] sm:p-6 sm:slide-in-from-bottom-4`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#b34d66]">Fix the Dex</div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight">Suggest an edit</h2>
            <p className="mt-1 text-sm text-muted-teal-500 dark:text-muted-teal-400">
              A moderator reviews changes before they go live.
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
            <div className="text-base font-bold">Sent for review ✓</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-teal-600 dark:text-muted-teal-300">
              Thanks — a moderator will take a look.
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
            <div className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-muted-teal-700 dark:text-pale-oak-200">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm font-normal outline-none focus:border-[#b34d66] dark:border-white/15 dark:bg-white/5"
                />
              </label>
              <label className="block text-sm font-medium text-muted-teal-700 dark:text-pale-oak-200">
                Address
                <textarea
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="mt-1.5 min-h-16 w-full resize-none rounded-xl border border-black/10 bg-white/70 p-2.5 text-sm font-normal outline-none focus:border-[#b34d66] dark:border-white/15 dark:bg-white/5"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
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
                    <option value="">Not set</option>
                    {prices.map((price) => (
                      <option key={price} value={price}>
                        {categoryLabel(price)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4">
              <span className="mb-1.5 block text-sm font-medium text-muted-teal-700 dark:text-pale-oak-200">
                Categories
              </span>
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

            {error && (
              <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={submitting || changeCount === 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b34d66] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3d52] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {changeCount === 0 ? "No changes yet" : `Submit ${changeCount} change${changeCount > 1 ? "s" : ""}`}
            </button>
          </>
        )}
      </section>
    </div>
  )
}
