"use client"

import { useState, useEffect, ChangeEvent, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileInput } from "@/components/ui/file-input"
import { Upload, FileText, Tag, X, AlertCircle, ArrowLeft, Check, ChevronsUpDown, ChevronDown, ChevronUp, Image as ImageIcon, Plus } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Progress } from "@/components/ui/progress"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Database } from "@/types/supabase"

type CourseContent = Database["public"]["Tables"]["course_contentnew"]["Row"]
//type CourseContentNew = Database["public"]["Tables"]["course_contentnew"]["Row"]
type Professor = Database["public"]["Tables"]["professorsnew"]["Row"]
type Tag = Database["public"]["Tables"]["tags"]["Row"]
//type CourseContentTag = Database["public"]["Tables"]["course_content_tags"]["Row"]
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 10MB

export default function AddContentPage({
  params,
}: {
  params: Promise<{ "course-id": string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = use(params)["course-id"]
  const [step, setStep] = useState(0)
  const [contentType, setContentType] = useState<'pdf' | 'images' | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [fileTitles, setFileTitles] = useState<{ [key: string]: string }>({})
  const [fileTagIds, setFileTagIds] = useState<{ [key: string]: number | null }>({})
  const [year, setYear] = useState<number | string>("")
  const [batch, setBatch] = useState("")
  const [semesterNumber, setSemesterNumber] = useState<number | string>("")
  const [selectedProfessorId, setSelectedProfessorId] = useState<number | null>(null)
  const [selectedProfessorName, setSelectedProfessorName] = useState("")
  const [professors, setProfessors] = useState<Professor[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [openCombobox, setOpenCombobox] = useState(false)
  const [showIndividualTags, setShowIndividualTags] = useState(false)
  const [existingContent, setExistingContent] = useState<CourseContent[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [showSizeWarning, setShowSizeWarning] = useState(false)
  const [oversizedFiles, setOversizedFiles] = useState<File[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showValidationError, setShowValidationError] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [creatingProfessor, setCreatingProfessor] = useState(false)
  const supabase = createClient()

  const normalizedProfessorInput = selectedProfessorName.trim()
  const filteredProfessors = professors.filter((professor) =>
    (professor.name ?? "").toLowerCase().includes(selectedProfessorName.toLowerCase())
  )
  const exactMatchProfessor = normalizedProfessorInput
    ? professors.find(
        (p) => (p.name ?? "").toLowerCase() === normalizedProfessorInput.toLowerCase()
      )
    : undefined
  const canCreateProfessor = normalizedProfessorInput.length > 0 && !exactMatchProfessor

  useEffect(() => {
    const fetchData = async () => {
      // Fetch existing content
      const { data: contentData } = await supabase
        .from("course_contentnew")
        .select("*")
        .eq("course_id", courseId)
      setExistingContent(contentData || [])

      // Fetch professors for autocomplete
      const { data: professorsData } = await supabase
        .from("professorsnew")
        .select("*")
        .order("name")
      setProfessors(professorsData || [])

      // Fetch tags for selection
      const { data: tagsData } = await supabase
        .from("tags")
        .select("*")
        .order("name")
      setTags(tagsData || [])
    }
    if (courseId) fetchData()
  }, [courseId, supabase])

  // Handle query parameters for default values
  useEffect(() => {
    // Set default values from query parameters
    const professorID = searchParams.get('professor_id')
    const yearParam = searchParams.get('year')
    const batchParam = searchParams.get('batch')
    const semesterParam = searchParams.get('semester')

    if (professorID) {
      const professorId = parseInt(professorID)
      if (!isNaN(professorId)) {
        setSelectedProfessorId(professorId)
        
        // Find the professor name if professors are already loaded
        if (professors.length > 0) {
          const foundProfessor = professors.find(p => p.id === professorId)
          if (foundProfessor) {
            setSelectedProfessorName(foundProfessor.name || '')
          }
        }
      }
    }
    
    if (yearParam) {
      setYear(yearParam)
    }
    
    if (batchParam) {
      setBatch(decodeURIComponent(batchParam))
    }
    
    if (semesterParam) {
      setSemesterNumber(semesterParam)
    }
  }, [searchParams, professors])

  const createProfessorIfMissing = async () => {
    const nameToCreate = normalizedProfessorInput
    if (!nameToCreate) return

    // If it already exists (case-insensitive), just select it.
    if (exactMatchProfessor) {
      setSelectedProfessorId(exactMatchProfessor.id)
      setSelectedProfessorName(exactMatchProfessor.name ?? nameToCreate)
      setOpenCombobox(false)
      return
    }

    setCreatingProfessor(true)
    try {
      const { data: created, error } = await supabase
        .from("professorsnew")
        .insert({
          name: nameToCreate,
          // Simple dummy values (optional columns)
          department: "Unknown",
          designation: "Unknown",
          email: null,
          phone: null,
          address: null,
          research_interests: null,
        })
        .select("*")
        .single()

      if (error) throw error

      setProfessors((prev) => {
        const next = [created, ...prev]
        next.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        return next
      })
      setSelectedProfessorId(created.id)
      setSelectedProfessorName(created.name ?? nameToCreate)
      setOpenCombobox(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create instructor")
    } finally {
      setCreatingProfessor(false)
    }
  }

  // Check if all files have the same tag
  const getAllFilesTagStatus = () => {
    if (files.length === 0) return null;
    
    const firstFileTag = fileTagIds[files[0].name];
    const allSameTag = files.every(file => fileTagIds[file.name] === firstFileTag);
    
    return allSameTag ? firstFileTag : 'mixed';
  }

  const validateStep2 = () => {
    const errors: string[] = []
    
    if (files.length === 0) {
      errors.push("Please select at least one file to upload")
      return errors
    }
    
    // Check if all files have titles
    const filesWithoutTitles = files.filter(file => !fileTitles[file.name]?.trim())
    if (filesWithoutTitles.length > 0) {
      errors.push("Please provide titles for all files")
    }
    
    return errors
  }

  const handleUpload = async () => {
    const validationErrors = validateStep2()
    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors)
      setShowValidationError(true)
      return
    }

    const oversized = files.filter(file => file.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      setOversizedFiles(oversized)
      setShowSizeWarning(true)
      return
    }

    setLoading(true)
    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
          
          // (File size check moved to handleUpload entry, not here)

          const response = await fetch("/api/get-upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
            }),
          })

          if (!response.ok) {
            throw new Error("Failed to get upload URL")
          }

          const { signedUrl, publicUrl, isR2Url } = await response.json()

          const xhr = new XMLHttpRequest()
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              console.log("event.loaded", event.loaded)
              const progress = (event.loaded / event.total) * 100
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }))
            }
          }

          await new Promise((resolve, reject) => {
            xhr.open("PUT", signedUrl)
            xhr.setRequestHeader("Content-Type", file.type)
            xhr.onload = () => resolve(xhr.response)
            xhr.onerror = () => reject(new Error("Upload failed"))
            xhr.send(file)
          })
          console.log({publicUrl, title: fileTitles[file.name]})

          return { publicUrl, title: fileTitles[file.name], fileName: file.name, fileType: file.type, isR2Url: isR2Url === true }
        })
      )

      // Insert into Supabase after successful upload
      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id

      const { error } = await supabase.from("course_contentnew").insert(
        uploadedUrls.map((pair) => ({
          course_id: courseId,
          filetype: pair.fileType,
          user_id: userId,
          professor_id: selectedProfessorId,
          year: parseInt(year as string),
          batch: batch.toUpperCase(),
          semester_number: parseInt(semesterNumber as string),
          resource_url: pair.publicUrl,
          r2_url: pair.isR2Url ? pair.publicUrl : null,
          tag_ids: fileTagIds[pair.fileName] ? [fileTagIds[pair.fileName]] : null,
          title: pair.title,
          visible: false,
          anon: isAnonymous,
        }))
      )
      uploadedUrls.forEach(pair => {
        console.log("pair", pair)
      })
      if (error) {
        throw new Error("Failed to save content metadata")
      }
      router.push(`/course/${courseId}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error uploading content")
    } finally {
      setLoading(false)
      setUploadProgress({})
    }
  }
  
  const removeFile = (fileName: string) => {
    setFiles(files.filter(file => file.name !== fileName))
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[fileName]
      return newProgress
    })
    setFileTitles(prev => {
      const newTitles = { ...prev }
      delete newTitles[fileName]
      return newTitles
    })
    setFileTagIds(prev => {
      const newTagIds = { ...prev }
      delete newTagIds[fileName]
      return newTagIds
    })
  }

  const removeOversizedFiles = () => {
    setFiles(files.filter(file => !oversizedFiles.includes(file)))
    setShowSizeWarning(false)
    setOversizedFiles([])
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...newFiles])
    // Initialize titles and tag selections for new files
    newFiles.forEach(file => {
      if (!fileTitles[file.name]) {
        setFileTitles(prev => ({
          ...prev,
          [file.name]: file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        }))
      }
      if (!fileTagIds[file.name]) {
        setFileTagIds(prev => ({
          ...prev,
          [file.name]: null
        }))
      }
    })
  }

  const validateStep1 = () => {
    const errors: string[] = []
    
    if (!selectedProfessorName.trim()) {
      errors.push("Instructor name is required")
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

  const handleContentTypeSelect = (type: 'pdf' | 'images') => {
    setContentType(type)
    setStep(1)
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    // Filter to only image files
    const imageFiles = newFiles.filter(file => file.type.startsWith('image/'))
    setImageFiles(prev => [...prev, ...imageFiles])
  }

  const removeImage = (fileName: string) => {
    setImageFiles(imageFiles.filter(file => file.name !== fileName))
  }

  const handleImageUpload = async () => {
    if (imageFiles.length === 0) {
      setValidationErrors(["Please select at least one image to upload"])
      setShowValidationError(true)
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      imageFiles.forEach((file) => {
        formData.append('images', file)
      })
      formData.append('courseId', courseId)
      formData.append('professorId', selectedProfessorId?.toString() || '')
      formData.append('year', year.toString())
      formData.append('batch', batch)
      formData.append('semesterNumber', semesterNumber.toString())
      formData.append('isAnonymous', isAnonymous.toString())

      const response = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload images')
      }

      router.push(`/course/${courseId}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error uploading images")
    } finally {
      setLoading(false)
    }
  }

  const handleNextStep = () => {
    const errors = validateStep1()
    if (errors.length > 0) {
      setValidationErrors(errors)
      setShowValidationError(true)
      return
    }
    if (contentType === 'pdf') {
      setStep(2)
    } else if (contentType === 'images') {
      // For images, we can upload directly after step 1
      handleImageUpload()
    }
  }
  //bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500

  return (
    <div className="min-h-screen flex items-center justify-center dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/60 transition-colors duration-500  p-4 sm:p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <AlertDialog open={showSizeWarning} onOpenChange={setShowSizeWarning}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <AlertCircle className="h-5 w-5" />
        File Size Limit Exceeded
      </AlertDialogTitle>
      {/* Replace the AlertDialogDescription with a div */}
    </AlertDialogHeader>
    
    {/* Move content outside of AlertDialogDescription */}
    <div className="space-y-4 py-2">
      <p>The following files exceed the 100MB size limit:</p>
      
      <ul className="list-disc pl-5 space-y-1">
        {oversizedFiles.map(file => (
          <li key={file.name} className="text-sm">
            {file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)
          </li>
        ))}
      </ul>
      
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        You can try compressing your files using appropriate tools before uploading.
      </p>
    </div>
    
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setShowSizeWarning(false)}>
        Cancel
      </AlertDialogCancel>
      <AlertDialogAction onClick={removeOversizedFiles} className="bg-red-600 hover:bg-red-700">
        Remove Oversized Files
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

      <AlertDialog open={showValidationError} onOpenChange={setShowValidationError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Required Fields Missing
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-2">
            <p>Please fill in the following required fields:</p>
            
            <ul className="list-disc pl-5 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </li>
              ))}
            </ul>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowValidationError(false)} className="bg-indigo-600 hover:bg-indigo-700">
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="w-full max-w-7xl bg-white/80 dark:bg-zinc-900/80 shadow-2xl rounded-3xl p-4 sm:p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg my-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                console.log("PUSHING TO COURSE", courseId)
                const str = "30"
                console.log(`/course/${courseId}`)

                console.log(`/course/${str}`)

                router.push(`/course/${courseId}`)
              
              
              
              
              }}
              variant="outline"
              size="sm"
              className="border-2 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Button>
            <Upload className="text-indigo-500 dark:text-indigo-300 h-6 w-6 sm:h-8 sm:w-8" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
              Add Course Content
            </h1>
          </div>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column - Existing Content */}
          <div className="hidden lg:flex flex-col">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-3 sm:mb-4 flex items-center gap-2">
              <FileText className="text-indigo-500" size={20} />
              Existing Content
            </h2>
            <div className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-22rem)] md:h-[28rem] overflow-y-auto pr-2 sm:pr-4 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-700 scrollbar-track-transparent">
              {existingContent.length > 0 ? (
                <div className="grid gap-4">
                  {existingContent.map((content) => (
                    <div
                      key={content.id}
                      className="p-3 sm:p-4 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all"
                    >
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {content.title || 'Untitled Content'}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {content.year} - {content.batch} - Semester {content.semester_number}
                        {content.professor_id && (
                          <span> - {professors.find(p => p.id === content.professor_id)?.name || 'Unknown Professor'}</span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(content.tag_ids ?? []).map((tagId: number) => {
                          const tag = tags.find(t => t.id === tagId);
                          return tag ? (
                            <span
                              key={tagId}
                              className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
                            >
                              {tag.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                      <a
                        href={content.resource_url ?? ''}
                        target="_blank"
                        className="mt-2 inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                      >
                        <FileText size={16} className="mr-1" />
                        Download Resource
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-zinc-500 dark:text-zinc-400 italic text-center px-4">
                    No content uploaded yet. Be the first!
                  </p>
                </div>
              )}
            </div>
          </div>
  
          {/* Right Column - Upload Form */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Upload className="text-indigo-500" size={20} />
                {step === 0 ? "Select Content Type" : step === 1 ? "Basic Information" : "Upload Files"}
              </h2>
            <div className="flex items-center gap-2">
                {contentType === 'pdf' ? (
                  <>
                    <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                    <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                  </>
                ) : contentType === 'images' ? (
                  <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                ) : null}
              </div>
            </div>
  
            <div className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-22rem)] md:h-[28rem] overflow-y-auto pr-2 sm:pr-4 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-700 scrollbar-track-transparent">
              {step === 0 ? (
                <div className="space-y-6 flex flex-col items-center justify-center h-full">
                  <p className="text-zinc-600 dark:text-zinc-400 text-center mb-4">
                    Choose the type of content you want to add
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
                    <Button
                      onClick={() => handleContentTypeSelect('pdf')}
                      disabled={loading}
                      className="flex-1 h-24 sm:h-32 bg-indigo-100 dark:bg-zinc-800 hover:bg-indigo-200 dark:hover:bg-zinc-700 text-indigo-700 dark:text-zinc-200 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center gap-2"
                    >
                      <FileText size={32} />
                      <span>Upload Documents</span>
                    </Button>
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">or</span>
                    <Button
                      onClick={() => handleContentTypeSelect('images')}
                      disabled={loading}
                      className="flex-1 h-24 sm:h-32 bg-indigo-100 dark:bg-zinc-800 hover:bg-indigo-200 dark:hover:bg-zinc-700 text-indigo-700 dark:text-zinc-200 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center gap-2"
                    >
                      <ImageIcon size={32} />
                      <span>Add Images</span>
                    </Button>
                  </div>
                </div>
              ) : step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Instructor Name
                    </label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className="w-full justify-between border-2 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                          disabled={loading}
                        >
                          {selectedProfessorName || "Select instructor..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search instructor..." 
                            value={selectedProfessorName}
                            onValueChange={setSelectedProfessorName}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {canCreateProfessor ? (
                                <span className="text-sm">
                                  No instructor found. Create{" "}
                                  <span className="font-medium">"{normalizedProfessorInput}"</span>.
                                </span>
                              ) : (
                                "No instructor found."
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {canCreateProfessor && (
                                <CommandItem
                                  key="__create_professor__"
                                  value={`Create ${normalizedProfessorInput}`}
                                  onSelect={() => {
                                    if (!creatingProfessor && !loading) createProfessorIfMissing()
                                  }}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create "{normalizedProfessorInput}"
                                </CommandItem>
                              )}

                              {filteredProfessors.map((professor) => (
                                <CommandItem
                                  key={professor.id}
                                  value={professor.name || ""}
                                  onSelect={(currentValue) => {
                                    setSelectedProfessorName(professor.name || currentValue);
                                    setSelectedProfessorId(professor.id);
                                    setOpenCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      (selectedProfessorName ?? "").toLowerCase() === (professor.name ?? "").toLowerCase()
                                        ? "opacity-100"
                                        : "opacity-0"
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
  
                                    <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Batch Year (when the batch was admitted)
                    </label>
                    <Input
                      placeholder="e.g., 2022 (for 2022IMT batch)"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      disabled={loading}
                      className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Batch Name/Type (program abbreviation)
                    </label>
                    <Input
                      placeholder="e.g., IMT (for 2022IMT batch)"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      disabled={loading}
                      className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Semester Number (which semester of their course)
                    </label>
                    <Input
                      placeholder="e.g., 6 (for 6th semester)"
                      type="number"
                      value={semesterNumber}
                      onChange={(e) => setSemesterNumber(e.target.value)}
                      disabled={loading}
                      className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="anonymous-toggle"
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      disabled={loading}
                    />
                    <label htmlFor="anonymous-toggle" className="text-sm text-zinc-600 dark:text-zinc-300">
                      Post anonymously
                    </label>
                  </div>
                  
                  {contentType === 'images' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Images
                      </label>
                      <FileInput
                        multiple
                        onChange={handleImageChange}
                        disabled={loading}
                        accept="image/*"
                        className="w-full border-2 border-dashed border-indigo-200 dark:border-indigo-700 rounded-xl p-4 sm:p-6 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                      />
                      {imageFiles.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {imageFiles.map((file) => (
                            <div
                              key={file.name}
                              className="flex items-center justify-between p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <ImageIcon size={20} className="text-indigo-500 flex-shrink-0" />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                </span>
                              </div>
                              <button
                                onClick={() => removeImage(file.name)}
                                disabled={loading}
                                className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                                title="Remove image"
                              >
                                <X size={16} className="text-zinc-500 dark:text-zinc-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : step === 2 && contentType === 'pdf' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Files
                    </label>
                    <FileInput
                      multiple
                      onChange={handleFileChange}
                      disabled={loading}
                      accept=".pdf,.ipynb,.pptx,.docx,.xlsx,application/pdf,application/x-ipynb+json,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="w-full border-2 border-dashed border-indigo-200 dark:border-indigo-700 rounded-xl p-4 sm:p-6 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                    />
                    {files.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {/* Tag All Files Section */}
                        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Tag All Files:
                            </label>
                            <button
                              onClick={() => setShowIndividualTags(!showIndividualTags)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                            >
                              {showIndividualTags ? (
                                <>
                                  <ChevronUp size={12} />
                                  Hide Individual
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={12} />
                                  Show Individual
                                </>
                              )}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => {
                                setFileTagIds(prev => {
                                  const newTagIds = { ...prev };
                                  files.forEach(file => {
                                    newTagIds[file.name] = null;
                                  });
                                  return newTagIds;
                                });
                              }}
                              className={cn(
                                "px-2 py-1 text-xs rounded border transition-colors",
                                getAllFilesTagStatus() === null
                                  ? "border-indigo-300 dark:border-indigo-700 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                                  : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                              )}
                            >
                              None
                            </button>
                            {tags.map((tag) => (
                              <button
                                key={tag.id}
                                onClick={() => {
                                  setFileTagIds(prev => {
                                    const newTagIds = { ...prev };
                                    files.forEach(file => {
                                      newTagIds[file.name] = tag.id;
                                    });
                                    return newTagIds;
                                  });
                                }}
                                className={cn(
                                  "px-2 py-1 text-xs rounded border transition-colors",
                                  getAllFilesTagStatus() === tag.id
                                    ? "border-indigo-300 dark:border-indigo-700 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                                    : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                                )}
                              >
                                {tag.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Individual Files */}
                        <div className="space-y-3">
                          {files.map((file) => (
                          <div 
                            key={file.name} 
                            className="group flex flex-col gap-2 bg-white/50 dark:bg-zinc-800/50 rounded-xl px-3 py-2 sm:px-4 sm:py-3 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <Input
                                value={fileTitles[file.name] || ''}
                                onChange={(e) => {setFileTitles(prev => ({ ...prev, [file.name]: e.target.value }))
                                console.log("fileTitles", fileTitles)
                              }}
                                placeholder="Enter file title"
                                disabled={loading}
                                className="flex-1 mr-2 border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
                              />
                              <button
                                onClick={() => removeFile(file.name)}
                                disabled={loading}
                                className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove file"
                              >
                                <X size={16} className="text-zinc-500 dark:text-zinc-400" />
                              </button>
                            </div>
                            
                            {/* Tag selection for this file - collapsible */}
                            {showIndividualTags && (
                              <div className="mt-2">
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                  Tag (optional)
                                </label>
                                <div className="flex flex-wrap gap-1">
                                  <button
                                    onClick={() => setFileTagIds(prev => ({ ...prev, [file.name]: null }))}
                                    className={cn(
                                      "px-2 py-1 text-xs rounded-md border",
                                      !fileTagIds[file.name]
                                        ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                    )}
                                  >
                                    None
                                  </button>
                                  {tags.map((tag) => (
                                    <button
                                      key={tag.id}
                                      onClick={() => setFileTagIds(prev => ({ ...prev, [file.name]: tag.id }))}
                                      className={cn(
                                        "px-2 py-1 text-xs rounded-md border",
                                        fileTagIds[file.name] === tag.id
                                          ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                                          : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                      )}
                                    >
                                      {tag.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                              <span className="truncate max-w-[200px]">{file.name}</span>
                              <span>{uploadProgress[file.name] ? `${Math.round(uploadProgress[file.name])}%` : "Ready"}</span>
                            </div>
                            <Progress value={uploadProgress[file.name] || 0} className="h-1.5" />
                          </div>
                        ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
  
            <div className="mt-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              {step === 0 ? null : step === 1 ? (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    onClick={() => {
                      setStep(0)
                      setContentType(null)
                    }}
                    disabled={loading}
                    variant="outline"
                    className="sm:flex-1 border-2 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={loading}
                    className="sm:flex-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-400 dark:from-indigo-700 dark:via-fuchsia-700 dark:to-sky-700 text-white font-semibold shadow-lg hover:scale-[1.01] hover:shadow-xl transition-all duration-200"
                  >
                    {contentType === 'images' ? (
                      loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Upload size={18} />
                          <span>Upload Images</span>
                        </div>
                      )
                    ) : (
                      "Next Step"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    onClick={() => setStep(1)}
                    disabled={loading}
                    variant="outline"
                    className="sm:flex-1 border-2 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={loading || files.length === 0}
                    className="sm:flex-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-400 dark:from-indigo-700 dark:via-fuchsia-700 dark:to-sky-700 text-white font-semibold shadow-lg hover:scale-[1.01] hover:shadow-xl transition-all duration-200"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Upload size={18} />
                        <span>Upload Content</span>
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
