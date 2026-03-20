"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DEFAULT_BACKGROUND,
  SOFT_GRADIENT_BACKGROUND,
  persistBackgroundPreference,
  readBackgroundPreference,
  OG_GRAD_BG,
} from "@/lib/backgrounds"
import { apiGetMe, apiUpdateMe } from "@/lib/api/client"

const BACKGROUND_OPTIONS = [
  {
    id: "windows",
    label: "Windows XP",
    value: "url('/bgwindows.jpg')",
  },
  {
    id: "mountain",
    label: "Interstellar",
    value:
      "url('/inter.jpeg')",
  },
  {
    id: "aurora",
    label: "City scape",
    value:
      "url('/b-004.jpg')",
  },
  
  {
    id: "gradient",
    label: "Blue Gradient",
    value: SOFT_GRADIENT_BACKGROUND,
  },
  {
    id: "og-grad",
    label: "Original Gradient",
    value: OG_GRAD_BG,
  },
  
]

type BackgroundSelectorProps = {
  /** Match bar styling (ghost, h-10) like Search / Sign in */
  triggerVariant?: "default" | "ghost"
}

export function BackgroundSelector({ triggerVariant = "default" }: BackgroundSelectorProps = {}) {
  const [selection, setSelection] = useState<string>(DEFAULT_BACKGROUND)
  const [serverBgPreference, setServerBgPreference] = useState<string | null>(null)
  const [canSyncPreference, setCanSyncPreference] = useState(false)
  const hasPersistedRef = useRef(true)
  const activeOption = BACKGROUND_OPTIONS.find(
    (option) => option.value === selection
  ) ?? BACKGROUND_OPTIONS[0]

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const stored = readBackgroundPreference()
    if (stored) {
      setSelection(stored)
    }
  }, [])

  useLayoutEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    document.documentElement.style.setProperty("--app-background-image", selection)
    if (!hasPersistedRef.current) {
      persistBackgroundPreference(selection)
      return
    }

    hasPersistedRef.current = false
  }, [selection])

  useEffect(() => {
    let isCancelled = false

    const fetchRemotePreference = async () => {
      try {
        const me = await apiGetMe()
        if (isCancelled) return

        setCanSyncPreference(true)
        const remoteBg = typeof me?.bgPref === "string" && me.bgPref.length > 0 ? me.bgPref : null
        setServerBgPreference(remoteBg)
        if (remoteBg) {
          setSelection(remoteBg)
        }
      } catch {
        if (!isCancelled) {
          setCanSyncPreference(false)
          setServerBgPreference(null)
        }
      }
    }

    fetchRemotePreference()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!canSyncPreference || !selection) {
      return
    }

    if (serverBgPreference === selection) {
      return
    }

    let isCancelled = false

    const syncPreference = async () => {
      try {
        const updated = await apiUpdateMe({ bgPref: selection })
        if (isCancelled) return

        const nextBg =
          typeof updated?.bgPref === "string" && updated.bgPref.length > 0
            ? updated.bgPref
            : selection
        setServerBgPreference(nextBg)
      } catch (error) {
        console.error("Error syncing background preference:", error)
      }
    }

    syncPreference()

    return () => {
      isCancelled = true
    }
  }, [selection, canSyncPreference, serverBgPreference])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={triggerVariant === "ghost" ? "ghost" : "outline"}
            size="sm"
            className={
              triggerVariant === "ghost"
                ? "h-10 gap-1.5 rounded-lg px-3 text-zinc-600 dark:text-zinc-400 hover:bg-white/80 hover:text-zinc-900 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100 text-sm font-medium"
                : "flex h-8 sm:h-10 px-2 sm:px-3 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 items-center gap-1 px-2 py-1 text-xs sm:text-sm"
            }
          >
            <span className="whitespace-nowrap">{activeOption.label}</span>
            <ChevronDown className="h-3 w-3 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {BACKGROUND_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onSelect={() => setSelection(option.value)}
              className={`${
                option.id === activeOption?.id
                  ? "font-semibold text-indigo-600 dark:text-indigo-300"
                  : "text-zinc-700 dark:text-zinc-200"
              }`}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

export default BackgroundSelector

