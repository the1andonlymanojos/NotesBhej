"use client"

import { useCallback, useState } from "react"
import { Loader2, X } from "lucide-react"
import { ApiHttpError, apiSubmitKhaaoDexRestaurant } from "@/lib/api/client"
import type { KhaaoDexCategory, KhaaoDexPriceCategory } from "@/lib/api/types"
import PlaceAutocomplete, { type SelectedGooglePlace } from "./place-autocomplete"

const categories: KhaaoDexCategory[] = ["CAFE", "QUICK_BITES", "NORTH_INDIAN", "SOUTH_INDIAN", "CHAAT", "SWEETS_BAKERY", "DESSERT_PLACE", "STREET_FOOD", "FINE_DINING"]
const prices: KhaaoDexPriceCategory[] = ["BUDGET", "MODERATE", "PREMIUM", "LUXURY"]

function label(value: string) {
  return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}

export default function AddRestaurant({ onClose, onCreated, onLogin }: { onClose: () => void; onCreated: () => void; onLogin: () => void }) {
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

  const toggleCategory = (category: KhaaoDexCategory) => setSelectedCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category])

  const submit = async () => {
    if (!place) { setError("Choose a restaurant from Google search first."); return }
    if (!selectedCategories.length) { setError("Choose at least one restaurant category."); return }
    setSubmitting(true); setError(null)
    try {
      await apiSubmitKhaaoDexRestaurant({ name: place.name, address: place.address, latitude: place.latitude, longitude: place.longitude, googlePlaceId: place.googlePlaceId, categories: selectedCategories, cuisine: cuisine || undefined, priceCategory: priceCategory || undefined })
      setSubmitted(true)
      onCreated()
    } catch (submissionError) {
      if (submissionError instanceof ApiHttpError && (submissionError.status === 401 || submissionError.status === 403)) onLogin()
      else setError("Could not submit this restaurant. Please try again.")
    } finally { setSubmitting(false) }
  }

  return <div className="absolute inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-20 backdrop-blur-sm sm:pt-24"><section className="w-full max-w-xl rounded-[28px] border border-white/60 bg-[#f8f7f1] p-5 text-[#27313a] shadow-2xl dark:bg-[#101719] dark:text-[#e9f1ec] sm:p-7"><div className="flex items-start justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ef7d57]">Grow the Dex</div><h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">Add a restaurant</h2><p className="mt-2 text-sm opacity-60">Pick a real Google place. It will enter the trusted review queue before appearing as active.</p></div><button onClick={onClose} className="rounded-full p-2 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label="Close add restaurant"><X className="size-5" /></button></div>{submitted ? <div className="mt-7 rounded-3xl bg-[#ef7d57]/10 p-5"><div className="text-lg font-black">Submitted for review ✓</div><p className="mt-2 text-sm leading-6 opacity-65">Thanks. A moderator will verify the place before it becomes part of the public Dex.</p><button onClick={onClose} className="mt-5 rounded-2xl bg-[#27313a] px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-[#172026]">Done</button></div> : <><div className="mt-6"><div className="mb-2 text-xs font-black uppercase tracking-[0.12em] opacity-55">Google place</div><PlaceAutocomplete onSelect={handlePlaceSelect} /></div>{place && <div className="mt-3 rounded-2xl bg-black/5 p-3 text-sm dark:bg-white/10"><div className="font-black">{place.name}</div><div className="mt-1 opacity-60">{place.address}</div></div>}<div className="mt-5"><label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] opacity-55">Categories</label><div className="flex flex-wrap gap-2">{categories.map((category) => <button key={category} type="button" onClick={() => toggleCategory(category)} className={`rounded-full px-3 py-2 text-xs font-bold transition ${selectedCategories.includes(category) ? "bg-[#ef7d57] text-white" : "bg-black/5 opacity-70 hover:opacity-100 dark:bg-white/10"}`}>{label(category)}</button>)}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold opacity-65">Cuisine<input value={cuisine} onChange={(event) => setCuisine(event.target.value)} placeholder="e.g. Indian" className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white/60 px-3 text-sm outline-none dark:border-white/10 dark:bg-white/5" /></label><label className="text-xs font-bold opacity-65">Price category<select value={priceCategory} onChange={(event) => setPriceCategory(event.target.value as KhaaoDexPriceCategory | "")} className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white/60 px-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"><option value="">Not sure</option>{prices.map((price) => <option key={price} value={price}>{label(price)}</option>)}</select></label></div>{error && <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}<button onClick={submit} disabled={submitting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ef7d57] px-4 py-3 text-sm font-black text-white">{submitting && <Loader2 className="size-4 animate-spin" />} Submit restaurant</button></>}</section></div>
}
