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

const BACKGROUND_OPTIONS = [
  {
    id: "windows",
    label: "Windows XP",
    value: DEFAULT_BACKGROUND,
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

export function BackgroundSelector() {
  const [selection, setSelection] = useState<string>(DEFAULT_BACKGROUND)
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex h-8 sm:h-10 px-2 sm:px-3 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 items-center gap-1 px-2 py-1 text-xs sm:text-sm"
        >
          <span className="whitespace-nowrap">{activeOption.label}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
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
        <DropdownMenuItem
        key={"custom"}>
            Custom image <br></br>(coming soon!)

        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default BackgroundSelector

