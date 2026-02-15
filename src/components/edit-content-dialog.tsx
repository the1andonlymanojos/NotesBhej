"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileInput } from "@/components/ui/file-input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Loader2, Save, X, Upload, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Database } from "@/types/supabase"
import { Progress } from "@/components/ui/progress"

type CourseContent = Database["public"]["Tables"]["course_contentnew"]["Row"]
type Professor = Database["public"]["Tables"]["professorsnew"]["Row"]
type Tag = Database["public"]["Tables"]["tags"]["Row"]

interface EditContentDialogProps {
  content: CourseContent | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  professors: Professor[]
  tags: Tag[]
}

export default function EditContentDialog({
  content,
  isOpen,
  onClose,
  onSave,
  professors,
  tags
}: EditContentDialogProps) {
  const [title, setTitle] = useState("")
  const [year, setYear] = useState<number | string>("")
  const [batch, setBatch] = useState("")
  const [semesterNumber, setSemesterNumber] = useState<number | string>("")
  const [selectedProfessorId, setSelectedProfessorId] = useState<number | null>(null)
  const [selectedProfessorName, setSelectedProfessorName] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [openCombobox, setOpenCombobox] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [newFile, setNewFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadingFile, setUploadingFile] = useState(false)
  const supabase = createClient()

  // Initialize form when content changes
  useEffect(() => {
    if (content) {
      setTitle(content.title || "")
      setYear(content.year || "")
      setBatch(content.batch || "")
      setSemesterNumber(content.semester_number || "")
      setSelectedProfessorId(content.professor_id)
      setSelectedTagIds(content.tag_ids || [])
      
      // Set professor name
      if (content.professor_id) {
        const professor = professors.find(p => p.id === content.professor_id)
        setSelectedProfessorName(professor?.name || "")
      } else {
        setSelectedProfessorName("")
      }
    }
  }, [content, professors])

  const validateForm = () => {
    const errors: string[] = []
    
    if (!title.trim()) {
      errors.push("Title is required")
    }
    
    if (!year || year === "") {
      errors.push("Year is required")
    } else {
      const yearNum = parseInt(year as string)
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear() + 5) {
        errors.push("Please enter a valid year (2000 - " + (new Date().getFullYear() + 5) + ")")
      }
    }
    
    if (!batch.trim()) {
      errors.push("Batch is required")
    }

    if (!semesterNumber || semesterNumber === "") {
      errors.push("Semester number is required")
    } else {
      const semesterNum = parseInt(semesterNumber as string)
      if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 12) {
        errors.push("Please enter a valid semester number (1-12)")
      }
    }
    
    return errors
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewFile(file)
    }
  }

  const uploadNewFile = async (): Promise<{ publicUrl: string; isR2Url: boolean } | null> => {
    if (!newFile) return null

    setUploadingFile(true)
    setUploadProgress(0)
    
    try {
      const response = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType: newFile.type,
          fileName: newFile.name
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get upload URL")
      }

      const { signedUrl, publicUrl, isR2Url } = await response.json()

      // Upload file with progress
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          setUploadProgress(progress)
        }
      }

      await new Promise((resolve, reject) => {
        xhr.open("PUT", signedUrl)
        xhr.setRequestHeader("Content-Type", newFile.type)
        xhr.onload = () => resolve(xhr.response)
        xhr.onerror = () => reject(new Error("Upload failed"))
        xhr.send(newFile)
      })

      return { publicUrl, isR2Url: isR2Url === true }
    } catch (error) {
      console.error("Error uploading file:", error)
      throw error
    } finally {
      setUploadingFile(false)
      setUploadProgress(0)
    }
  }

  const handleSave = async () => {
    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    if (!content) return

    setLoading(true)
    try {
      let uploadResult: { publicUrl: string; isR2Url: boolean } | null = null

      // Upload new file if one was selected
      if (newFile) {
        uploadResult = await uploadNewFile()
      }

      // Get current user for the revision
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("You must be logged in to suggest edits.")
        return
      }

      const resourceUrl = uploadResult ? uploadResult.publicUrl : content.resource_url
      const r2Url = uploadResult
        ? (uploadResult.isR2Url ? uploadResult.publicUrl : null)
        : (content.r2_url ?? null)

      // INSERT new revision row with prev_ptr to original (never UPDATE - creates revision chain)
      const insertData = {
        prev_ptr: content.id,
        course_id: content.course_id,
        title: title.trim(),
        year: parseInt(year as string),
        batch: batch.trim().toUpperCase(),
        semester_number: parseInt(semesterNumber as string),
        professor_id: selectedProfessorId,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : null,
        resource_url: resourceUrl,
        r2_url: r2Url,
        filetype: newFile ? (newFile.type || "") : (content.filetype || ""),
        visible: false, // Revision needs moderation; when approved, prev gets visible=false
        user_id: user.id,
        anon: content.anon ?? false,
      }

      const { error } = await supabase
        .from("course_contentnew")
        .insert(insertData)

      if (error) {
        throw error
      }

      alert("Your edit has been submitted for approval. It will appear once approved.")
      onSave()
      onClose()
    } catch (error) {
      console.error("Error submitting edit:", error)
      alert("Failed to submit edit. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-indigo-500" />
            Suggest Edit
          </DialogTitle>
          <DialogDescription>
            Your changes will create a new revision (pointing to this content). Once approved, this version will be replaced.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter content title"
              className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          {/* Year, Batch, Semester Row */}
          <div className="flex flex-row gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Year *
              </label>
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2022"
                className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Batch *
              </label>
              <Input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="IMT"
                className="border-2 border-indigo-200  dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Semester *
              </label>
              <Input
                type="number"
                value={semesterNumber}
                onChange={(e) => setSemesterNumber(e.target.value)}
                placeholder="6"
                className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          </div>

          {/* Professor */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Instructor
            </label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between border-2 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                >
                  {selectedProfessorName || "Select instructor..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search instructor..." 
                    value={selectedProfessorName}
                    onValueChange={setSelectedProfessorName}
                  />
                  <CommandList>
                    <CommandEmpty>No instructor found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setSelectedProfessorName("")
                          setSelectedProfessorId(null)
                          setOpenCombobox(false)
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", !selectedProfessorName ? "opacity-100" : "opacity-0")} />
                        No instructor
                      </CommandItem>
                      {professors
                        .filter(professor =>
                          professor.name?.toLowerCase().includes(selectedProfessorName.toLowerCase())
                        )
                        .map((professor) => (
                        <CommandItem
                          key={professor.id}
                          value={professor.name || ""}
                          onSelect={(currentValue) => {
                            setSelectedProfessorName(currentValue)
                            setSelectedProfessorId(professor.id)
                            setOpenCombobox(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedProfessorName === professor.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {professor.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full border transition-colors",
                    selectedTagIds.includes(tag.id)
                      ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                      : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Replace File (Optional)
            </label>
            <div className="space-y-3">
              
              <FileInput
                onChange={handleFileChange}
                disabled={uploadingFile || loading}
                className="w-full border-2 border-dashed border-indigo-200 dark:border-indigo-700 rounded-xl p-3 sm:p-4 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
              />
              
              {newFile && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300 truncate">
                        {newFile.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewFile(null)}
                      disabled={uploadingFile}
                      className="h-6 w-6 p-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {uploadingFile && (
                    <div className="mt-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                        Uploading... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {newFile && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                  <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <Upload className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Your revision (with new file) will be submitted for approval. Once approved, it will replace the current version.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                Please fix the following errors:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-2 border-zinc-200 dark:border-zinc-700 w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || uploadingFile}
            className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-400 dark:from-indigo-700 dark:via-fuchsia-700 dark:to-sky-700 text-white font-semibold shadow-lg hover:scale-[1.01] hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
          >
            {loading || uploadingFile ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadingFile ? "Uploading..." : "Submitting..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Submit Revision
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 