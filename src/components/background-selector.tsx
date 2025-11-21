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
} from "@/lib/backgrounds"

const BACKGROUND_OPTIONS = [
  {
    id: "windows",
    label: "Window View",
    value: DEFAULT_BACKGROUND,
  },
  {
    id: "gradient",
    label: "Soft Gradient",
    value: SOFT_GRADIENT_BACKGROUND,
  },
  {
    id: "aurora",
    label: "Aurora Sky",
    value:
      "url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80')",
  },
  {
    id: "mountain",
    label: "Mountain Lake",
    value:
      "url('https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=80')",
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
          className="flex items-center gap-1 px-2 py-1 text-xs sm:text-sm"
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default BackgroundSelector

