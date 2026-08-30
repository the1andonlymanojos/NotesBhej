import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  PenLine,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react"

export const metadata = {
  title: "How KhaaoDex works",
  description:
    "Why use KhaaoDex over a generic maps app — a curated, student-run food atlas for Gwalior.",
}

const differences = [
  {
    icon: ShieldCheck,
    title: "Curated, not crawled",
    body: "A maps app lists every place that ever registered a pin. KhaaoDex only shows what a student actually added and a moderator approved — so the map is a shortlist, not a phone book.",
  },
  {
    icon: Users,
    title: "Reviews from people you'll meet",
    body: "Ratings come from other IIITM folks eating on the same budget, doing the same late-night runs. No paid placements, no five-star spam from accounts three cities away.",
  },
  {
    icon: Sparkles,
    title: "A map that rewards exploring",
    body: "Places are stars in a constellation. The more of Gwalior you actually visit, the more of your Dex fills in — it turns 'where should we eat' into a collection you're building.",
  },
  {
    icon: Star,
    title: "Built for one city, done well",
    body: "Everything is tuned for Gwalior and campus life: walking distance, hostel cravings, what's open late. A global app can't care about that.",
  },
]

const steps = [
  {
    icon: MapPin,
    title: "Explore the star map",
    body: "Pan around the constellation. Tap any star to see cuisine, price, ratings and directions. Brighter stars have more reviews.",
  },
  {
    icon: Star,
    title: "Mark what you've been to",
    body: "Hit 'Visited' on places you've tried. Your Dex tracks how much of the city you've covered, by category.",
  },
  {
    icon: PenLine,
    title: "Add places & leave reviews",
    body: "Found somewhere good that isn't on the map? Add it from a Google search. Rate the spots you know. A moderator checks new places before they go live.",
  },
]

export default function HowItWorksPage() {
  return (
    <main className="min-h-[100svh] bg-pale-oak-50 text-muted-teal-900 dark:bg-muted-teal-950 dark:text-pale-oak-100">
      <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:py-10">
        <Link
          href="/khao-dex"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-teal-500 transition hover:text-muted-teal-900 dark:text-muted-teal-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to the map
        </Link>

        <header className="mt-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#b34d66]">
            <Sparkles className="size-3.5" />
            How it works
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Why Khaao<span className="text-[#b34d66]">Dex</span>, not just Maps?
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-teal-600 dark:text-muted-teal-300">
            A generic maps app is great at answering &ldquo;is there a restaurant near me.&rdquo; It&rsquo;s
            bad at &ldquo;where do people I trust actually eat in Gwalior.&rdquo; KhaaoDex is a small,
            student-run food atlas built to answer the second question.
          </p>
        </header>

        <section className="mt-9">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-teal-500 dark:text-muted-teal-400">
            What&rsquo;s different
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {differences.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-black/[0.07] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <Icon className="size-5 text-[#b34d66]" />
                <h3 className="mt-2.5 text-base font-bold tracking-tight">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-teal-600 dark:text-muted-teal-300">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-teal-500 dark:text-muted-teal-400">
            Using it
          </h2>
          <ol className="mt-4 space-y-3">
            {steps.map(({ icon: Icon, title, body }, index) => (
              <li
                key={title}
                className="flex gap-4 rounded-2xl border border-black/[0.07] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#b34d66]/12 text-[#8f3d52] dark:text-[#d194a3]">
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted-teal-400">
                    Step {index + 1}
                  </div>
                  <h3 className="mt-0.5 text-base font-bold tracking-tight">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-teal-600 dark:text-muted-teal-300">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-9 rounded-2xl bg-muted-teal-900 p-5 text-pale-oak-100 dark:bg-white/[0.06]">
          <div className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="size-4 text-[#d194a3]" />
            Every place is reviewed
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-pale-oak-200/80">
            New restaurants and edits go into a moderation queue before they show up on the public
            map. It keeps the atlas honest and spam-free — the trade-off is that a place you add
            might take a day to appear.
          </p>
        </section>

        <div className="mt-9">
          <Link
            href="/khao-dex"
            className="inline-flex items-center gap-2 rounded-xl bg-[#b34d66] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3d52]"
          >
            Open the map
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted-teal-400">Made at IIITM Gwalior</p>
      </div>
    </main>
  )
}
