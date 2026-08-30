"use client"

import { useState } from "react"
import Link from "next/link"
import { Drawer } from "vaul"
import {
  BookOpen,
  Compass,
  Mail,
  Menu as MenuIcon,
  ShieldCheck,
  Sparkles,
  Star,
  Utensils,
  X,
} from "lucide-react"
import { SHEET } from "./ui"

type KhaaoDexMenuProps = {
  isModerator: boolean
  appEnv?: string
}

const points = [
  {
    icon: Star,
    title: "Curated, not crawled",
    body: "Every place is added and vouched for by a student, then checked by a moderator. No auto-imported noise.",
  },
  {
    icon: Compass,
    title: "Your Dex fills in",
    body: "Mark what you've been to and watch your exploration of Gwalior grow, constellation by constellation.",
  },
  {
    icon: Utensils,
    title: "Reviews from your people",
    body: "Ratings come from people you'll actually run into on campus — not strangers three cities away.",
  },
]

export default function KhaaoDexMenu({ isModerator, appEnv }: KhaaoDexMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <Drawer.Root
      direction="left"
      open={open}
      onOpenChange={setOpen}
      modal={false}
      shouldScaleBackground={false}
    >
      <Drawer.Trigger
        aria-label="Menu"
        className="grid size-9 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] text-muted-teal-600 outline-none transition hover:bg-black/[0.06] dark:border-white/15 dark:bg-white/5 dark:text-muted-teal-300 dark:hover:bg-white/10"
      >
        <MenuIcon className="size-4" />
      </Drawer.Trigger>

      <Drawer.Portal>
        {open && (
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1400] bg-muted-teal-950/45 duration-150 animate-in fade-in"
          />
        )}
        <Drawer.Content
          aria-label="KhaaoDex menu"
          className={`${SHEET} fixed inset-y-0 left-0 z-[1410] flex w-[86%] max-w-[340px] flex-col rounded-r-[24px] outline-none`}
        >
          <div className="flex items-start justify-between p-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-[#b34d66] text-white">
                <Utensils className="size-4" />
              </div>
              <div>
                <Drawer.Title className="text-[15px] font-bold tracking-tight text-muted-teal-900 dark:text-white">
                  Khaao<span className="text-[#b34d66]">Dex</span>
                </Drawer.Title>
                <Drawer.Description className="text-xs text-muted-teal-500 dark:text-muted-teal-400">
                  Gwalior&rsquo;s student food atlas
                </Drawer.Description>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-teal-500 transition hover:bg-black/5 hover:text-muted-teal-900 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
            <nav className="space-y-1">
              <Link
                href="/khao-dex/how-it-works"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-teal-800 transition hover:bg-black/[0.04] dark:text-pale-oak-100 dark:hover:bg-white/[0.06]"
              >
                <BookOpen className="size-4 text-[#b34d66]" />
                How it works
              </Link>
              {isModerator && (
                <Link
                  href="/khao-dex/moderation"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-teal-800 transition hover:bg-black/[0.04] dark:text-pale-oak-100 dark:hover:bg-white/[0.06]"
                >
                  <ShieldCheck className="size-4 text-[#b34d66]" />
                  Review queue
                </Link>
              )}
            </nav>

            <div className="mx-3 my-3 border-t border-black/[0.08] dark:border-white/10" />

            <div className="px-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#b34d66]">
                <Sparkles className="size-3.5" /> Why KhaaoDex
              </div>
              <ul className="mt-3 space-y-3.5">
                {points.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-teal-400" />
                    <div>
                      <div className="text-sm font-semibold text-muted-teal-900 dark:text-white">{title}</div>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted-teal-500 dark:text-muted-teal-400">
                        {body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/khao-dex/how-it-works"
                onClick={() => setOpen(false)}
                className="mt-4 inline-block text-sm font-semibold text-[#8f3d52] hover:underline dark:text-[#d194a3]"
              >
                Read more →
              </Link>
            </div>

            <div className="mx-3 my-3 border-t border-black/[0.08] dark:border-white/10" />

            <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 text-xs text-muted-teal-500 dark:text-muted-teal-400">
              <a href="https://notesbhej.mshiv.net/pp" className="hover:text-muted-teal-900 dark:hover:text-white">
                Privacy
              </a>
              <a href="https://notesbhej.mshiv.net/tos" className="hover:text-muted-teal-900 dark:hover:text-white">
                Terms
              </a>
              <a
                href="https://notesbhej.mshiv.net/takedown"
                className="hover:text-muted-teal-900 dark:hover:text-white"
              >
                Takedown
              </a>
              <a
                href="mailto:mshivagange@gmail.com"
                className="inline-flex items-center gap-1 hover:text-muted-teal-900 dark:hover:text-white"
              >
                <Mail className="size-3" /> Contact
              </a>
            </div>

            <p className="mt-3 px-3 text-xs text-muted-teal-400">
              Made at IIITM Gwalior
              {appEnv && appEnv !== "production" ? (
                <span className="ml-2 rounded-full border border-current px-1.5 py-0.5 uppercase tracking-wide">
                  {appEnv}
                </span>
              ) : null}
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
