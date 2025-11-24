"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronDown, X, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileInput } from "@/components/ui/file-input"
import {
  DEFAULT_BACKGROUND,
  SOFT_GRADIENT_BACKGROUND,
  persistBackgroundPreference,
  readBackgroundPreference,
  OG_GRAD_BG,
} from "@/lib/backgrounds"
  import { createClient } from "@/utils/supabase/client"

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

interface CustomBackground {
  id: number
  Name: string | null
  "image link": string | null
  user_id: string | null
}

interface UserBackgroundPreference {
  id: number
  bg: string | null
  user_id: string | null
}

export function BackgroundSelector() {
  const [selection, setSelection] = useState<string>(DEFAULT_BACKGROUND)
  const [customBackgrounds, setCustomBackgrounds] = useState<CustomBackground[]>([])
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [backgroundName, setBackgroundName] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [userBgPreference, setUserBgPreference] = useState<UserBackgroundPreference | null>(null)
  const hasPersistedRef = useRef(true)
  const supabase = createClient()

  // Check if current selection is a custom URL not in our lists
  const isCustomUrlNotInList = () => {
    if (!selection || selection === DEFAULT_BACKGROUND) return false
    // Check if it's a URL format
    if (selection.startsWith("url('") && selection.endsWith("')")) {
      const url = selection.slice(5, -2)
      // Check if it's in default options
      const inDefaults = BACKGROUND_OPTIONS.some(opt => opt.value === selection)
      // Check if it's in custom backgrounds
      const inCustom = customBackgrounds.some(bg => bg["image link"] === url)
      return !inDefaults && !inCustom
    }
    return false
  }

  const allOptions = [
    ...BACKGROUND_OPTIONS,
    ...customBackgrounds.map((bg) => ({
      id: `custom-${bg.id}`,
      label: bg.Name || "Unnamed",
      value: bg["image link"] ? `url('${bg["image link"]}')` : DEFAULT_BACKGROUND,
      isCustom: true,
      bgId: bg.id,
    })),
    // Add dummy entry if current selection is not in the list
    ...(isCustomUrlNotInList() ? [{
      id: "dummy-current",
      label: "Current Background (Click to change)",
      value: selection,
      isCustom: true,
      isDummy: true,
    }] : []),
  ]

  const activeOption = allOptions.find(
    (option) => option.value === selection
  ) ?? allOptions[0]

  // Fetch custom backgrounds when authenticated
  useEffect(() => {
    const fetchCustomBackgrounds = async () => {
      const  userData= await supabase.auth.getUser()
      const user = userData?.data?.user
      if (!user) {
        setUserId(null)
        setCustomBackgrounds([])
        setUserBgPreference(null)
        return
      }

      setUserId(user.id)
      const { data, error } = await supabase
        .from("bg_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching custom backgrounds:", error)
        return
      }

      if (data) {
        setCustomBackgrounds(data)
      }

      const { data: prefData, error: prefError } = await supabase
        .from("userbgpref")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)

      if (prefError && prefError.code !== "PGRST116") {
        console.error("Error fetching user background preference:", prefError)
      } else if (!prefData || prefData.length === 0) {
        try {
          const { data: insertedPref, error: insertError } = await supabase
            .from("userbgpref")
            .insert({
              user_id: user.id,
              bg: "FRESH INSERT",
            })
            .select()
            .single()

          if (insertError) {
            throw insertError
          }

          setUserBgPreference(insertedPref)
        } catch (insertErr) {
          console.error("Error inserting default background preference:", insertErr)
        }
      } else {
        setUserBgPreference(prefData[0])
      }
    }

    fetchCustomBackgrounds()
  }, [supabase])

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
    if (!userId || !selection) {
      return
    }

    const currentBgPref = userBgPreference?.bg ?? null
    if (currentBgPref === selection) {
      return
    }

    let isCancelled = false

    const syncPreference = async () => {
      try {
        console.log("userBgPreference", userBgPreference)
        if (userBgPreference?.id) {
          const { data, error } = await supabase
            .from("userbgpref")
            .update({ bg: selection })
            .eq("id", userBgPreference.id)
            .select()
            .single()

          if (error) {
            throw error
          }

          if (!isCancelled) {
            setUserBgPreference(data)
          }
        } 
      } catch (error) {
        console.log("id",userBgPreference?.id)
        console.error("Error syncing background preference:", error)
      }
    }

    syncPreference()

    return () => {
      isCancelled = true
    }
  }, [selection, userId, supabase, userBgPreference?.id, userBgPreference?.bg])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file")
        return
      }
      setSelectedFile(file)
      if (!backgroundName) {
        setBackgroundName(file.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !backgroundName.trim()) {
      alert("Please select an image and enter a name")
      return
    }

    if (!userId) {
      alert("You must be logged in to upload custom backgrounds")
      return
    }

    setUploading(true)
    try {
      // Get upload URL
      const response = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileTypee: selectedFile.type,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get upload URL")
      }

      const { signedUrl, publicUrl } = await response.json()

      // Upload file to S3/R2
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file")
      }

      // Save to database
      const {error } = await supabase
        .from("bg_images")
        .insert({
          Name: backgroundName.trim(),
          "image link": publicUrl,
          user_id: userId,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Refresh custom backgrounds
      const { data: updatedData } = await supabase
        .from("bg_images")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (updatedData) {
        setCustomBackgrounds(updatedData)
      }

      // Reset form
      setSelectedFile(null)
      setBackgroundName("")
      setIsUploadDialogOpen(false)
    } catch (error) {
      console.error("Error uploading background:", error)
      alert("Failed to upload background. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (bgId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm("Are you sure you want to delete this background?")) {
      return
    }

    try {
      const { error } = await supabase
        .from("bg_images")
        .delete()
        .eq("id", bgId)

      if (error) {
        throw error
      }

      // Remove from state
      setCustomBackgrounds((prev) => prev.filter((bg) => bg.id !== bgId))
    } catch (error) {
      console.error("Error deleting background:", error)
      alert("Failed to delete background. Please try again.")
    }
  }

  return (
    <>
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
          {(customBackgrounds.length > 0 || isCustomUrlNotInList()) && (
            <>
              <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
              {/* Show dummy entry if current selection is not in list */}
              {isCustomUrlNotInList() && (
                <DropdownMenuItem
                  key="dummy-current"
                  onSelect={() => {
                    // Allow clicking to see it's selected, but don't change anything
                  }}
                  className="font-semibold text-indigo-600 dark:text-indigo-300 italic"
                >
                    (Click to Background)
                </DropdownMenuItem>
              )}
              {customBackgrounds.map((bg) => (
                <DropdownMenuItem
                  key={`custom-${bg.id}`}
                  onSelect={() => {
                    if (bg["image link"]) {
                      setSelection(`url('${bg["image link"]}')`)
                    }
                  }}
                  className={`flex items-center justify-between ${
                    selection === `url('${bg["image link"]}')`
                      ? "font-semibold text-indigo-600 dark:text-indigo-300"
                      : "text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  <span className="flex-1 truncate">{bg.Name || "Unnamed"}</span>
                  <button
                    onClick={(e) => handleDelete(bg.id, e)}
                    className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    aria-label="Delete background"
                  >
                    <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </button>
                </DropdownMenuItem>
              ))}
            </>
          )}
          <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
          <DropdownMenuItem
            key="custom-upload"
            onSelect={() => {
              if (!userId) {
                alert("Please log in to upload custom backgrounds")
                return
              }
              setIsUploadDialogOpen(true)
            }}
            className="text-zinc-700 dark:text-zinc-200"
          >
            <Upload className="h-3 w-3 mr-2 inline" />
            Upload Custom Background
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Custom Background</DialogTitle>
            <DialogDescription>
              Upload an image to use as your custom background
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="background-file">Image File</Label>
              <FileInput
                id="background-file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="background-name">Background Name</Label>
              <Input
                id="background-name"
                value={backgroundName}
                onChange={(e) => setBackgroundName(e.target.value)}
                placeholder="Enter a name for this background"
                disabled={uploading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false)
                setSelectedFile(null)
                setBackgroundName("")
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !backgroundName.trim()}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BackgroundSelector

