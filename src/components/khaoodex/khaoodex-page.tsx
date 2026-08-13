"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Compass, Loader2, MapPinned, Search, Sparkles, Star, Utensils, X } from "lucide-react"
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
import { mapThemes, type KhaaoDexTheme } from "./themes"

type RatingKey = "overallRating" | "valueForMoneyRating" | "foodQualityRating" | "ambienceRating"
type ReviewDraft = Record<RatingKey, number | ""> & { text: string }

const ratingLabels: Array<{ key: RatingKey; label: string }> = [
  { key: "overallRating", label: "Overall" },
  { key: "foodQualityRating", label: "Food" },
  { key: "valueForMoneyRating", label: "Value" },
  { key: "ambienceRating", label: "Ambience" },
]

const categoryColors = ["#f59e0b", "#fb7185", "#34d399", "#a78bfa", "#38bdf8"]
const categoryOptions: KhaaoDexCategory[] = ["CAFE", "QUICK_BITES", "NORTH_INDIAN", "CHAAT", "SWEETS_BAKERY", "DESSERT_PLACE", "STREET_FOOD", "FINE_DINING", "SOUTH_INDIAN"]

function categoryLabel(category: string) {
  return category.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}

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

function priceLabel(price?: string | null) {
  return price ? price.charAt(0) + price.slice(1).toLowerCase() : "Price not listed"
}

function RatingInput({ label, value, onChange }: { label: string; value: number | ""; onChange: (value: number | "") => void }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] opacity-55">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button key={rating} type="button" onClick={() => onChange(rating)} className="rounded p-0.5 transition hover:scale-110" aria-label={`${label}: ${rating} stars`}>
            <Star className={`size-4 ${typeof value === "number" && rating <= value ? "fill-[#f59e0b] text-[#f59e0b]" : "text-current opacity-25"}`} />
          </button>
        ))}
      </div>
    </div>
  )
}

function RestaurantDetails({
  restaurant,
  reviews,
  loading,
  draft,
  savingVisit,
  savingReview,
  deletingReview,
  error,
  onClose,
  onVisit,
  onDraftChange,
  onReviewSubmit,
  onDeleteReview,
}: {
  restaurant: KhaaoDexRestaurant | null
  reviews: KhaaoDexReview[]
  loading: boolean
  draft: ReviewDraft
  savingVisit: boolean
  savingReview: boolean
  deletingReview: boolean
  error: string | null
  onClose: () => void
  onVisit: () => void
  onDraftChange: (key: keyof ReviewDraft, value: number | "" | string) => void
  onReviewSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onDeleteReview: () => void
}) {
  if (!restaurant) return null

  return (
    <aside className="absolute inset-y-0 right-0 z-[900] w-full max-w-[460px] overflow-y-auto border-l border-white/50 bg-[#f8f7f1]/95 p-5 text-[#27313a] shadow-2xl backdrop-blur-2xl dark:bg-[#101719]/95 dark:text-[#e9f1ec] sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#ef7d57]">Restaurant details</div><h2 className="text-2xl font-black tracking-[-0.05em]">{restaurant.name}</h2></div>
        <button onClick={onClose} className="rounded-full p-2 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label="Close restaurant details"><X className="size-5" /></button>
      </div>

      <div className="mt-5 rounded-3xl bg-white/70 p-4 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold opacity-65">{restaurant.cuisine || restaurant.categories?.map(categoryLabel).join(" · ") || "Cuisine not listed"} · {priceLabel(restaurant.priceCategory)}</div><div className="flex items-center gap-1 font-black"><Star className="size-4 fill-[#f59e0b] text-[#f59e0b]" /> {restaurant.averageRating?.toFixed(1) || "—"}</div></div>
        {restaurant.categories?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{restaurant.categories.map((category) => <span key={category} className="rounded-full bg-[#ef7d57]/10 px-2 py-1 text-[10px] font-bold text-[#d95f42]">{categoryLabel(category)}</span>)}</div>}
        <p className="mt-2 text-sm leading-6 opacity-60">{restaurant.address || "Address not listed"}</p>
        <button onClick={onVisit} disabled={savingVisit} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${restaurant.relationship?.visited ? "bg-[#ef7d57] text-white" : "bg-[#27313a] text-white dark:bg-white dark:text-[#172026]"}`}>
          {savingVisit && <Loader2 className="size-4 animate-spin" />}{restaurant.relationship?.visited ? "Visited ✓" : "Mark as visited"}
        </button>
      </div>

      {loading ? <div className="flex items-center justify-center py-10 opacity-60"><Loader2 className="size-5 animate-spin" /></div> : <>
        <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h3 className="font-black">Trusted reviews</h3><span className="text-xs opacity-50">{restaurant.reviewCount} total</span></div>{reviews.length === 0 ? <p className="rounded-2xl border border-dashed border-black/15 p-4 text-sm opacity-55 dark:border-white/20">No reviews yet. Be the first person to log this place.</p> : <div className="space-y-3">{reviews.map((review) => <article key={review.id} className="rounded-2xl bg-white/60 p-4 dark:bg-white/5"><div className="flex justify-between gap-3 text-sm font-bold"><span>{review.userName}</span><span className="flex items-center gap-1"><Star className="size-3 fill-[#f59e0b] text-[#f59e0b]" /> {review.overallRating ?? "—"}</span></div>{review.text && <p className="mt-2 text-sm leading-6 opacity-65">{review.text}</p>}</article>)}</div>}</section>

        <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h3 className="font-black">Your review</h3>{restaurant.relationship?.review && <button type="button" onClick={onDeleteReview} disabled={deletingReview} className="text-xs font-bold text-[#d95f42] hover:underline">{deletingReview ? "Removing…" : "Delete"}</button>}</div><form onSubmit={onReviewSubmit} className="space-y-4 rounded-3xl bg-white/60 p-4 dark:bg-white/5">{ratingLabels.map(({ key, label }) => <RatingInput key={key} label={label} value={draft[key] as number | ""} onChange={(value) => onDraftChange(key, value)} />)}<Textarea value={draft.text} onChange={(event) => onDraftChange("text", event.target.value)} placeholder="What should a trusted friend know?" className="min-h-24 resize-none bg-white/50 dark:bg-black/10" /><button type="submit" disabled={savingReview} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ef7d57] px-4 py-3 text-sm font-black text-white">{savingReview && <Loader2 className="size-4 animate-spin" />} {restaurant.relationship?.review ? "Update review" : "Save review"}</button></form></section>
      </>}
      {error && <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}
    </aside>
  )
}

export default function KhaaoDexPage() {
  const router = useRouter()
  const [theme, setTheme] = useState<KhaaoDexTheme>("light")
  const [restaurants, setRestaurants] = useState<KhaaoDexRestaurant[]>([])
  const [selectedCategories, setSelectedCategories] = useState<KhaaoDexCategory[]>([])
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [details, setDetails] = useState<{ restaurant: KhaaoDexRestaurant; reviews: KhaaoDexReview[] } | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [dexOpen, setDexOpen] = useState(false)
  const [dex, setDex] = useState<Awaited<ReturnType<typeof apiGetKhaaoDexMyDex>> | null>(null)
  const [dexLoading, setDexLoading] = useState(false)
  const [dexError, setDexError] = useState<string | null>(null)
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingVisit, setSavingVisit] = useState(false)
  const [savingReview, setSavingReview] = useState(false)
  const [deletingReview, setDeletingReview] = useState(false)
  const colors = mapThemes[theme]

  const selectedRestaurant = details?.restaurant ?? restaurants.find((restaurant) => restaurant.id === selectedId) ?? null
  const visitedIds = useMemo(() => new Set((dex?.visitedRestaurants ?? restaurants.filter((restaurant) => restaurant.relationship?.visited)).map((restaurant) => restaurant.id)), [dex, restaurants])
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
    return [...categoryMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5).map(([name, stats], index) => ({ name, ...stats, color: categoryColors[index] }))
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
      setMapError("Could not load the Gwalior restaurant map.")
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
    apiGetKhaaoDexRestaurantDetails(selectedId).then((result) => { setDetails(result); setDraft(draftFromReview(result.restaurant.relationship?.review)) }).catch(() => setActionError("Could not load this restaurant right now.")).finally(() => setDetailsLoading(false))
  }, [selectedId])

  const selectRestaurant = useCallback((restaurantId: number) => setSelectedId(restaurantId), [])

  const openDex = async () => {
    setDexOpen(true)
    setDexError(null)
    setDexLoading(true)
    try { setDex(await apiGetKhaaoDexMyDex()) } catch (error) { if (!isAuthError(error)) setDexError("Sign in to open your personal Dex.") } finally { setDexLoading(false) }
  }

  const login = () => router.push(`/nextlogin?redirect=${encodeURIComponent("/khao-dex")}`)

  const toggleCategory = (category: KhaaoDexCategory) => {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category]
    setSelectedCategories(next)
    loadRestaurants(next)
  }

  const handleVisit = async () => {
    if (!selectedRestaurant) return
    setSavingVisit(true); setActionError(null)
    try {
      const relationship = await apiUpdateKhaaoDexRelationship(selectedRestaurant.id, { visited: !selectedRestaurant.relationship?.visited })
      setRestaurants((current) => current.map((restaurant) => restaurant.id === selectedRestaurant.id ? { ...restaurant, relationship } : restaurant))
      setDetails((current) => current ? { ...current, restaurant: { ...current.restaurant, relationship } } : current)
      if (dexOpen) setDex(await apiGetKhaaoDexMyDex())
    } catch (error) { if (isAuthError(error)) login(); else setActionError("Could not update your visited status.") } finally { setSavingVisit(false) }
  }

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRestaurant) return
    const body = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "" && value !== undefined)) as Record<string, string | number>
    if (Object.keys(body).length === 0) { setActionError("Add a rating or a note before saving."); return }
    setSavingReview(true); setActionError(null)
    try {
      await apiUpsertKhaaoDexReview(selectedRestaurant.id, { ...body, text: draft.text || null } as Parameters<typeof apiUpsertKhaaoDexReview>[1])
      const fresh = await apiGetKhaaoDexRestaurantDetails(selectedRestaurant.id)
      setDetails(fresh); setRestaurants((current) => current.map((restaurant) => restaurant.id === selectedRestaurant.id ? fresh.restaurant : restaurant)); setDraft(draftFromReview(fresh.restaurant.relationship?.review))
    } catch (error) { if (isAuthError(error)) login(); else setActionError("Could not save your review.") } finally { setSavingReview(false) }
  }

  const handleDeleteReview = async () => {
    if (!selectedRestaurant || !window.confirm("Remove your review?")) return
    setDeletingReview(true); setActionError(null)
    try { await apiDeleteKhaaoDexReview(selectedRestaurant.id); const fresh = await apiGetKhaaoDexRestaurantDetails(selectedRestaurant.id); setDetails(fresh); setRestaurants((current) => current.map((restaurant) => restaurant.id === selectedRestaurant.id ? fresh.restaurant : restaurant)); setDraft(emptyDraft()) } catch (error) { if (isAuthError(error)) login(); else setActionError("Could not remove your review.") } finally { setDeletingReview(false) }
  }

  return (
    <main className="relative h-[100svh] min-h-[650px] overflow-hidden" style={{ background: colors.page, color: colors.text }}>
      <KhaaoDexMap theme={theme} restaurants={restaurants} onRestaurantSelect={selectRestaurant} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between gap-4 p-4 sm:p-7"><div className="pointer-events-auto rounded-[22px] border border-white/55 bg-white/80 px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:bg-slate-950/80 sm:px-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-[#ef7d57] text-white shadow-lg shadow-[#ef7d57]/25"><Utensils className="size-5" /></div><div><div className="text-lg font-black tracking-[-0.05em] sm:text-xl">Khaao<span className="text-[#ef7d57]">Dex</span></div><div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-55">Gwalior food atlas</div></div></div></div><div className="pointer-events-auto flex items-center gap-2 rounded-[22px] border border-white/55 bg-white/80 p-2 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:bg-slate-950/80"><button className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold opacity-55 sm:flex" disabled><Search className="size-4" /> Search soon</button><button onClick={openDex} className="flex items-center gap-2 rounded-2xl bg-[#27313a] px-3 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 dark:bg-white dark:text-[#172026]"><Compass className="size-4" /> <span>My Dex</span></button></div></header>

      <div className="pointer-events-auto absolute left-4 right-4 top-[92px] z-[500] flex gap-2 overflow-x-auto rounded-2xl border border-white/55 bg-white/75 p-2 shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:left-7 sm:right-auto sm:max-w-[760px] dark:bg-slate-950/75">
        <span className="flex shrink-0 items-center px-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-50">Explore</span>
        {categoryOptions.map((category) => <button key={category} onClick={() => toggleCategory(category)} className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold transition ${selectedCategories.includes(category) ? "bg-[#ef7d57] text-white" : "bg-black/5 opacity-65 hover:opacity-100 dark:bg-white/10"}`}>{categoryLabel(category)}</button>)}
      </div>

      {mapLoading && <div className="absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold shadow-xl backdrop-blur-xl dark:bg-slate-950/80"><Loader2 className="mr-2 inline size-4 animate-spin" />Finding Gwalior&apos;s places…</div>}
      {mapError && <div className="absolute left-1/2 top-24 z-[500] -translate-x-1/2 rounded-2xl bg-red-500/90 px-4 py-3 text-sm font-bold text-white shadow-xl">{mapError}</div>}
      <div className="absolute bottom-5 left-5 z-[500] hidden rounded-2xl border border-white/55 bg-white/75 px-3 py-2 text-xs font-semibold shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:block"><span className="mr-2 inline-block size-2 rounded-full bg-[#ef7d57]" /> Visited <span className="ml-4 mr-2 inline-block size-2 rounded-full border-2 border-current" /> On your radar</div>
      <div className="absolute bottom-5 right-5 z-[500] flex items-center gap-1 rounded-2xl border border-white/55 bg-white/75 p-1 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:bg-slate-950/75">{(Object.keys(mapThemes) as KhaaoDexTheme[]).map((item) => <button key={item} onClick={() => setTheme(item)} className={`rounded-xl px-3 py-2 text-[11px] font-bold transition ${theme === item ? "bg-[#27313a] text-white shadow-sm dark:bg-white dark:text-[#172026]" : "opacity-60 hover:opacity-100"}`}>{mapThemes[item].label}</button>)}</div>

      {selectedRestaurant && <RestaurantDetails restaurant={selectedRestaurant} reviews={details?.reviews ?? []} loading={detailsLoading} draft={draft} savingVisit={savingVisit} savingReview={savingReview} deletingReview={deletingReview} error={actionError} onClose={() => { setSelectedId(null); setDetails(null) }} onVisit={handleVisit} onDraftChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))} onReviewSubmit={handleReviewSubmit} onDeleteReview={handleDeleteReview} />}

      {dexOpen && <aside className="absolute inset-y-0 right-0 z-[1000] w-full max-w-[430px] overflow-y-auto border-l border-white/50 bg-[#f8f7f1]/95 p-5 text-[#27313a] shadow-2xl backdrop-blur-2xl dark:bg-[#101719]/95 dark:text-[#e9f1ec] sm:p-7"><div className="flex items-start justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ef7d57]"><Sparkles className="size-4" /> Your collection</div><h1 className="text-3xl font-black tracking-[-0.06em]">My Dex</h1><p className="mt-2 max-w-xs text-sm opacity-60">A field guide to the places you&apos;ve discovered around Gwalior.</p></div><button onClick={() => setDexOpen(false)} className="rounded-full p-2 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label="Close My Dex"><X className="size-5" /></button></div>{dexLoading ? <div className="flex justify-center py-14"><Loader2 className="size-6 animate-spin" /></div> : dexError ? <div className="mt-7 rounded-3xl bg-white/70 p-5 dark:bg-white/5"><p className="text-sm leading-6 opacity-65">{dexError}</p><button onClick={login} className="mt-4 rounded-2xl bg-[#27313a] px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-[#172026]">Take me to login</button></div> : <><section className="mt-7 rounded-[28px] bg-[#27313a] p-5 text-white shadow-xl shadow-[#27313a]/20 dark:bg-[#173c2b]"><div className="flex items-end justify-between"><div><div className="text-5xl font-black tracking-[-0.08em]">{completion.toFixed(0)}%</div><div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/55">dex complete</div></div><MapPinned className="size-8 text-[#ef7d57]" /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ef7d57]" style={{ width: `${Math.min(completion, 100)}%` }} /></div><div className="mt-3 flex justify-between text-xs text-white/60"><span>{visitedCount} visited</span><span>{totalActive} active places</span></div></section><section className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"><div className="text-2xl font-black">{visitedCount}</div><div className="mt-1 text-xs font-semibold opacity-55">places visited</div></div><div className="rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"><div className="text-2xl font-black">{Math.max(totalActive - visitedCount, 0)}</div><div className="mt-1 text-xs font-semibold opacity-55">still to try</div></div></section><section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">Category progress</h2><span className="text-xs opacity-45">live data</span></div><div className="space-y-3">{categories.length === 0 ? <p className="text-sm opacity-55">Category stats will appear as restaurants load.</p> : categories.map((category) => <div key={category.name} className="rounded-2xl border border-black/5 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"><div className="mb-2 flex justify-between text-sm font-bold"><span>{categoryLabel(category.name)}</span><span className="opacity-50">{category.visited}/{category.total}</span></div><div className="h-2 rounded-full bg-black/5 dark:bg-white/10"><div className="h-full rounded-full" style={{ width: `${category.total ? (category.visited / category.total) * 100 : 0}%`, background: category.color }} /></div></div>)}</div></section><section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">Your discoveries</h2><ArrowUpRight className="size-4 opacity-50" /></div>{dex?.visitedRestaurants.length ? <div className="space-y-2">{dex.visitedRestaurants.slice(0, 8).map((restaurant) => <button key={restaurant.id} onClick={() => { setDexOpen(false); setSelectedId(restaurant.id) }} className="flex w-full items-center justify-between rounded-2xl bg-white/60 p-3 text-left text-sm font-bold dark:bg-white/5"><span>{restaurant.name}<span className="mt-1 block text-xs font-normal opacity-50">{restaurant.categories?.map(categoryLabel).join(" · ") || restaurant.cuisine || "Category not listed"}</span></span><ArrowUpRight className="size-4 opacity-45" /></button>)}</div> : <p className="rounded-3xl border border-dashed border-black/15 p-4 text-sm leading-6 opacity-55 dark:border-white/20">Your visited places will appear here as you explore.</p>}</section></>}</aside>}
    </main>
  )
}
