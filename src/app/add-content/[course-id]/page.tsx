"use client"

import { useState, useEffect, ChangeEvent, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileInput } from "@/components/ui/file-input"
import { Upload, FileText, Tag, X, AlertCircle, ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Progress } from "@/components/ui/progress"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Database } from "@/types/supabase"

type CourseContent = Database["public"]["Tables"]["course_content"]["Row"]
const MAX_FILE_SIZE = 30 * 1024 * 1024 // 10MB

export default function AddContentPage({
  params,
}: {
  params: Promise<{ "course-id": string }>
}) {
  const router = useRouter()
  const courseId = use(params)["course-id"]
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState<File[]>([])
  const [fileTitles, setFileTitles] = useState<{ [key: string]: string }>({})
  const [year, setYear] = useState<number | string>("")
  const [semester, setSemester] = useState("")
  const [instructor, setInstructor] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [existingContent, setExistingContent] = useState<CourseContent[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [showSizeWarning, setShowSizeWarning] = useState(false)
  const [oversizedFiles, setOversizedFiles] = useState<File[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showValidationError, setShowValidationError] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchExistingContent = async () => {
      const { data } = await supabase
        .from("course_content")
        .select("*")
        .eq("course_id", courseId)
      setExistingContent(data || [])
    }
    if (courseId) fetchExistingContent()
  }, [courseId, supabase])

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

          const { signedUrl, publicUrl } = await response.json()

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

          return {publicUrl, title: fileTitles[file.name]}
        })
      )

      // Insert into Supabase after successful upload
      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id

      const { error } = await supabase.from("course_content").insert(
        uploadedUrls.map((pair) => ({
          course_id: courseId,
          user_id: userId,
          instructor,
          year: parseInt(year as string),
          semester,
          resource_url: pair.publicUrl,
          tags,
          title: pair.title,
          visible: false,
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
  }

  const removeOversizedFiles = () => {
    setFiles(files.filter(file => !oversizedFiles.includes(file)))
    setShowSizeWarning(false)
    setOversizedFiles([])
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...newFiles])
    // Initialize titles for new files
    newFiles.forEach(file => {
      if (!fileTitles[file.name]) {
        setFileTitles(prev => ({
          ...prev,
          [file.name]: file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        }))
      }
    })
  }

  const validateStep1 = () => {
    const errors: string[] = []
    
    if (!instructor.trim()) {
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
    
    if (!semester.trim()) {
      errors.push("Batch and Semester information is required")
    } else {
      // Validate format: 20XXYYYY-ZZ (e.g., 2022IMT-VI)
      const semesterRegex = /^20\d{2}[A-Z]+-(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/
      if (!semesterRegex.test(semester.trim())) {
        errors.push("Batch and Semester must follow format: 20XXYYYY-ZZ (e.g., 2022IMT-VI) CASE SENSITIVE! (ONLY ONE BATCH, EVEN IF MULTIPLE BATCHES WERE OFFERED, PLEASE SELECT ONE)")
      }
    }
    
    return errors
  }

  const handleNextStep = () => {
    const errors = validateStep1()
    if (errors.length > 0) {
      setValidationErrors(errors)
      setShowValidationError(true)
      return
    }
    setStep(2)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-4 sm:p-6">
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
      <p>The following files exceed the 10MB size limit:</p>
      
      <ul className="list-disc pl-5 space-y-1">
        {oversizedFiles.map(file => (
          <li key={file.name} className="text-sm">
            {file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)
          </li>
        ))}
      </ul>
      
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        You can try compressing your PDF files using online tools or PDF software before uploading.
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
              onClick={() => router.push(`/course/${courseId}`)}
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
                        {content.year} - {content.semester} - {content.instructor}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(content.tags ?? []).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
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
                {step === 1 ? "Basic Information" : "Upload Files"}
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              </div>
            </div>
  
            <div className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-22rem)] md:h-[28rem] overflow-y-auto pr-2 sm:pr-4 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-700 scrollbar-track-transparent">
              {step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Instructor Name
                    </label>
                    <Input
                      placeholder="e.g., Dr. AK Srinivasulu"
                      value={instructor}
                      onChange={(e) => setInstructor(e.target.value)}
                      disabled={loading}
                      className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Year the course was conducted
                    </label>
                    <Input
                      placeholder="e.g., 2024"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      disabled={loading}
                      className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Batch and Semester course was offered to (only one batch pelase)
                    </label>
                    <Input
                      placeholder="e.g., 2022IMT-VI "
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      disabled={loading}
                      className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                      <Tag size={16} />
                      Tags
                    </label>
                    <Input
                      placeholder="Add tags separated by commas (class-notes)"
                      value={tags.join(", ")}
                      onChange={(e) => setTags(e.target.value.split(",").map(tag => tag.trim()))}
                      disabled={loading}
                      className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Files
                    </label>
                    <FileInput
                      multiple
                      onChange={handleFileChange}
                      disabled={loading}
                      className="w-full border-2 border-dashed border-indigo-200 dark:border-indigo-700 rounded-xl p-4 sm:p-6 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                    />
                    {files.length > 0 && (
                      <div className="mt-4 space-y-3">
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
                            <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                              <span className="truncate max-w-[200px]">{file.name}</span>
                              <span>{uploadProgress[file.name] ? `${Math.round(uploadProgress[file.name])}%` : "Ready"}</span>
                            </div>
                            <Progress value={uploadProgress[file.name] || 0} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
  
            <div className="mt-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              {step === 1 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-400 dark:from-indigo-700 dark:via-fuchsia-700 dark:to-sky-700 text-white font-semibold shadow-lg hover:scale-[1.01] hover:shadow-xl transition-all duration-200"
                >
                  Next Step
                </Button>
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
