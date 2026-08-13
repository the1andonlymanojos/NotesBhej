"use client"

import { useState } from "react"
import { ArrowUpRight, Compass, MapPinned, Search, Sparkles, Utensils, X } from "lucide-react"
import KhaaoDexMap from "./khaoodex-map"
import { dexStats } from "./data"
import { mapThemes, type KhaaoDexTheme } from "./themes"

export default function KhaaoDexPage() {
  const [theme, setTheme] = useState<KhaaoDexTheme>("light")
  const [dexOpen, setDexOpen] = useState(false)
  const colors = mapThemes[theme]
  const completion = Math.round((dexStats.visited / dexStats.discovered) * 100)

  return (
    <main className="relative h-[100svh] min-h-[650px] overflow-hidden" style={{ background: colors.page, color: colors.text }}>
      <KhaaoDexMap theme={theme} />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between gap-4 p-4 sm:p-7">
        <div className="pointer-events-auto rounded-[22px] border border-white/55 bg-white/80 px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:bg-slate-950/80 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-[#ef7d57] text-white shadow-lg shadow-[#ef7d57]/25">
              <Utensils className="size-5" />
            </div>
            <div>
              <div className="text-lg font-black tracking-[-0.05em] sm:text-xl">Khaao<span className="text-[#ef7d57]">Dex</span></div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-55">Gwalior food atlas</div>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 rounded-[22px] border border-white/55 bg-white/80 p-2 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:bg-slate-950/80">
          <button className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold opacity-55 sm:flex" disabled>
            <Search className="size-4" /> Search soon
          </button>
          <button onClick={() => setDexOpen(true)} className="flex items-center gap-2 rounded-2xl bg-[#27313a] px-3 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 dark:bg-white dark:text-[#172026]">
            <Compass className="size-4" /> <span>My Dex</span>
          </button>
        </div>
      </header>

      <div className="absolute bottom-5 left-5 z-[500] hidden rounded-2xl border border-white/55 bg-white/75 px-3 py-2 text-xs font-semibold shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:block dark:bg-slate-950/75">
        <span className="mr-2 inline-block size-2 rounded-full bg-[#ef7d57]" /> Visited
        <span className="ml-4 mr-2 inline-block size-2 rounded-full border-2 border-current" /> On your radar
      </div>

      <div className="absolute bottom-5 right-5 z-[500] flex items-center gap-1 rounded-2xl border border-white/55 bg-white/75 p-1 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:bg-slate-950/75">
        {(Object.keys(mapThemes) as KhaaoDexTheme[]).map((item) => (
          <button key={item} onClick={() => setTheme(item)} className={`rounded-xl px-3 py-2 text-[11px] font-bold transition ${theme === item ? "bg-[#27313a] text-white shadow-sm dark:bg-white dark:text-[#172026]" : "opacity-60 hover:opacity-100"}`}>
            {mapThemes[item].label}
          </button>
        ))}
      </div>

      {dexOpen && (
        <aside className="absolute inset-y-0 right-0 z-[1000] w-full max-w-[430px] overflow-y-auto border-l border-white/50 bg-[#f8f7f1]/95 p-5 text-[#27313a] shadow-2xl backdrop-blur-2xl dark:bg-[#101719]/95 dark:text-[#e9f1ec] sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ef7d57]"><Sparkles className="size-4" /> Your collection</div>
              <h1 className="text-3xl font-black tracking-[-0.06em]">My Dex</h1>
              <p className="mt-2 max-w-xs text-sm opacity-60">A little field guide to the places you&apos;ve discovered around Gwalior.</p>
            </div>
            <button onClick={() => setDexOpen(false)} className="rounded-full p-2 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label="Close My Dex"><X className="size-5" /></button>
          </div>

          <section className="mt-7 rounded-[28px] bg-[#27313a] p-5 text-white shadow-xl shadow-[#27313a]/20 dark:bg-[#173c2b]">
            <div className="flex items-end justify-between">
              <div><div className="text-5xl font-black tracking-[-0.08em]">{completion}%</div><div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/55">dex complete</div></div>
              <MapPinned className="size-8 text-[#ef7d57]" />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ef7d57]" style={{ width: `${completion}%` }} /></div>
            <div className="mt-3 flex justify-between text-xs text-white/60"><span>{dexStats.visited} visited</span><span>{dexStats.discovered} discovered</span></div>
          </section>

          <section className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"><div className="text-2xl font-black">{dexStats.visited}</div><div className="mt-1 text-xs font-semibold opacity-55">places visited</div></div>
            <div className="rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"><div className="text-2xl font-black">{dexStats.discovered - dexStats.visited}</div><div className="mt-1 text-xs font-semibold opacity-55">still to try</div></div>
          </section>

          <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">Type progress</h2><span className="text-xs opacity-45">prototype data</span></div><div className="space-y-3">{dexStats.categories.map((category) => <div key={category.name} className="rounded-2xl border border-black/5 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"><div className="mb-2 flex justify-between text-sm font-bold"><span>{category.name}</span><span className="opacity-50">{category.count}/{category.total}</span></div><div className="h-2 rounded-full bg-black/5 dark:bg-white/10"><div className="h-full rounded-full" style={{ width: `${(category.count / category.total) * 100}%`, background: category.color }} /></div></div>)}</div></section>

          <section className="mt-8 rounded-3xl border border-dashed border-black/15 p-4 dark:border-white/20"><div className="flex items-center justify-between"><h2 className="font-black">Your discoveries</h2><ArrowUpRight className="size-4 opacity-50" /></div><p className="mt-2 text-sm leading-6 opacity-55">Your visited places, badges, streaks, and personal food trail will live here when KhaaoDex gets its collection data.</p></section>
        </aside>
      )}
    </main>
  )
}
