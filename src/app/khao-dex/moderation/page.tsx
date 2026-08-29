"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Loader2, MapPin, RefreshCw, X } from "lucide-react"
import {
  ApiHttpError,
  apiGetKhaaoDexPendingEdits,
  apiGetKhaaoDexPendingRestaurants,
  apiGetKhaaoDexRestaurantDetails,
  apiGetMe,
  apiModerateKhaaoDexEdit,
  apiModerateKhaaoDexRestaurant,
} from "@/lib/api/client"
import type { ApiUser, KhaaoDexRestaurant, KhaaoDexRestaurantEdit } from "@/lib/api/types"
import { SURFACE, categoryLabel, googleDirectionsUrl, priceLabel } from "@/components/khaoodex/ui"

const isModerator = (user: ApiUser | null) => user?.role === "ADMIN" || user?.role === "MODERATOR"

type Tab = "places" | "edits"

export default function KhaaoDexModerationPage() {
  const router = useRouter()
  const [me, setMe] = useState<ApiUser | null>(null)
  const [authState, setAuthState] = useState<"loading" | "denied" | "ok">("loading")
  const [tab, setTab] = useState<Tab>("places")

  const [places, setPlaces] = useState<KhaaoDexRestaurant[] | null>(null)
  const [edits, setEdits] = useState<KhaaoDexRestaurantEdit[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [flash, setFlash] = useState<{ tone: "ok" | "warn"; text: string } | null>(null)
  const flashTimer = useRef<number | null>(null)

  const announce = useCallback((tone: "ok" | "warn", text: string) => {
    setFlash({ tone, text })
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 3500)
  }, [])

  useEffect(() => {
    apiGetMe()
      .then((user) => {
        setMe(user)
        setAuthState(isModerator(user) ? "ok" : "denied")
      })
      .catch(() => setAuthState("denied"))
  }, [])

  const load = useCallback(async () => {
    setLoadError(null)
    setRefreshing(true)
    try {
      const [p, e] = await Promise.all([apiGetKhaaoDexPendingRestaurants(), apiGetKhaaoDexPendingEdits()])
      setPlaces(p)
      setEdits(e)
    } catch (error) {
      if (error instanceof ApiHttpError && (error.status === 401 || error.status === 403)) {
        setAuthState("denied")
        return
      }
      setLoadError("Couldn’t load the moderation queue. Try again in a moment.")
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (authState === "ok") void load()
  }, [authState, load])

  if (authState === "loading") {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-muted-teal-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </Shell>
    )
  }

  if (authState === "denied") {
    return (
      <Shell>
        <div className={`${SURFACE} rounded-2xl p-6 text-center`}>
          <h1 className="text-lg font-bold text-muted-teal-900 dark:text-white">Moderators only</h1>
          <p className="mt-1.5 text-sm text-muted-teal-500 dark:text-muted-teal-400">
            {me ? "This account isn’t a KhaaoDex moderator." : "Sign in with a moderator account to review submissions."}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link
              href="/khao-dex"
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-muted-teal-700 dark:border-white/15 dark:text-muted-teal-200"
            >
              Back to the map
            </Link>
            {!me && (
              <button
                onClick={() => router.push(`/nextlogin?redirect=${encodeURIComponent("/khao-dex/moderation")}`)}
                className="rounded-xl bg-[#b34d66] px-4 py-2 text-sm font-semibold text-white"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
          {(
            [
              ["places", `Places${places ? ` (${places.length})` : ""}`],
              ["edits", `Edits${edits ? ` (${edits.length})` : ""}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === value
                  ? "bg-white text-muted-teal-900 shadow-sm dark:bg-muted-teal-800 dark:text-white"
                  : "text-muted-teal-500 hover:text-muted-teal-800 dark:text-muted-teal-400 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          aria-label="Refresh queue"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-black/10 text-muted-teal-500 transition hover:text-muted-teal-900 disabled:opacity-50 dark:border-white/15 dark:text-muted-teal-300 dark:hover:text-white"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {flash && (
        <div
          className={`mb-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
            flash.tone === "ok"
              ? "bg-[#b34d66]/10 text-[#8f3d52] dark:text-[#d194a3]"
              : "bg-amber-500/12 text-amber-700 dark:text-amber-300"
          }`}
        >
          {flash.text}
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-2xl bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">
          {loadError}{" "}
          <button onClick={load} className="underline">
            Retry
          </button>
        </div>
      )}

      {tab === "places" ? (
        <Queue
          items={places}
          empty="No places waiting for review — nice work."
          render={(place) => (
            <PlaceCard
              key={place.id}
              place={place}
              onDone={() => setPlaces((current) => (current ?? []).filter((p) => p.id !== place.id))}
              onResult={announce}
            />
          )}
        />
      ) : (
        <Queue
          items={edits}
          empty="No proposed edits waiting for review."
          render={(edit) => (
            <EditCard
              key={edit.id}
              edit={edit}
              onDone={() => setEdits((current) => (current ?? []).filter((e) => e.id !== edit.id))}
              onResult={announce}
            />
          )}
        />
      )}
    </Shell>
  )
}

/* ------------------------------------------------------------------ shell --- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100svh] bg-pale-oak-50 text-muted-teal-900 dark:bg-muted-teal-950 dark:text-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link
          href="/khao-dex"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-teal-500 transition hover:text-muted-teal-900 dark:text-muted-teal-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" /> Map
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Review queue</h1>
        <p className="mt-1 text-sm text-muted-teal-500 dark:text-muted-teal-400">
          Approve or reject what the community has submitted to KhaaoDex.
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  )
}

function Queue<T>({
  items,
  empty,
  render,
}: {
  items: T[] | null
  empty: string
  render: (item: T) => React.ReactNode
}) {
  if (items === null) {
    return (
      <div className="flex justify-center py-16 text-muted-teal-400">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className={`${SURFACE} rounded-2xl p-8 text-center text-sm text-muted-teal-500 dark:text-muted-teal-400`}>
        {empty}
      </div>
    )
  }
  return <div className="space-y-3">{items.map(render)}</div>
}

/* --------------------------------------------------------------- decisions --- */

function DecisionBar({
  onApprove,
  onReject,
  busy,
  notePlaceholder = "Reason (optional)",
}: {
  onApprove: () => void
  onReject: (note: string) => void
  busy: false | "approve" | "reject"
  notePlaceholder?: string
}) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState("")

  if (rejecting) {
    return (
      <div className="mt-3 space-y-2">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={notePlaceholder}
          autoFocus
          className="min-h-16 w-full resize-none rounded-xl border border-black/10 bg-white/70 p-2.5 text-sm outline-none focus:border-[#b34d66] dark:border-white/15 dark:bg-white/5"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onReject(note)}
            disabled={busy !== false}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            Confirm reject
          </button>
          <button
            onClick={() => setRejecting(false)}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-teal-500 hover:text-muted-teal-900 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={onApprove}
        disabled={busy !== false}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#b34d66] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#8f3d52] disabled:opacity-60"
      >
        {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Approve
      </button>
      <button
        onClick={() => setRejecting(true)}
        disabled={busy !== false}
        className="rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-muted-teal-700 transition hover:bg-black/[0.03] disabled:opacity-60 dark:border-white/15 dark:text-muted-teal-200 dark:hover:bg-white/5"
      >
        Reject
      </button>
    </div>
  )
}

type ResultFn = (tone: "ok" | "warn", text: string) => void

function PlaceCard({
  place,
  onDone,
  onResult,
}: {
  place: KhaaoDexRestaurant
  onDone: () => void
  onResult: ResultFn
}) {
  const [busy, setBusy] = useState<false | "approve" | "reject">(false)
  const [error, setError] = useState<string | null>(null)

  const decide = async (approve: boolean, note?: string) => {
    setBusy(approve ? "approve" : "reject")
    setError(null)
    try {
      await apiModerateKhaaoDexRestaurant(place.id, approve, note)
      onResult("ok", `${approve ? "Approved" : "Rejected"} ${place.name}`)
      onDone()
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 409) {
        onResult("warn", `${place.name} was already reviewed by someone else.`)
        onDone()
        return
      }
      setError("That didn’t go through. Try again.")
      setBusy(false)
    }
  }

  return (
    <article className={`${SURFACE} rounded-2xl p-4`}>
      <h2 className="text-base font-bold text-muted-teal-900 dark:text-white">{place.name}</h2>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-teal-500 dark:text-muted-teal-400">
        {place.cuisine && <span>{place.cuisine}</span>}
        {priceLabel(place.priceCategory) && <span>· {priceLabel(place.priceCategory)}</span>}
        <a
          href={googleDirectionsUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-[#b34d66] hover:underline dark:text-[#d194a3]"
        >
          <MapPin className="size-3.5" /> Google
        </a>
      </div>
      {place.address && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-teal-500 dark:text-muted-teal-400">{place.address}</p>
      )}
      {place.categories?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {place.categories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs font-semibold text-muted-teal-600 dark:bg-white/10 dark:text-muted-teal-300"
            >
              {categoryLabel(category)}
            </span>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      <DecisionBar
        onApprove={() => decide(true)}
        onReject={(note) => decide(false, note)}
        busy={busy}
        notePlaceholder="Internal note (optional)"
      />
    </article>
  )
}

/* ------------------------------------------------------------------ edits --- */

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  address: "Address",
  cuisine: "Cuisine",
  priceCategory: "Price",
  categories: "Categories",
  latitude: "Latitude",
  longitude: "Longitude",
  googlePlaceId: "Google Place ID",
}

function fmt(field: string, value: unknown): string {
  if (value == null || value === "") return "—"
  if (field === "categories" && Array.isArray(value)) return value.map((v) => categoryLabel(String(v))).join(", ")
  if (field === "priceCategory") return priceLabel(String(value)) ?? String(value)
  if (field === "latitude" || field === "longitude") return Number(value).toFixed(5)
  return String(value)
}

function EditCard({
  edit,
  onDone,
  onResult,
}: {
  edit: KhaaoDexRestaurantEdit
  onDone: () => void
  onResult: ResultFn
}) {
  const [busy, setBusy] = useState<false | "approve" | "reject">(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<KhaaoDexRestaurant | null>(null)

  useEffect(() => {
    apiGetKhaaoDexRestaurantDetails(edit.restaurantId)
      .then((result) => setCurrent(result.restaurant))
      .catch(() => setCurrent(null))
  }, [edit.restaurantId])

  const changes = useMemo(() => {
    const rows: Array<{ field: string; before: unknown; after: unknown }> = []
    for (const [field, after] of Object.entries(edit.proposed)) {
      if (after == null || after === "") continue
      const before = current ? (current as unknown as Record<string, unknown>)[field] : undefined
      const same =
        field === "categories"
          ? JSON.stringify([...((before as string[]) ?? [])].sort()) ===
            JSON.stringify([...((after as string[]) ?? [])].sort())
          : String(before ?? "") === String(after)
      if (current && same) continue
      rows.push({ field, before, after })
    }
    return rows
  }, [edit.proposed, current])

  const label = current ? current.name : `restaurant #${edit.restaurantId}`
  const decide = async (approve: boolean, note?: string) => {
    setBusy(approve ? "approve" : "reject")
    setError(null)
    try {
      await apiModerateKhaaoDexEdit(edit.id, approve, note)
      onResult("ok", `${approve ? "Applied edit to" : "Rejected edit for"} ${label}`)
      onDone()
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 409) {
        onResult("warn", "That edit was already reviewed by someone else.")
        onDone()
        return
      }
      setError("That didn’t go through. Try again.")
      setBusy(false)
    }
  }

  return (
    <article className={`${SURFACE} rounded-2xl p-4`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-muted-teal-900 dark:text-white">
          {current ? current.name : `Restaurant #${edit.restaurantId}`}
        </h2>
        <Link
          href={`/khao-dex?place=${edit.restaurantId}`}
          target="_blank"
          className="shrink-0 text-xs font-semibold text-[#b34d66] hover:underline dark:text-[#d194a3]"
        >
          View on map ↗
        </Link>
      </div>
      <p className="mt-0.5 text-xs text-muted-teal-400">
        proposed edit #{edit.id}
        {edit.createdAt ? ` · ${new Date(edit.createdAt).toLocaleDateString()}` : ""}
      </p>

      <div className="mt-3 divide-y divide-black/[0.06] rounded-xl bg-black/[0.02] dark:divide-white/10 dark:bg-white/[0.03]">
        {!current && (
          <p className="p-3 text-xs text-muted-teal-400">
            (couldn’t load the current place — showing proposed values only)
          </p>
        )}
        {changes.length === 0 ? (
          <p className="p-3 text-sm text-muted-teal-500 dark:text-muted-teal-400">
            No effective changes — the proposal matches the current place.
          </p>
        ) : (
          changes.map(({ field, before, after }) => (
            <div key={field} className="grid grid-cols-[6rem_1fr] gap-2 p-3 text-sm">
              <span className="font-semibold text-muted-teal-500 dark:text-muted-teal-400">
                {FIELD_LABELS[field] ?? field}
              </span>
              <span>
                {current && (
                  <span className="text-muted-teal-400 line-through">{fmt(field, before)} </span>
                )}
                <span className="font-semibold text-muted-teal-900 dark:text-white">{fmt(field, after)}</span>
              </span>
            </div>
          ))
        )}
      </div>

      {edit.moderationNote && (
        <p className="mt-2 text-xs text-muted-teal-400">Note: {edit.moderationNote}</p>
      )}
      {error && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      <DecisionBar onApprove={() => decide(true)} onReject={(note) => decide(false, note)} busy={busy} />
    </article>
  )
}
