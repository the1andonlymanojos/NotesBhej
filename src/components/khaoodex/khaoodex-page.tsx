"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  ArrowUpRight,
  Compass,
  Loader2,
  MapPinned,
  Moon,
  Navigation,
  Plus,
  Sparkles,
  Star,
  Sun,
  Utensils,
  X,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import {
  ApiHttpError,
  apiDeleteKhaaoDexReview,
  apiGetKhaaoDexMyDex,
  apiGetKhaaoDexRestaurantDetails,
  apiGetKhaaoDexRestaurants,
  apiUpdateKhaaoDexRelationship,
  apiUpsertKhaaoDexReview,
} from "@/lib/api/client"
import type { KhaaoDexCategory, KhaaoDexRestaurant, KhaaoDexReview } from "@/lib/api/types"
import KhaaoDexMap from "./khaoodex-map"
import AddRestaurant from "./add-restaurant"
import { mapThemes, type KhaaoDexTheme } from "./themes"
import { SURFACE, categoryLabel, googleDirectionsUrl, priceLabel } from "./ui"

type RatingKey = "overallRating" | "valueForMoneyRating" | "foodQualityRating" | "ambienceRating"
type ReviewDraft = Record<RatingKey, number | ""> & { text: string }

const ratingLabels: Array<{ key: RatingKey; label: string }> = [
  { key: "overallRating", label: "Overall" },
  { key: "foodQualityRating", label: "Food" },
  { key: "valueForMoneyRating", label: "Value" },
  { key: "ambienceRating", label: "Ambience" },
]

const categoryColors = ["#f59e0b", "#fb7185", "#34d399", "#a78bfa", "#38bdf8"]
const categoryOptions: KhaaoDexCategory[] = [
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

const emptyDraft = (): ReviewDraft => ({
  overallRating: "",
  valueForMoneyRating: "",
  foodQualityRating: "",
  ambienceRating: "",
  text: "",
})

const draftFromReview = (review?: KhaaoDexReview | null): ReviewDraft => ({
  overallRating: review?.overallRating ?? "",
  valueForMoneyRating: review?.valueForMoneyRating ?? "",
  foodQualityRating: review?.foodQualityRating ?? "",
  ambienceRating: review?.ambienceRating ?? "",
  text: review?.text ?? "",
})

function isAuthError(error: unknown) {
  return error instanceof ApiHttpError && (error.status === 401 || error.status === 403)
}

/* ------------------------------------------------------------------ shell --- */

/** One panel treatment: bottom sheet on phones, a floating card on the left on desktop. */
function Panel({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-[590] bg-neutral-950/25 backdrop-blur-[1px] sm:hidden"
      />
      <aside
        aria-label={label}
        className={`${SURFACE} fixed inset-x-0 bottom-0 z-[600] flex max-h-[86svh] flex-col overflow-hidden rounded-t-[26px] sm:inset-auto sm:bottom-4 sm:left-4 sm:top-auto sm:max-h-[calc(100svh-2rem)] sm:w-[384px] sm:rounded-[26px]`}
      >
        <div className="relative shrink-0">
          <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full text-neutral-500 transition hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2 sm:pt-4">
          {children}
        </div>
      </aside>
    </>
  )
}

function StarRow({ value }: { value?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold">
      <Star className="size-4 fill-amber-400 text-amber-400" />
      {typeof value === "number" ? value.toFixed(1) : "—"}
    </span>
  )
}

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | ""
  onChange: (value: number | "") => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(value === rating ? "" : rating)}
            className="rounded p-1 transition hover:scale-110"
            aria-label={`${label}: ${rating} star${rating > 1 ? "s" : ""}`}
          >
            <Star
              className={`size-5 ${
                typeof value === "number" && rating <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-neutral-300 dark:text-neutral-600"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- details --- */

function RestaurantDetails({
  restaurant,
  reviews,
  loading,
  draft,
  savingVisit,
  savingReview,
  deletingReview,
  error,
  onVisit,
  onDraftChange,
  onReviewSubmit,
  onDeleteReview,
}: {
  restaurant: KhaaoDexRestaurant
  reviews: KhaaoDexReview[]
  loading: boolean
  draft: ReviewDraft
  savingVisit: boolean
  savingReview: boolean
  deletingReview: boolean
  error: string | null
  onVisit: () => void
  onDraftChange: (key: keyof ReviewDraft, value: number | "" | string) => void
  onReviewSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onDeleteReview: () => void
}) {
  const visited = Boolean(restaurant.relationship?.review || restaurant.relationship?.visited)
  const summary =
    restaurant.cuisine ||
    restaurant.categories?.map(categoryLabel).join(" · ") ||
    "Cuisine not listed"

  return (
    <div>
      <div className="pr-8">
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">{restaurant.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-neutral-500 dark:text-neutral-400">
          <span>{summary}</span>
          {priceLabel(restaurant.priceCategory) && (
            <>
              <span aria-hidden>·</span>
              <span>{priceLabel(restaurant.priceCategory)}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <StarRow value={restaurant.averageRating} />
          <span className="text-neutral-400 dark:text-neutral-500">({restaurant.reviewCount})</span>
        </div>
      </div>

      {restaurant.categories?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {restaurant.categories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-[#ef7d57]/12 px-2.5 py-1 text-xs font-semibold text-[#c1502f] dark:text-[#f0a184]"
            >
              {categoryLabel(category)}
            </span>
          ))}
        </div>
      )}

      {restaurant.address && (
        <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{restaurant.address}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onVisit}
          disabled={savingVisit}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
            visited
              ? "bg-[#ef7d57] text-white hover:bg-[#e06b45]"
              : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          }`}
        >
          {savingVisit ? <Loader2 className="size-4 animate-spin" /> : null}
          {visited ? "Visited" : "Mark visited"}
        </button>
        <a
          href={googleDirectionsUrl(restaurant)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white/70 px-3 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:hover:bg-white/10"
        >
          <Navigation className="size-4" />
          Directions
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-neutral-400">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <section className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Reviews</h3>
              <span className="text-xs text-neutral-400">{restaurant.reviewCount} total</span>
            </div>
            {reviews.length === 0 ? (
              <p className="rounded-xl border border-dashed border-black/10 p-3 text-sm text-neutral-500 dark:border-white/15 dark:text-neutral-400">
                No reviews yet — be the first to log this place.
              </p>
            ) : (
              <div className="space-y-2">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <div className="flex items-center justify-between text-sm font-semibold text-neutral-900 dark:text-white">
                      <span>{review.userName}</span>
                      <StarRow value={review.overallRating} />
                    </div>
                    {review.text && (
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {review.text}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Your review</h3>
              {restaurant.relationship?.review && (
                <button
                  type="button"
                  onClick={onDeleteReview}
                  disabled={deletingReview}
                  className="text-xs font-semibold text-[#c1502f] hover:underline dark:text-[#f0a184]"
                >
                  {deletingReview ? "Removing…" : "Delete"}
                </button>
              )}
            </div>
            <form onSubmit={onReviewSubmit} className="space-y-3 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
              {ratingLabels.map(({ key, label }) => (
                <RatingInput
                  key={key}
                  label={label}
                  value={draft[key] as number | ""}
                  onChange={(value) => onDraftChange(key, value)}
                />
              ))}
              <Textarea
                value={draft.text}
                onChange={(event) => onDraftChange("text", event.target.value)}
                placeholder="What should a friend know?"
                className="min-h-20 resize-none border-black/10 bg-white/70 dark:border-white/15 dark:bg-white/5"
              />
              <button
                type="submit"
                disabled={savingReview}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ef7d57] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e06b45] disabled:opacity-60"
              >
                {savingReview ? <Loader2 className="size-4 animate-spin" /> : null}
                {restaurant.relationship?.review ? "Update review" : "Save review"}
              </button>
            </form>
          </section>
        </>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------- page --- */

export default function KhaaoDexPage() {
  const router = useRouter()
  // The map theme follows the site theme (next-themes) so the map and the panels
  // never disagree. "Matrix" is an opt-in extra that only restyles the map.
  const { resolvedTheme, setTheme: setSiteTheme } = useTheme()
  const [matrixMode, setMatrixMode] = useState(false)
  const theme: KhaaoDexTheme = matrixMode ? "matrix" : resolvedTheme === "dark" ? "dark" : "light"
  const selectMapTheme = useCallback(
    (next: KhaaoDexTheme) => {
      if (next === "matrix") {
        setMatrixMode(true)
        return
      }
      setMatrixMode(false)
      setSiteTheme(next)
    },
    [setSiteTheme],
  )

  const [restaurants, setRestaurants] = useState<KhaaoDexRestaurant[]>([])
  const [selectedCategories, setSelectedCategories] = useState<KhaaoDexCategory[]>([])
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [details, setDetails] = useState<{ restaurant: KhaaoDexRestaurant; reviews: KhaaoDexReview[] } | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [dexOpen, setDexOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [dex, setDex] = useState<Awaited<ReturnType<typeof apiGetKhaaoDexMyDex>> | null>(null)
  const [dexLoading, setDexLoading] = useState(false)
  const [dexError, setDexError] = useState<string | null>(null)
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingVisit, setSavingVisit] = useState(false)
  const [savingReview, setSavingReview] = useState(false)
  const [deletingReview, setDeletingReview] = useState(false)
  const colors = mapThemes[theme]

  const selectedRestaurant =
    details?.restaurant ?? restaurants.find((restaurant) => restaurant.id === selectedId) ?? null
  const visitedIds = useMemo(
    () =>
      new Set(
        (dex?.visitedRestaurants ?? restaurants.filter((restaurant) => restaurant.relationship?.visited)).map(
          (restaurant) => restaurant.id,
        ),
      ),
    [dex, restaurants],
  )
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { total: number; visited: number }>()
    restaurants.forEach((restaurant) => {
      const categoriesForRestaurant = restaurant.categories?.length ? restaurant.categories : ["OTHER"]
      categoriesForRestaurant.forEach((category) => {
        const entry = categoryMap.get(category) ?? { total: 0, visited: 0 }
        entry.total += 1
        if (visitedIds.has(restaurant.id)) entry.visited += 1
        categoryMap.set(category, entry)
      })
    })
    return [...categoryMap.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, stats], index) => ({ name, ...stats, color: categoryColors[index] }))
  }, [restaurants, visitedIds])
  const visitedCount = dex?.visitedCount ?? visitedIds.size
  const totalActive = dex?.totalActiveRestaurants ?? restaurants.length
  const completion = dex?.explorationPercentage ?? (totalActive ? (visitedCount / totalActive) * 100 : 0)

  const loadRestaurants = useCallback(async (categories: KhaaoDexCategory[]) => {
    setMapLoading(true)
    setMapError(null)
    try {
      setRestaurants(await apiGetKhaaoDexRestaurants({ categories }))
    } catch {
      setMapError("Couldn’t load the Gwalior map. Check your connection and try again.")
    } finally {
      setMapLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRestaurants([])
  }, [loadRestaurants])

  useEffect(() => {
    if (selectedId == null) return
    setDetailsLoading(true)
    setActionError(null)
    apiGetKhaaoDexRestaurantDetails(selectedId)
      .then((result) => {
        setDetails(result)
        setDraft(draftFromReview(result.restaurant.relationship?.review))
      })
      .catch(() => setActionError("Couldn’t load this restaurant right now."))
      .finally(() => setDetailsLoading(false))
  }, [selectedId])

  const selectRestaurant = useCallback((restaurantId: number) => setSelectedId(restaurantId), [])
  const closeDetails = useCallback(() => {
    setSelectedId(null)
    setDetails(null)
  }, [])

  const openDex = async () => {
    setDexOpen(true)
    setDexError(null)
    setDexLoading(true)
    try {
      setDex(await apiGetKhaaoDexMyDex())
    } catch (error) {
      if (!isAuthError(error)) setDexError("Sign in to open your personal Dex.")
    } finally {
      setDexLoading(false)
    }
  }

  const login = () => router.push(`/nextlogin?redirect=${encodeURIComponent("/khao-dex")}`)

  const toggleCategory = (category: KhaaoDexCategory) => {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category]
    setSelectedCategories(next)
    loadRestaurants(next)
  }

  const clearCategories = () => {
    if (selectedCategories.length === 0) return
    setSelectedCategories([])
    loadRestaurants([])
  }

  const handleVisit = async () => {
    if (!selectedRestaurant) return
    setSavingVisit(true)
    setActionError(null)
    try {
      const relationship = await apiUpdateKhaaoDexRelationship(selectedRestaurant.id, {
        visited: !selectedRestaurant.relationship?.visited,
      })
      setRestaurants((current) =>
        current.map((restaurant) =>
          restaurant.id === selectedRestaurant.id ? { ...restaurant, relationship } : restaurant,
        ),
      )
      setDetails((current) =>
        current ? { ...current, restaurant: { ...current.restaurant, relationship } } : current,
      )
      if (dexOpen) setDex(await apiGetKhaaoDexMyDex())
    } catch (error) {
      if (isAuthError(error)) login()
      else setActionError("Couldn’t update your visited status.")
    } finally {
      setSavingVisit(false)
    }
  }

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRestaurant) return
    const body = Object.fromEntries(
      Object.entries(draft).filter(([, value]) => value !== "" && value !== undefined),
    ) as Record<string, string | number>
    if (Object.keys(body).length === 0) {
      setActionError("Add a rating or a note before saving.")
      return
    }
    setSavingReview(true)
    setActionError(null)
    try {
      await apiUpsertKhaaoDexReview(selectedRestaurant.id, {
        ...body,
        text: draft.text || null,
      } as Parameters<typeof apiUpsertKhaaoDexReview>[1])
      const fresh = await apiGetKhaaoDexRestaurantDetails(selectedRestaurant.id)
      setDetails(fresh)
      setRestaurants((current) =>
        current.map((restaurant) => (restaurant.id === selectedRestaurant.id ? fresh.restaurant : restaurant)),
      )
      setDraft(draftFromReview(fresh.restaurant.relationship?.review))
    } catch (error) {
      if (isAuthError(error)) login()
      else setActionError("Couldn’t save your review.")
    } finally {
      setSavingReview(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!selectedRestaurant || !window.confirm("Remove your review?")) return
    setDeletingReview(true)
    setActionError(null)
    try {
      await apiDeleteKhaaoDexReview(selectedRestaurant.id)
      const fresh = await apiGetKhaaoDexRestaurantDetails(selectedRestaurant.id)
      setDetails(fresh)
      setRestaurants((current) =>
        current.map((restaurant) => (restaurant.id === selectedRestaurant.id ? fresh.restaurant : restaurant)),
      )
      setDraft(emptyDraft())
    } catch (error) {
      if (isAuthError(error)) login()
      else setActionError("Couldn’t remove your review.")
    } finally {
      setDeletingReview(false)
    }
  }

  const chipBase =
    "shrink-0 snap-start rounded-full px-3.5 py-2 text-[13px] font-semibold shadow-sm backdrop-blur-md transition"
  const chipOn = "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
  const chipOff =
    "border border-black/[0.06] bg-white/90 text-neutral-600 hover:text-neutral-900 dark:border-white/10 dark:bg-neutral-900/85 dark:text-neutral-300 dark:hover:text-white"
  const styleButtons: Array<{ value: KhaaoDexTheme; icon: typeof Sun; label: string }> = [
    { value: "light", icon: Sun, label: "Light map" },
    { value: "dark", icon: Moon, label: "Dark map" },
    { value: "matrix", icon: Sparkles, label: "Matrix map" },
  ]

  return (
    <main
      className="relative h-[100svh] min-h-[600px] overflow-hidden"
      style={{ background: colors.page, color: colors.text }}
    >
      <KhaaoDexMap
        theme={theme}
        restaurants={restaurants}
        selectedId={selectedId}
        onRestaurantSelect={selectRestaurant}
      />

      {/* Top: one bar — identity on the left, actions on the right. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col items-center gap-2 p-3">
        <div
          className={`${SURFACE} pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl p-1.5 pl-2.5`}
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#ef7d57] text-white">
            <Utensils className="size-4" />
          </div>
          <div className="mr-auto text-[15px] font-bold tracking-tight text-neutral-900 dark:text-white">
            Khaao<span className="text-[#ef7d57]">Dex</span>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-[#ef7d57] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#e06b45]"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
          <button
            onClick={openDex}
            className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Compass className="size-4" />
            <span className="hidden sm:inline">My Dex</span>
          </button>
        </div>

        {/* Category filter — one scrolling row, "All" resets it. */}
        <div className="pointer-events-auto w-full max-w-2xl">
          <div className="flex snap-x gap-1.5 overflow-x-auto pb-1 pr-8 [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,#000_88%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={clearCategories}
              className={`${chipBase} ${selectedCategories.length === 0 ? chipOn : chipOff}`}
            >
              All
            </button>
            {categoryOptions.map((category) => {
              const active = selectedCategories.includes(category)
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`${chipBase} ${active ? chipOn : chipOff}`}
                >
                  {categoryLabel(category)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Status + legend, bottom-left. */}
      <div className="pointer-events-none absolute bottom-4 left-3 z-[500] flex flex-col gap-2">
        {!mapLoading && !mapError && (
          <div
            className={`${SURFACE} pointer-events-auto flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300`}
          >
            <span className="font-semibold text-neutral-900 dark:text-white">{totalActive}</span> places
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#ef7d57]" />
              {visitedCount} visited
            </span>
          </div>
        )}
        <div className={`${SURFACE} pointer-events-auto flex w-fit items-center gap-0.5 rounded-full p-1`}>
          {styleButtons.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => selectMapTheme(value)}
              aria-label={label}
              aria-pressed={theme === value}
              className={`grid size-8 place-items-center rounded-full transition ${
                theme === value
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {mapLoading && (
        <div
          className={`${SURFACE} pointer-events-none absolute left-1/2 top-1/2 z-[400] -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200`}
        >
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Finding Gwalior’s places…
        </div>
      )}
      {mapError && (
        <div className="absolute left-1/2 top-24 z-[500] w-[min(90vw,22rem)] -translate-x-1/2 rounded-2xl bg-red-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
          {mapError}
          <button onClick={() => loadRestaurants(selectedCategories)} className="mt-1 block w-full text-xs underline">
            Retry
          </button>
        </div>
      )}

      {selectedRestaurant && (
        <Panel label={`${selectedRestaurant.name} details`} onClose={closeDetails}>
          <RestaurantDetails
            restaurant={selectedRestaurant}
            reviews={details?.reviews ?? []}
            loading={detailsLoading}
            draft={draft}
            savingVisit={savingVisit}
            savingReview={savingReview}
            deletingReview={deletingReview}
            error={actionError}
            onVisit={handleVisit}
            onDraftChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
            onReviewSubmit={handleReviewSubmit}
            onDeleteReview={handleDeleteReview}
          />
        </Panel>
      )}

      {addOpen && (
        <AddRestaurant
          onClose={() => setAddOpen(false)}
          onLogin={login}
          onCreated={() => loadRestaurants(selectedCategories)}
        />
      )}

      {dexOpen && (
        <Panel label="My Dex" onClose={() => setDexOpen(false)}>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#ef7d57]">
            <Sparkles className="size-3.5" /> Your collection
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">My Dex</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            The places you’ve found around Gwalior.
          </p>

          {dexLoading ? (
            <div className="flex justify-center py-14 text-neutral-400">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : dexError ? (
            <div className="mt-6 rounded-2xl bg-black/[0.03] p-5 dark:bg-white/[0.04]">
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{dexError}</p>
              <button
                onClick={login}
                className="mt-4 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900"
              >
                Take me to login
              </button>
            </div>
          ) : (
            <>
              <section
                className="mt-5 rounded-2xl p-5 text-white"
                style={{ background: theme === "matrix" ? "#173c2b" : "#27313a" }}
              >
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-4xl font-bold tracking-tight">{completion.toFixed(0)}%</div>
                    <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-white/55">
                      dex complete
                    </div>
                  </div>
                  <MapPinned className="size-7 text-[#ef7d57]" />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-[#ef7d57]"
                    style={{ width: `${Math.min(completion, 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-white/60">
                  <span>{visitedCount} visited</span>
                  <span>{totalActive} active places</span>
                </div>
              </section>

              <section className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">{visitedCount}</div>
                  <div className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    places visited
                  </div>
                </div>
                <div className="rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {Math.max(totalActive - visitedCount, 0)}
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">still to try</div>
                </div>
              </section>

              <section className="mt-6">
                <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">Category progress</h2>
                <div className="space-y-2.5">
                  {categories.length === 0 ? (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Category stats appear as restaurants load.
                    </p>
                  ) : (
                    categories.map((category) => (
                      <div key={category.name}>
                        <div className="mb-1 flex justify-between text-sm font-medium text-neutral-700 dark:text-neutral-200">
                          <span>{categoryLabel(category.name)}</span>
                          <span className="text-neutral-400">
                            {category.visited}/{category.total}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${category.total ? (category.visited / category.total) * 100 : 0}%`,
                              background: category.color,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="mt-6">
                <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">Your discoveries</h2>
                {dex?.visitedRestaurants.length ? (
                  <div className="space-y-1.5">
                    {dex.visitedRestaurants.slice(0, 8).map((restaurant) => (
                      <button
                        key={restaurant.id}
                        onClick={() => {
                          setDexOpen(false)
                          setSelectedId(restaurant.id)
                        }}
                        className="flex w-full items-center justify-between rounded-xl bg-black/[0.03] p-3 text-left transition hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                      >
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {restaurant.name}
                          <span className="mt-0.5 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
                            {restaurant.categories?.map(categoryLabel).join(" · ") ||
                              restaurant.cuisine ||
                              "Category not listed"}
                          </span>
                        </span>
                        <ArrowUpRight className="size-4 shrink-0 text-neutral-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-black/10 p-4 text-sm leading-relaxed text-neutral-500 dark:border-white/15 dark:text-neutral-400">
                    Your visited places will show up here as you explore.
                  </p>
                )}
              </section>
            </>
          )}
        </Panel>
      )}
    </main>
  )
}
